/* ═══════════════════════════════════════════════════
   Sidecue — Content Script Overlay
   Transparent floating cue display injected into tab.
   Survives independently of the side panel — receives
   cue events from the offscreen engine via background relay.
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Prevent double-injection
  if (document.getElementById('sidecue-overlay')) return;

  // Ensure CSS is loaded
  if (!document.querySelector('link[data-sidecue-overlay]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content-overlay.css');
    link.setAttribute('data-sidecue-overlay', '1');
    document.head.appendChild(link);
  }

  // ─── State ────────────────────────────────────
  let opacity = 0.85;
  let fontSize = 18;
  let cueText = '';
  let sessionActive = false;

  // ─── Build DOM ────────────────────────────────
  const root = document.createElement('div');
  root.id = 'sidecue-overlay';
  root.innerHTML = `
    <div class="sc-container">
      <div class="sc-drag">
        <span class="sc-drag-icon">⠿</span>
        <div class="sc-status" id="sc-status">
          <span class="sc-status-dot" id="sc-status-dot"></span>
          <span class="sc-status-text" id="sc-status-text">Idle</span>
        </div>
        <div class="sc-controls">
          <button class="sc-icon-btn" id="sc-btn-font-down" title="Smaller text">A↓</button>
          <button class="sc-icon-btn" id="sc-btn-font-up" title="Larger text">A↑</button>
          <button class="sc-icon-btn" id="sc-btn-opacity-down" title="More transparent">◑</button>
          <button class="sc-icon-btn" id="sc-btn-opacity-up" title="Less transparent">◉</button>
          <button class="sc-icon-btn sc-stop" id="sc-btn-stop" title="Stop session">■</button>
          <button class="sc-icon-btn sc-close" id="sc-btn-close" title="Close overlay">✕</button>
        </div>
      </div>
      <div class="sc-display" id="sc-display">
        <div class="sc-question" id="sc-question"></div>
        <div class="sc-answer" id="sc-answer">
          <span class="sc-waiting">Waiting for cues…</span>
        </div>
      </div>
      <div class="sc-resize" id="sc-resize">⌟</div>
    </div>`;

  document.documentElement.appendChild(root);

  // ─── Element refs ─────────────────────────────
  const container = root.querySelector('.sc-container');
  const dragBar = root.querySelector('.sc-drag');
  const questionEl = root.querySelector('#sc-question');
  const answerEl = root.querySelector('#sc-answer');
  const statusDot = root.querySelector('#sc-status-dot');
  const statusText = root.querySelector('#sc-status-text');
  const btnClose = root.querySelector('#sc-btn-close');
  const btnStop = root.querySelector('#sc-btn-stop');
  const btnOpacityDown = root.querySelector('#sc-btn-opacity-down');
  const btnOpacityUp = root.querySelector('#sc-btn-opacity-up');
  const btnFontDown = root.querySelector('#sc-btn-font-down');
  const btnFontUp = root.querySelector('#sc-btn-font-up');
  const resizeHandle = root.querySelector('#sc-resize');

  applyOpacity();
  applyFontSize();

  // ─── Status ───────────────────────────────────
  function setStatus(status) {
    root.dataset.status = status;
    statusDot.className = 'sc-status-dot';
    switch (status) {
      case 'listening':
        statusDot.classList.add('sc-dot-listening');
        statusText.textContent = 'Active';
        sessionActive = true;
        btnStop.style.display = 'flex';
        break;
      case 'processing':
        statusDot.classList.add('sc-dot-processing');
        statusText.textContent = 'Thinking…';
        sessionActive = true;
        btnStop.style.display = 'flex';
        break;
      case 'idle':
        statusDot.classList.add('sc-dot-idle');
        statusText.textContent = 'Idle';
        sessionActive = false;
        btnStop.style.display = 'none';
        break;
      case 'error':
        statusDot.classList.add('sc-dot-error');
        statusText.textContent = 'Error';
        break;
    }
  }

  setStatus('idle');

  // ─── Opacity ──────────────────────────────────
  function applyOpacity() {
    container.style.background = `rgba(18, 18, 18, ${opacity})`;
    dragBar.style.background = `rgba(30, 30, 30, ${Math.min(opacity + 0.1, 1)})`;
  }

  btnOpacityDown.addEventListener('click', () => {
    opacity = Math.max(0.1, +(opacity - 0.1).toFixed(2));
    applyOpacity();
  });

  btnOpacityUp.addEventListener('click', () => {
    opacity = Math.min(1, +(opacity + 0.1).toFixed(2));
    applyOpacity();
  });

  // ─── Font Size ────────────────────────────────
  function applyFontSize() {
    answerEl.style.fontSize = fontSize + 'px';
    // Scale question proportionally (~70% of answer size, min 11px)
    const qSize = Math.max(11, Math.round(fontSize * 0.7));
    questionEl.style.fontSize = qSize + 'px';
  }

  btnFontDown.addEventListener('click', () => {
    fontSize = Math.max(12, fontSize - 2);
    applyFontSize();
  });

  btnFontUp.addEventListener('click', () => {
    fontSize = Math.min(32, fontSize + 2);
    applyFontSize();
  });

  // ─── Drag ─────────────────────────────────────
  let isDragging = false;
  let dragStartX, dragStartY, overlayStartX, overlayStartY;

  dragBar.addEventListener('mousedown', (e) => {
    if (e.target.closest('.sc-icon-btn') || e.target.closest('.sc-status')) return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    const rect = root.getBoundingClientRect();
    overlayStartX = rect.left;
    overlayStartY = rect.top;
    root.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      root.style.left = (overlayStartX + e.clientX - dragStartX) + 'px';
      root.style.top = (overlayStartY + e.clientY - dragStartY) + 'px';
      root.style.transform = 'none';
      return;
    }
    if (isResizing) {
      const newW = Math.max(320, Math.min(window.innerWidth - 20, resizeStartW + e.clientX - resizeStartX));
      root.style.width = newW + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    isResizing = false;
  });

  // ─── Resize ───────────────────────────────────
  let isResizing = false;
  let resizeStartX, resizeStartW;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizeStartX = e.clientX;
    resizeStartW = root.offsetWidth;
    e.preventDefault();
    e.stopPropagation();
  });

  // ─── Close & Stop ─────────────────────────────
  function destroyOverlay() {
    root.remove();
    const link = document.querySelector('link[data-sidecue-overlay]');
    if (link) link.remove();
  }

  btnClose.addEventListener('click', () => {
    try { chrome.runtime.sendMessage({ type: 'OVERLAY_CLOSED_BY_USER' }); } catch (_) {}
    destroyOverlay();
  });

  btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
    setStatus('idle');
    questionEl.textContent = '';
    answerEl.innerHTML = '<span class="sc-waiting">Session ended</span>';
  });

  // ─── Markdown renderer (lightweight) ──────────
  function renderMarkdown(text) {
    if (!text) return '';
    let clean = text.replace(/<br\s*\/?>/gi, '\n');
    clean = clean.replace(/<\/?[a-z][^>]*>/gi, '');
    // Strip "- " or "* " before emoji characters
    clean = clean.replace(/^[*\-]\s*(?=[\p{Emoji_Presentation}\p{Extended_Pictographic}])/gmu, '');

    let html = escapeHtml(clean);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─── Parse cue text into question + answer ────
  function parseCueText(text) {
    const lines = text.split('\n');
    if (lines.length === 0) return { question: '', answer: text };

    const firstLine = lines[0].trim();
    const qMatch = firstLine.match(/^(\*\*Q:\*\*|\*\*Q:|Q:|Question:)\s*(.*)/);
    const topicMatch = firstLine.match(/^(\*\*Topic:\*\*|\*\*Topic:|Topic:)\s*(.*)/);

    if (qMatch) {
      return {
        question: qMatch[2].replace(/\*\*/g, ''),
        answer: lines.slice(1).join('\n').trim(),
      };
    }
    if (topicMatch) {
      return {
        question: '\uD83D\uDCAC ' + topicMatch[2].replace(/\*\*/g, ''),
        answer: lines.slice(1).join('\n').trim(),
      };
    }
    return { question: '', answer: text };
  }

  // ─── Receive messages from background ─────────
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'REMOVE_OVERLAY') {
      destroyOverlay();
      return;
    }

    switch (msg.type) {
      case 'ENGINE_STATUS':
        setStatus(msg.status);
        break;

      case 'ENGINE_CUE_START':
        cueText = '';
        questionEl.textContent = '';
        answerEl.innerHTML = '<span class="sc-status-spin">✦</span> Generating…';
        break;

      case 'ENGINE_CUE_CHUNK':
        // Buffer silently — only render on ENGINE_CUE_DONE
        cueText += msg.chunk;
        break;

      case 'ENGINE_CUE_DONE': {
        const final = parseCueText(msg.fullText);
        if (final.question) {
          questionEl.textContent = final.question;
        }
        answerEl.innerHTML = renderMarkdown(final.answer);
        cueText = '';
        break;
      }

      case 'ENGINE_CUE_NO_CUE':
        if (!answerEl.querySelector('p') && !answerEl.querySelector('strong')) {
          questionEl.textContent = '';
          answerEl.innerHTML = '<span class="sc-waiting">Waiting for cues…</span>';
        }
        cueText = '';
        break;

      case 'ENGINE_CUE_ERROR':
        answerEl.innerHTML = '<span class="sc-error">⚠ ' + escapeHtml(msg.error || 'Generation error') + '</span>';
        break;

      case 'SESSION_ENDED':
        setStatus('idle');
        questionEl.textContent = '';
        answerEl.innerHTML = '<span class="sc-waiting">Session ended</span>';
        break;
    }
  });

  // ─── Signal ready ─────────────────────────────
  chrome.runtime.sendMessage({ type: 'OVERLAY_READY' }).catch(() => {});
})();
