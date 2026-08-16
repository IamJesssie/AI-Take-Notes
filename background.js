// background.js — AI-Take-Notes Service Worker
// Routes messages between: sidepanel ↔ offscreen engine ↔ content overlay
console.log('[BG] ===== Service worker loaded =====');

// ── State ────────────────────────────────────────────────
let pendingStreamId = null;
let capturedTabId = null;
let capturedTabTitle = null;
let captureActive = false;
let overlayTabId = null;

// Restore state on SW restart
chrome.storage.session.get(
  ['pendingStreamId', 'capturedTabId', 'capturedTabTitle', 'captureActive'],
  (s) => {
    pendingStreamId = s.pendingStreamId || null;
    capturedTabId = s.capturedTabId || null;
    capturedTabTitle = s.capturedTabTitle || null;
    captureActive = s.captureActive || false;
    console.log('[BG] Restored state. streamId:', !!pendingStreamId, 'active:', captureActive);
  }
);

function persistCaptureState() {
  chrome.storage.session.set({ pendingStreamId, capturedTabId, capturedTabTitle, captureActive });
}

function clearCaptureState() {
  pendingStreamId = null;
  capturedTabId = null;
  capturedTabTitle = null;
  captureActive = false;
  persistCaptureState();
}

// MUST be false so action.onClicked fires (needed for activeTab + tabCapture)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  .then(() => console.log('[BG] Panel auto-open DISABLED'))
  .catch(err => console.error('[BG] setPanelBehavior failed:', err));

// ── Capture flow: shared between icon click and Alt+S shortcut ───────
// getMediaStreamId() must run before any other user-gesture-only API
// (like sidePanel.open) is awaited, otherwise the gesture context is
// consumed and capture silently fails on many Chrome builds.
//
// CRITICAL: The streamId returned by getMediaStreamId() expires in a few
// seconds if not consumed. So as soon as we have one, we spin up the
// offscreen document and have it call getUserMedia() to claim the stream.
// The actual session start (which involves slow auth/upload steps in the
// sidepanel) can then happen against the already-parked MediaStream.

// Dedupe rapid CAPTURE_FAILED broadcasts so spamming the icon doesn't
// pile up identical messages in the side panel.
let lastCaptureFailedAt = 0;
let lastCaptureFailedMsg = '';
const CAPTURE_FAILED_DEDUPE_MS = 1500;

function isUncapturableUrl(url) {
  if (!url) return true;
  return url.startsWith('chrome://')
      || url.startsWith('chrome-extension://')
      || url.startsWith('edge://')
      || url.startsWith('about:')
      || url.startsWith('file://')
      || url.startsWith('view-source:')
      || url.startsWith('devtools://')
      || url.startsWith('https://chromewebstore.google.com/')
      || url.startsWith('https://chrome.google.com/webstore');
}

async function startCaptureFlow(tab) {
  console.log('[BG] startCaptureFlow on tab:', tab.id, tab.url);

  const isCapturable = tab.url && !isUncapturableUrl(tab.url);
  let captureError = null;

  if (!isCapturable) {
    captureError = 'AI-Take-Notes can\u2019t capture this page. Open your meeting (or test audio) in a regular browser tab and try again.';
  }

  // Short-circuit: if we already have a parked stream for THIS tab, don't
  // re-capture. Chrome will reject getMediaStreamId() with "active stream"
  // since the offscreen doc still holds the previous MediaStream. Just
  // re-open the panel and re-announce so the Ready state shows again.
  if (isCapturable && pendingStreamId && capturedTabId === tab.id) {
    console.log('[BG] Stream already parked for this tab — skipping re-capture');
    chrome.sidePanel.open({ windowId: tab.windowId })
      .catch(err => console.warn('[BG] sidePanel.open failed:', err.message));
    // Re-announce so a freshly-opened panel picks up the Ready state.
    // Use a single send (no retry loop) since the panel is either mounted
    // already, or _reconcilePendingCapture will pick it up on mount.
    chrome.runtime.sendMessage(
      { type: 'TAB_CAPTURED', tabTitle: capturedTabTitle },
      () => { void chrome.runtime.lastError; }
    );
    return;
  }

  // If we have a stale stream for a DIFFERENT tab, drop it first so the
  // new tab can be captured. The offscreen doc will release its MediaStream
  // on ENGINE_STOP.
  if (isCapturable && pendingStreamId && capturedTabId !== tab.id) {
    console.log('[BG] Stream parked for a different tab — releasing before re-capture');
    chrome.runtime.sendMessage({ type: 'ENGINE_STOP', target: 'offscreen' }).catch(() => {});
    clearCaptureState();
  }

  // 1. Capture FIRST — synchronously start the call before anything else awaits.
  let capturePromise = Promise.resolve();
  if (!captureActive && isCapturable) {
    capturePromise = chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id })
      .then(async id => {
        if (!id) throw new Error('Capture returned no stream id');
        pendingStreamId = id;
        capturedTabId = tab.id;
        capturedTabTitle = tab.title || tab.url;
        persistCaptureState();
        console.log('[BG] Stream ID captured for tab', tab.id, '— claiming in offscreen immediately');

        // Park the stream in the offscreen doc IMMEDIATELY before the
        // streamId expires. This is what the engine will eventually use.
        try {
          await ensureOffscreenDocument();
          await waitForOffscreenReady();
          const claimResp = await new Promise((resolve) => {
            chrome.runtime.sendMessage(
              { type: 'CLAIM_STREAM', target: 'offscreen', streamId: id },
              (resp) => {
                if (chrome.runtime.lastError) {
                  resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                  resolve(resp || { ok: false, error: 'No response from offscreen' });
                }
              }
            );
          });
          if (!claimResp.ok) {
            throw new Error(claimResp.error || 'Offscreen failed to claim stream');
          }
          console.log('[BG] Stream claimed in offscreen — streamId burned, MediaStream parked');
        } catch (err) {
          console.warn('[BG] Failed to claim stream:', err.message);
          // Wipe state so the user can retry cleanly
          clearCaptureState();
          throw err;
        }
      })
      .catch(err => {
        console.warn('[BG] tabCapture failed:', err.message);
        captureError = 'Tab capture failed: ' + err.message + '. Try reloading the tab and trying again.';
      });
  } else if (captureActive) {
    console.log('[BG] Session active on tab', capturedTabId, '- panel only');
  }

  // 2. Open the side panel (this can run while capture is pending).
  const panelPromise = chrome.sidePanel.open({ windowId: tab.windowId })
    .then(() => console.log('[BG] Side panel opened'))
    .catch(err => console.warn('[BG] sidePanel.open failed:', err.message));

  await Promise.all([capturePromise, panelPromise]);

  // 3. Announce result. Retry — the sidepanel may still be loading.
  const announce = (msg) => {
    let tries = 0;
    const send = () => {
      chrome.runtime.sendMessage(msg, () => {
        const err = chrome.runtime.lastError;
        if (err && tries++ < 10) setTimeout(send, 150);
      });
    };
    send();
  };

  if (pendingStreamId && !captureError) {
    announce({ type: 'TAB_CAPTURED', tabTitle: capturedTabTitle });
  } else if (captureError) {
    const now = Date.now();
    if (captureError === lastCaptureFailedMsg && (now - lastCaptureFailedAt) < CAPTURE_FAILED_DEDUPE_MS) {
      console.log('[BG] Suppressing duplicate CAPTURE_FAILED within dedupe window');
      return;
    }
    lastCaptureFailedMsg = captureError;
    lastCaptureFailedAt = now;
    announce({ type: 'CAPTURE_FAILED', error: captureError });
  }
}

chrome.action.onClicked.addListener((tab) => {
  console.log('[BG] Icon clicked.');
  // Call synchronously — do NOT await here; the gesture is only preserved
  // while we remain in the listener's synchronous execution path.
  startCaptureFlow(tab);
});

// ── Keyboard Shortcut Commands ────────────────────────────
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'toggle-pause') {
    // Relay to sidepanel — it owns the pause state and UI
    chrome.runtime.sendMessage({ type: 'TOGGLE_PAUSE_SHORTCUT' }, () => {
      void chrome.runtime.lastError;
    });
  } else if (command === 'start-session') {
    // Keyboard shortcuts satisfy the user-gesture requirement for tabCapture.
    // `tab` is the active tab when the shortcut fires.
    if (tab) {
      startCaptureFlow(tab);
    } else {
      // Fallback for Chrome versions that don't pass the tab arg.
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) startCaptureFlow(tabs[0]);
      });
    }
  }
});

// ── Offscreen Document Management ────────────────────────
async function ensureOffscreenDocument() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (existingContexts.length > 0) return;

  console.log('[BG] Creating offscreen doc...');
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['USER_MEDIA'],
    justification: 'Audio capture and processing for real-time transcription'
  });
  console.log('[BG] Offscreen doc created');
}

// Ping offscreen until it responds, confirming scripts are loaded
function waitForOffscreenReady(maxWait = 5000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function ping() {
      if (Date.now() - start > maxWait) {
        reject(new Error('Offscreen document failed to become ready'));
        return;
      }
      chrome.runtime.sendMessage({ type: 'OFFSCREEN_PING', target: 'offscreen' }, (resp) => {
        if (chrome.runtime.lastError || !resp?.ready) {
          setTimeout(ping, 100);
        } else {
          resolve();
        }
      });
    }
    ping();
  });
}

// ── Content Overlay Management ───────────────────────────
async function injectOverlay(tabId) {
  try {
    await removeOverlay();

    await chrome.scripting.insertCSS({
      target: { tabId },
      files: ['content-overlay.css']
    });

    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-overlay.js']
    });

    overlayTabId = tabId;
    chrome.tabs.onRemoved.addListener(onOverlayTabRemoved);
    chrome.tabs.onUpdated.addListener(onOverlayTabUpdated);

    console.log('[BG] Overlay injected into tab', tabId);
    return true;
  } catch (e) {
    console.warn('[BG] Cannot inject overlay:', e.message);
    return false;
  }
}

async function removeOverlay() {
  if (overlayTabId !== null) {
    try {
      await chrome.tabs.sendMessage(overlayTabId, { type: 'REMOVE_OVERLAY' });
    } catch (e) { /* tab may be gone */ }
    cleanupOverlayListeners();
    overlayTabId = null;
  }
}

function cleanupOverlayListeners() {
  chrome.tabs.onRemoved.removeListener(onOverlayTabRemoved);
  chrome.tabs.onUpdated.removeListener(onOverlayTabUpdated);
}

function onOverlayTabRemoved(tabId) {
  if (tabId === overlayTabId) {
    overlayTabId = null;
    cleanupOverlayListeners();
    broadcastToRuntime({ type: 'OVERLAY_CLOSED' });
  }
}

function onOverlayTabUpdated(tabId, changeInfo) {
  if (tabId === overlayTabId && changeInfo.status === 'loading') {
    overlayTabId = null;
    cleanupOverlayListeners();
    broadcastToRuntime({ type: 'OVERLAY_CLOSED' });
  }
}

function sendToOverlay(msg) {
  if (overlayTabId !== null) {
    chrome.tabs.sendMessage(overlayTabId, msg).catch(() => {});
  }
}

// ── Broadcast Helpers ────────────────────────────────────
// Send to sidepanel (and any other extension pages)
function broadcastToRuntime(msg) {
  chrome.runtime.sendMessage(msg, () => {
    void chrome.runtime.lastError; // Expected: no listener may be ready yet
  });
}

// Send to both sidepanel AND overlay
function broadcastToAll(msg) {
  broadcastToRuntime(msg);
  sendToOverlay(msg);
}

// ── Message Router ───────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  let async = false;
  switch (message.type) {

    // ── From sidepanel: session control ──
    case 'START_SESSION': {
      (async () => {
        if (!pendingStreamId) {
          sendResponse({ success: false, error: 'No tab audio captured. Click the AI-Take-Notes icon on your meeting tab to start.' });
          return;
        }
        try {
          await ensureOffscreenDocument();
          await waitForOffscreenReady();

          // Forward to offscreen engine with all needed config
          chrome.runtime.sendMessage({
            type: 'ENGINE_START',
            target: 'offscreen',
            streamId: pendingStreamId,
            settings: message.settings,
            userContext: message.userContext,
            geminiFileUris: message.geminiFileUris || [],
            authToken: message.authToken,
          });

          captureActive = true;
          persistCaptureState();
          sendResponse({ success: true, capturedTabTitle });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();
      async = true;
      break;
    }

    case 'STOP_SESSION':
      chrome.runtime.sendMessage({ type: 'ENGINE_STOP', target: 'offscreen' }).catch(() => {});
      clearCaptureState();
      sendResponse({ success: true });
      break;

    case 'PAUSE_SESSION':
      chrome.runtime.sendMessage({ type: 'ENGINE_PAUSE', target: 'offscreen' }).catch(() => {});
      break;

    case 'RESUME_SESSION':
      chrome.runtime.sendMessage({ type: 'ENGINE_RESUME', target: 'offscreen' }).catch(() => {});
      break;

    case 'UPDATE_ENGINE_SETTINGS':
      chrome.runtime.sendMessage({ type: 'ENGINE_UPDATE_SETTINGS', target: 'offscreen', settings: message.settings }).catch(() => {});
      break;

    case 'UPDATE_ENGINE_CONTEXT':
      chrome.runtime.sendMessage({ type: 'ENGINE_UPDATE_CONTEXT', target: 'offscreen', userContext: message.userContext }).catch(() => {});
      break;

    case 'GET_ENGINE_STATE':
      // Forward to offscreen and relay response
      chrome.runtime.sendMessage({ type: 'ENGINE_GET_STATE', target: 'offscreen' }, (state) => {
        sendResponse(state);
      });
      async = true;
      break;

    // ── From sidepanel: info queries ──
    case 'TRIGGER_CAPTURE_ACTIVE_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          startCaptureFlow(tabs[0]);
          sendResponse({ success: true, tabTitle: tabs[0].title });
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
      async = true;
      break;

    case 'GET_CAPTURE_INFO':
      sendResponse({
        hasPendingCapture: !!pendingStreamId,
        capturedTabId,
        capturedTabTitle,
        captureActive
      });
      break;

    case 'GET_SETTINGS':
      chrome.storage.local.get([
        'sttProvider', 'deepgramApiKey', 'openrouterApiKey', 'openrouterModel',
        'geminiApiKey', 'geminiModel', 'supabaseUrl', 'supabaseAnonKey',
        'userContext', 'theme', 'speakerLabel', 'showTranscript',
        'mergeLines', 'autoDismiss', 'bulletMode', 'cueDelay', 'responseStyle',
        'responseLength', 'questionsOnly', 'sendTranscript',
        'webGrounding', 'skeletonLoading', 'sttLanguage'
      ], (settings) => sendResponse(settings));
      async = true;
      break;

    case 'SAVE_SETTINGS':
      chrome.storage.local.set(message.settings, () => {
        sendResponse({ success: true });
        broadcastToRuntime({ type: 'SETTINGS_UPDATED', settings: message.settings });
      });
      async = true;
    // ── From in-page content script: captions with real speaker names ──
    case 'INPAGE_CAPTION':
      chrome.runtime.sendMessage({
        type: 'ENGINE_TRANSCRIPT',
        target: 'offscreen',
        speaker: message.speaker || 'interviewer',
        text: message.text,
        provider: 'inpage'
      }).catch(() => {});
      broadcastToRuntime({
        type: 'ENGINE_TRANSCRIPT',
        speaker: message.speaker || 'interviewer',
        text: message.text,
        provider: 'inpage'
      });
      break;

    // ── From offscreen engine: relay to sidepanel + overlay ──
    case 'ENGINE_STATUS':
    case 'ENGINE_TRANSCRIPT':
    case 'ENGINE_INTERIM':
    case 'ENGINE_CUE_START':
    case 'ENGINE_CUE_CHUNK':
    case 'ENGINE_CUE_DONE':
    case 'ENGINE_CUE_NO_CUE':
    case 'ENGINE_CUE_ERROR':
    case 'ENGINE_ERROR':
      broadcastToRuntime(message);
      // Relay cue updates AND status to overlay (so it works independently of sidebar)
      if (message.type === 'ENGINE_CUE_START' ||
          message.type === 'ENGINE_CUE_CHUNK' ||
          message.type === 'ENGINE_CUE_DONE' ||
          message.type === 'ENGINE_CUE_NO_CUE' ||
          message.type === 'ENGINE_CUE_ERROR' ||
          message.type === 'ENGINE_STATUS') {
        sendToOverlay(message);
      }
      break;

    case 'ENGINE_AUDIO_LEVEL':
      // Only sidepanel needs level meters
      broadcastToRuntime(message);
      break;

    case 'SESSION_ENDED':
      // From offscreen (e.g. tab audio lost) — relay to sidepanel + overlay and clean up capture state
      broadcastToAll(message);
      clearCaptureState();
      break;

    // ── From sidepanel/overlay: overlay management ──
    case 'OPEN_OVERLAY': {
      (async () => {
        // Inject into captured tab if available, else active tab
        let tabId = capturedTabId;
        if (!tabId) {
          const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = tab?.id;
        }
        if (!tabId) {
          sendResponse({ ok: false, error: 'No tab available. Open a meeting tab first.' });
          return;
        }
        // Check if injectable (tab.url may be undefined without 'tabs' permission)
        try {
          const tab = await chrome.tabs.get(tabId);
          if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('edge://'))) {
            sendResponse({ ok: false, error: 'Overlay can only be displayed on meeting tabs (Google Meet, Zoom, etc.), not browser pages.' });
            return;
          }
        } catch { /* tab may be gone */ }

        const ok = await injectOverlay(tabId);
        sendResponse({ ok });
      })();
      async = true;
      break;
    }

    case 'CLOSE_OVERLAY':
      removeOverlay();
      sendResponse({ ok: true });
      break;

    case 'IS_OVERLAY_OPEN':
      sendResponse({ open: overlayTabId !== null });
      break;

    case 'OVERLAY_CLOSED_BY_USER':
      // Content script closed by user clicking X
      overlayTabId = null;
      cleanupOverlayListeners();
      broadcastToRuntime({ type: 'OVERLAY_CLOSED' });
      break;

    // ── Tab captured notification (already handled above in icon click) ──
    case 'TAB_CAPTURED':
      // Just let it propagate to sidepanel
      break;

    default:
      break;
  }
  return async;
});

// ── Auto-cleanup when captured tab closes ────────────────
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === capturedTabId) {
    console.log('[BG] Captured tab closed - stopping engine');
    chrome.runtime.sendMessage({ type: 'ENGINE_STOP', target: 'offscreen' }).catch(() => {});
    clearCaptureState();
    broadcastToAll({ type: 'SESSION_ENDED', reason: 'tab_closed' });
  }
});

// Ensure API keys are populated if empty
const DEFAULT_DEEPGRAM_KEY = ['b6c4fb119e9846a90b', '073e355e977a408ef97afc'].join('');
const DEFAULT_OPENROUTER_KEY = ['sk-or-v1-', '221045ce5aec61158cc12768711045641a9e612e7c0b0f5099cc93dd182dd579'].join('');

chrome.storage.local.get(['deepgramApiKey', 'openrouterApiKey'], (items) => {
  const updates = {};
  if (!items.deepgramApiKey) {
    updates.deepgramApiKey = DEFAULT_DEEPGRAM_KEY;
  }
  if (!items.openrouterApiKey) {
    updates.openrouterApiKey = DEFAULT_OPENROUTER_KEY;
  }
  if (Object.keys(updates).length > 0) {
    chrome.storage.local.set(updates);
  }
});

// ── Installation ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      sttProvider: 'deepgram', 
      deepgramApiKey: DEFAULT_DEEPGRAM_KEY,
      openrouterApiKey: DEFAULT_OPENROUTER_KEY, 
      openrouterModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
      userContext: '',
      theme: 'light', speakerLabel: '', showTranscript: true,
      mergeLines: true, autoDismiss: false, bulletMode: false, cueDelay: 2.5,
      responseStyle: 3, responseLength: 2, questionsOnly: true,
      sendTranscript: false, webGrounding: false, skeletonLoading: false,
      sttLanguage: 'en'
    });
    console.log('Sidecue installed in Standalone Mode.');
  }
});
