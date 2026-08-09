// offscreen.js — AI-Take-Notes Processing Engine (tab-audio-only rebuild)
//
// Captures tab audio from a streamId, plays it back to the user at the
// default device sample rate (high quality, no audible artifacts), and
// downsamples a parallel copy to 16 kHz PCM16 for Deepgram STT.
//
// Two AudioContexts:
//   - playbackContext: default sample rate, plays tab audio back to user
//   - captureContext:  16 kHz, runs the AudioWorklet that produces PCM16
//
// Both consume their own MediaStreamAudioSourceNode wrapping the same
// MediaStream. This is safe (unlike attaching the stream to a <audio>
// element AND an AudioContext, which caused the echo).
//
// State machine:
//   idle → claiming → claimed → wired → running → stopping → idle
// Errors transition straight to 'failed' (terminal until handleStop).

console.log('[Engine] Offscreen engine loaded');

// ──────────────────────────────────────────────────────────────────────
//  State
// ──────────────────────────────────────────────────────────────────────
const STATE = Object.freeze({
  IDLE: 'idle',
  CLAIMING: 'claiming',
  CLAIMED: 'claimed',     // stream parked, awaiting ENGINE_START
  WIRED: 'wired',         // STT connected and worklet running
  RUNNING: 'running',     // session active
  STOPPING: 'stopping',
  FAILED: 'failed',
});

let state = STATE.IDLE;
let isPaused = false;
let settings = {};
let userContext = '';
let geminiFileUris = [];
let fatalErrorReported = false;  // suppress error cascade once one is reported

// Audio
let tabStream = null;
let playbackContext = null;
let captureContext = null;
let playbackSource = null;
let playbackGain = null;
let captureSource = null;
let workletNode = null;
let trackHealthInterval = null;

// Processing
let sttManager = null;
let llmClient = null;

// Question detection
let transcriptLines = [];
let pendingInterviewerLines = [];
let questionDebounceTimer = null;
let lastQuestionSent = '';
let cueInFlight = false;
let cueIdCounter = 0;
let currentCueId = null;
let pendingCueId = null;

// ──────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────
function broadcast(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function setState(next) {
  console.log(`[Engine] state: ${state} → ${next}`);
  state = next;
}

function reportFatal(err) {
  const msg = err?.message || String(err);
  console.error('[Engine] FATAL:', msg);
  if (fatalErrorReported) {
    console.log('[Engine] (suppressing duplicate fatal report)');
    return;
  }
  fatalErrorReported = true;
  setState(STATE.FAILED);
  broadcast({ type: 'ENGINE_ERROR', error: msg });
}

function getCueDelay()      { return (parseFloat(settings.cueDelay) || 2.5) * 1000; }
function getResponseStyle() { return parseInt(settings.responseStyle) || 3; }
function getResponseLength(){ return parseInt(settings.responseLength) || 2; }
function isQuestionsOnly()  { return settings.questionsOnly !== false; }
function isWebGrounding()   { return settings.webGrounding === true; }
function isBulletMode()     { return settings.bulletMode === true; }
function isStrictContext()  { return settings.strictContext === true; }

// ──────────────────────────────────────────────────────────────────────
//  Message Listener
// ──────────────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target && message.target !== 'offscreen') return;

  switch (message.type) {
    case 'OFFSCREEN_PING':
      sendResponse({ ready: true });
      return true;

    case 'CLAIM_STREAM':
      // Consume the streamId NOW before it expires (~5s TTL). Park the
      // MediaStream; ENGINE_START will pick it up later.
      handleClaim(message.streamId)
        .then(() => sendResponse({ ok: true }))
        .catch(err => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'ENGINE_START':
      handleStart(message);
      return false;

    case 'ENGINE_STOP':
      handleStop();
      return false;

    case 'ENGINE_PAUSE':
      isPaused = true;
      clearTimeout(questionDebounceTimer);
      console.log('[Engine] Session paused');
      return false;

    case 'ENGINE_RESUME':
      isPaused = false;
      pendingInterviewerLines = [];
      console.log('[Engine] Session resumed');
      return false;

    case 'ENGINE_UPDATE_SETTINGS':
      handleUpdateSettings(message.settings);
      return false;

    case 'ENGINE_UPDATE_CONTEXT':
      userContext = message.userContext || '';
      return false;

    case 'ENGINE_GET_STATE':
      sendResponse({
        isActive: state === STATE.RUNNING || state === STATE.WIRED,
        isPaused,
        transcriptLines: transcriptLines.slice(-100),
        currentCueId,
        cueInFlight,
        state,
      });
      return true;
  }
  return false;
});

// ──────────────────────────────────────────────────────────────────────
//  Stream Claim — consumes the streamId immediately
// ──────────────────────────────────────────────────────────────────────
async function handleClaim(streamId) {
  if (state !== STATE.IDLE && state !== STATE.FAILED) {
    console.warn(`[Engine] handleClaim while state=${state}; tearing down first`);
    await handleStop();
  }
  fatalErrorReported = false;
  setState(STATE.CLAIMING);

  if (!streamId) {
    setState(STATE.IDLE);
    throw new Error('handleClaim: missing streamId');
  }

  try {
    tabStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });
    console.log('[Engine] handleClaim: MediaStream parked, tracks:', tabStream.getAudioTracks().length);
    setState(STATE.CLAIMED);
  } catch (err) {
    console.error('[Engine] handleClaim failed:', err);
    setState(STATE.IDLE);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────
//  Engine Start
// ──────────────────────────────────────────────────────────────────────
async function handleStart(message) {
  if (state === STATE.RUNNING || state === STATE.WIRED) {
    console.log('[Engine] Already running, stopping first...');
    await handleStop();
    await new Promise(r => setTimeout(r, 200));
  }
  if (state !== STATE.CLAIMED) {
    reportFatal(new Error(`Cannot start session: no audio stream is parked (state=${state}). Please click the AI-Take-Notes icon on your meeting tab.`));
    return;
  }

  settings = message.settings || {};
  userContext = message.userContext || '';
  geminiFileUris = message.geminiFileUris || [];
  if (geminiFileUris.length > 0) {
    console.log('[Engine] Session has', geminiFileUris.length, 'Gemini file(s)');
  }

  // Reset cue-detection state
  transcriptLines = [];
  pendingInterviewerLines = [];
  lastQuestionSent = '';
  cueInFlight = false;
  pendingCueId = null;
  fatalErrorReported = false;

  try {
    // 1. STT
    sttManager = new STTManager({
      language: (settings.sttLanguage && settings.sttLanguage !== 'auto') ? settings.sttLanguage : 'en',
      deepgramApiKey: settings.deepgramApiKey,
      onTranscript: handleTranscript,
      onError: (err) => {
        // STT errors are non-fatal until reconnects exhaust; even then, just
        // surface once. The engine keeps the audio graph alive so a reload
        // of the session can recover without re-doing capture.
        console.warn('[Engine] STT error:', err.message);
        if (!fatalErrorReported) {
          fatalErrorReported = true;
          broadcast({ type: 'ENGINE_ERROR', error: err.message });
        }
      },
      onStatusChange: (s) => console.log('[Engine] STT status:', s),
    });

    // 2. LLM client
    llmClient = new LLMClient({ 
      apiKey: settings.openrouterApiKey,
      model: settings.openrouterModel
    });

    // 3. Audio graph (playback + capture)
    await buildAudioGraph();

    // 4. Connect STT — only after audio is flowing
    await sttManager.connect();

    setState(STATE.RUNNING);
    broadcast({ type: 'ENGINE_STATUS', status: 'listening' });
    console.log('[Engine] Session fully started');
  } catch (err) {
    console.error('[Engine] Start failed:', err);
    reportFatal(err);
    // Tear down anything partially constructed; idempotent
    await handleStop();
  }
}

// ──────────────────────────────────────────────────────────────────────
//  Audio Graph
// ──────────────────────────────────────────────────────────────────────
async function buildAudioGraph() {
  if (!tabStream) throw new Error('buildAudioGraph: no tabStream');
  setState(STATE.WIRED);

  // ── Playback path: default sample rate, audible ─────────────────
  // Letting the AudioContext use the system default sample rate avoids
  // the resampling-induced artifacts (echo/flutter) that occurred when
  // forcing 16 kHz playback.
  playbackContext = new AudioContext();
  await playbackContext.resume();

  playbackSource = playbackContext.createMediaStreamSource(tabStream);
  playbackGain = playbackContext.createGain();
  playbackGain.gain.value = 1.0;
  playbackSource.connect(playbackGain);
  playbackGain.connect(playbackContext.destination);
  console.log('[Engine] Playback context running at', playbackContext.sampleRate, 'Hz');

  // ── Capture path: 16 kHz, fed to AudioWorklet ──────────────────
  // A separate context at the target STT rate keeps the resampling in
  // a single place (our worklet) and isolates capture timing from
  // playback timing.
  captureContext = new AudioContext({ sampleRate: 16000 });
  await captureContext.resume();

  await captureContext.audioWorklet.addModule(chrome.runtime.getURL('lib/pcm-worklet.js'));

  captureSource = captureContext.createMediaStreamSource(tabStream);
  workletNode = new AudioWorkletNode(captureContext, 'pcm-downsampler', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: {
      targetRate: 16000,
      chunkSize: 4096,
    },
  });

  workletNode.port.onmessage = (e) => {
    const data = e.data;
    if (data && data.type === 'pcm') {
      if (sttManager) sttManager.sendAudio(data.buffer);
      broadcast({ type: 'ENGINE_AUDIO_LEVEL', source: 'tab', level: data.level });
    }
  };

  // Connect: source → worklet → (silent) destination
  // Worklet must route to destination for `process()` to be called.
  // A muted gain prevents double playback through this branch.
  const sink = captureContext.createGain();
  sink.gain.value = 0;
  captureSource.connect(workletNode);
  workletNode.connect(sink);
  sink.connect(captureContext.destination);

  console.log('[Engine] Capture context running at', captureContext.sampleRate, 'Hz with worklet');

  // ── Health monitoring on the underlying track ──────────────────
  const tabTrack = tabStream.getAudioTracks()[0];
  if (tabTrack) {
    tabTrack.addEventListener('ended', () => {
      console.warn('[Engine] Tab audio track ended');
      handleTrackLost();
    });
    trackHealthInterval = setInterval(() => {
      if (state !== STATE.RUNNING && state !== STATE.WIRED) {
        clearInterval(trackHealthInterval);
        trackHealthInterval = null;
        return;
      }
      if (tabTrack.readyState === 'ended') {
        console.warn('[Engine] Track readyState=ended detected via polling');
        handleTrackLost();
      }
    }, 3000);
  }
}

function handleTrackLost() {
  if (trackHealthInterval) {
    clearInterval(trackHealthInterval);
    trackHealthInterval = null;
  }
  if (!fatalErrorReported) {
    fatalErrorReported = true;
    broadcast({ type: 'ENGINE_ERROR', error: 'Tab audio lost — the captured tab may have navigated away or closed.' });
  }
  // Don't await; fire-and-forget cleanup so we don't deadlock if the
  // session is mid-stop already.
  handleStop().catch(() => {});
  broadcast({ type: 'SESSION_ENDED', reason: 'tab_audio_lost' });
}

// ──────────────────────────────────────────────────────────────────────
//  Engine Stop (idempotent)
// ──────────────────────────────────────────────────────────────────────
async function handleStop() {
  if (state === STATE.IDLE || state === STATE.STOPPING) {
    return;
  }
  setState(STATE.STOPPING);
  isPaused = false;

  clearTimeout(questionDebounceTimer);
  if (trackHealthInterval) {
    clearInterval(trackHealthInterval);
    trackHealthInterval = null;
  }

  // Abort LLM
  if (llmClient) {
    try { llmClient.abort(); } catch {}
    llmClient = null;
  }

  // Disconnect STT
  if (sttManager) {
    try { sttManager.disconnect(); } catch {}
    sttManager = null;
  }

  // Tear down audio graph
  try { workletNode?.port?.close(); } catch {}
  try { workletNode?.disconnect(); } catch {}
  workletNode = null;

  try { captureSource?.disconnect(); } catch {}
  captureSource = null;

  try { playbackSource?.disconnect(); } catch {}
  playbackSource = null;
  try { playbackGain?.disconnect(); } catch {}
  playbackGain = null;

  if (captureContext && captureContext.state !== 'closed') {
    try { await captureContext.close(); } catch {}
  }
  captureContext = null;

  if (playbackContext && playbackContext.state !== 'closed') {
    try { await playbackContext.close(); } catch {}
  }
  playbackContext = null;

  // Stop the MediaStream tracks
  if (tabStream) {
    try { tabStream.getTracks().forEach(t => t.stop()); } catch {}
    tabStream = null;
  }

  cueInFlight = false;
  currentCueId = null;
  pendingCueId = null;

  setState(STATE.IDLE);
  broadcast({ type: 'ENGINE_STATUS', status: 'idle' });
  console.log('[Engine] Stopped cleanly');
}

// ──────────────────────────────────────────────────────────────────────
//  Settings updates
// ──────────────────────────────────────────────────────────────────────
function handleUpdateSettings(newSettings) {
  // Settings requiring restart — skipped while running
  const lockedKeys = ['sttLanguage', 'deepgramApiKey'];
  const running = (state === STATE.RUNNING || state === STATE.WIRED);

  for (const [key, value] of Object.entries(newSettings)) {
    if (running && lockedKeys.includes(key)) continue;
    settings[key] = value;
  }

  // Update LLM client immediately
  if (llmClient) {
    llmClient.setConfig(settings);
  }

  console.log('[Engine] Settings updated (running:', running, ')');
}

// ──────────────────────────────────────────────────────────────────────
//  Transcript Handling
// ──────────────────────────────────────────────────────────────────────
function handleTranscript(data) {
  if (!data.text.trim()) return;

  if (data.isFinal) {
    console.log(`[Engine] FINAL: ${data.text.substring(0, 60)}`);

    transcriptLines.push({
      speaker: 'interviewer',
      text: data.text,
      timestamp: Date.now(),
    });

    broadcast({
      type: 'ENGINE_TRANSCRIPT',
      speaker: 'interviewer',
      text: data.text,
    });

    // Without a mic to signal "your turn", the only trigger for cue
    // generation is silence (cueDelay). Every final line extends the
    // pending interviewer buffer.
    pendingInterviewerLines.push(data.text);
    checkForQuestion();
  } else {
    broadcast({
      type: 'ENGINE_INTERIM',
      speaker: 'interviewer',
      text: data.text,
    });
  }
}

// ──────────────────────────────────────────────────────────────────────
//  Question Detection & Cue Generation
// ──────────────────────────────────────────────────────────────────────
function checkForQuestion() {
  if (isPaused) return;
  console.log('[Engine] checkForQuestion — pending:', pendingInterviewerLines.length, 'inFlight:', cueInFlight);

  // Interviewer is still talking — abort any in-flight cue so we generate
  // a fresh one once they pause.
  if (cueInFlight && llmClient) {
    console.log('[Engine] Interviewer still talking — aborting in-flight cue', currentCueId);
    try { llmClient.abort(); } catch {}
    broadcast({ type: 'ENGINE_CUE_NO_CUE', cueId: currentCueId });
    cueInFlight = false;
  }

  if (!pendingCueId) {
    pendingCueId = ++cueIdCounter;
  }

  clearTimeout(questionDebounceTimer);
  questionDebounceTimer = setTimeout(() => {
    const cueId = pendingCueId;
    pendingCueId = null;
    detectAndGenerateCue(cueId);
  }, getCueDelay());
}

async function detectAndGenerateCue(cueId) {
  console.log('[Engine] detectAndGenerateCue, pending:', pendingInterviewerLines.length);
  const rawText = pendingInterviewerLines.join(' ').trim();

  // Reorder: non-question sentences before question sentences
  const sentences = rawText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [rawText];
  const questions = [];
  const statements = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (trimmed.endsWith('?')) questions.push(trimmed);
    else statements.push(trimmed);
  }
  const interviewerText = [...statements, ...questions].join(' ').trim();

  if (!interviewerText || interviewerText === lastQuestionSent) {
    console.log('[Engine] Skipped — empty or duplicate');
    broadcast({ type: 'ENGINE_CUE_NO_CUE', cueId });
    return;
  }

  lastQuestionSent = interviewerText;

  broadcast({ type: 'ENGINE_CUE_START', cueId, phase: 'generating' });
  broadcast({ type: 'ENGINE_STATUS', status: 'processing' });
  cueInFlight = true;
  currentCueId = cueId;

  console.log('[Engine] Calling LLM — speech:', interviewerText.substring(0, 80));

  try {
    await llmClient.generateCue({
      transcript: '',  // sendTranscript is always off in current build
      recentSpeech: interviewerText,
      userContext: userContext,
      geminiFileUris: geminiFileUris,
      responseStyle: getResponseStyle(),
      responseLength: getResponseLength(),
      questionsOnly: isQuestionsOnly(),
      bulletMode: isBulletMode(),
      strictContext: isStrictContext(),
      webGrounding: isWebGrounding(),
      onChunk: (chunk) => broadcast({ type: 'ENGINE_CUE_CHUNK', cueId, chunk }),
      onDone: (fullResponse) => {
        cueInFlight = false;
        pendingInterviewerLines = [];
        if (fullResponse.trim() === 'NO_CUE') {
          broadcast({ type: 'ENGINE_CUE_NO_CUE', cueId });
        } else {
          broadcast({ type: 'ENGINE_CUE_DONE', cueId, fullText: fullResponse });
        }
        broadcast({ type: 'ENGINE_STATUS', status: 'listening' });
      },
      onError: (err) => {
        cueInFlight = false;
        pendingInterviewerLines = [];
        broadcast({ type: 'ENGINE_CUE_ERROR', cueId, error: err.message });
        broadcast({ type: 'ENGINE_STATUS', status: 'listening' });
      },
    });
  } catch (err) {
    cueInFlight = false;
    pendingInterviewerLines = [];
    broadcast({ type: 'ENGINE_CUE_ERROR', cueId, error: err.message });
    broadcast({ type: 'ENGINE_STATUS', status: 'listening' });
  }
}
