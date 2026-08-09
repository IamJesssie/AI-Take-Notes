// sidepanel.js — Sidecue Display Client
// Thin UI: receives events from offscreen engine via background relay.
// All audio, STT, and LLM processing runs in the offscreen document.

class SideCueApp {
  // ── Knowledge Limits ────────────────────────────────────
  static MAX_KNOWLEDGE_CHARS = 20000;  // ~5K words, ~6K tokens
  static MAX_FILES = 10;
  static MAX_FILE_CHARS = 15000;  // per file extracted text

  constructor() {
    // State
    this.isSessionActive = false;
    this.isSessionStarting = false;  // guard against double-start races
    this.isSessionPaused = false;
    this.settings = {};
    this.knowledgeFiles = [];
    this.pendingSessionStart = false;
    this.lastTranscriptLineEl = null;   // { el, speaker } — for merge-lines
    this.lastInterviewerLineEl = null;   // legacy alias (used by engine merge-break)
    this.overlayOpen = false;

    // Active cue card tracking
    this.activeCueCard = null; // { cueId, card, questionEl, answerEl, text }
    
    // Session data for saving
    this.sessionCues = []; // Array of {question, answer} for saving to DB
    this.capturedPlatform = null; // Detected platform (Google Meet, Zoom, etc.)

    // DOM refs
    this.els = {
      statusBadge: document.getElementById('status-badge'),
      btnStart: document.getElementById('btn-start'),
      btnPause: document.getElementById('btn-pause'),
      btnStop: document.getElementById('btn-stop'),

      btnClearTranscript: null, // removed from UI
      btnSaveContext: document.getElementById('btn-save-context'),
      btnClearContext: document.getElementById('btn-clear-context'),
      btnOverlay: document.getElementById('btn-overlay'),
      levelTab: document.getElementById('level-tab'),
      btnDownloadTranscript: document.getElementById('btn-download-transcript'),
      cueCards: document.getElementById('cue-cards'),
      transcript: document.getElementById('transcript'),
      userContext: document.getElementById('user-context'),
      fileDropZone: document.getElementById('file-drop-zone'),
      fileInput: document.getElementById('file-input'),
      fileList: document.getElementById('file-list'),
      usageFill: document.getElementById('usage-fill'),
      btnImportTranscript: document.getElementById('btn-import-transcript'),
      inputImportTranscript: document.getElementById('input-import-transcript'),
      btnDownloadPdf: document.getElementById('btn-download-pdf'),
    };

    this.init();
  }

  // ── Settings Helpers ────────────────────────────────────
  get cueDelay() { return (parseFloat(this.settings.cueDelay) || 2.5) * 1000; }
  get speakerLabel() { return (this.settings.speakerLabel || '').trim() || 'SPEAKER'; }
  get showTranscript() { return this.settings.showTranscript !== false; }
  get mergeLines() { return this.settings.mergeLines !== false; }
  get autoDismiss() { return this.settings.autoDismiss === true; }
  get theme() { return this.settings.theme || 'light'; }
  get responseStyle() { return parseInt(this.settings.responseStyle) || 3; }
  get responseLength() { return parseInt(this.settings.responseLength) || 2; }
  get questionsOnly() { return this.settings.questionsOnly !== false; }
  get sendTranscript() { return false; } // Always off — only recent speech is sent
  get webGrounding() { return this.settings.webGrounding === true; }
  get skeletonLoading() { return this.settings.skeletonLoading !== false; }
  get bulletMode() { return this.settings.bulletMode === true; }
  get strictContext() { return this.settings.strictContext === true; }

  static STYLE_DESCRIPTIONS = {
    1: 'Short, relaxed answers with contractions — startup chats, informal screens',
    2: 'Warm and approachable with a bit more detail — team fit interviews',
    3: 'Natural and polished — works for most interviews',
    4: 'Structured, metrics-forward answers — senior roles, panel interviews',
    5: 'Strategic, executive-level language — C-suite, board, leadership rounds',
  };

  static LENGTH_DESCRIPTIONS = {
    1: 'Quick and punchy — just the key point, 2-3 sentences',
    2: 'Moderate depth — covers key points with supporting detail',
    3: 'Thorough and comprehensive — full examples, metrics, and context',
  };

  // ── Initialize ──────────────────────────────────────────
  async init() {
    this.bindEvents();
    this.initSettingsEvents();
    // Set placeholder logo src via JS (CSP-safe — inline scripts are blocked)
    const placeholderLogo = document.getElementById('placeholder-logo');
    if (placeholderLogo) {
      placeholderLogo.src = chrome.runtime.getURL('logo/sidecue_logo_big.png');
    }
    await this.loadSettings();
    await this.loadKnowledgeFiles();
    this.updateKnowledgeUsage();
    this.applyTheme();
    this.applyTranscriptVisibility();
    this.populateSettingsUI();
    this.listenToEngine();
    await this.checkExistingSession();
    this.loadLastTranscript();
    this.showLanguageReminder();
    this.showTabReminder();
    this.initAuth();
    // If the side panel opened AFTER background captured a tab (the common
    // case: user clicks the toolbar icon, capture races ahead of the panel
    // mounting), the TAB_CAPTURED broadcast may have fired before our
    // listener registered. Pick up any pending capture now.
    this._reconcilePendingCapture();
    console.log('AI-Take-Notes initialized (display client)');
  }

  async _reconcilePendingCapture() {
    try {
      const info = await this.getCaptureInfo();
      if (info?.hasPendingCapture && !info.captureActive
          && !this.isSessionActive && !this.isSessionStarting) {
        console.log('[Sidepanel] Found pending capture on init — showing Ready state (user must click Start)');
        this.showReadyToStart(info.capturedTabTitle);
      }
    } catch (e) {
      console.warn('[Sidepanel] reconcilePendingCapture failed:', e.message);
    }
  }

  // Language name lookup
  static LANGUAGE_NAMES = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    it: 'Italian', pt: 'Portuguese', nl: 'Dutch', pl: 'Polish',
    uk: 'Ukrainian', ru: 'Russian', ja: 'Japanese', ko: 'Korean',
    zh: 'Chinese', hi: 'Hindi', ar: 'Arabic', tr: 'Turkish',
    sv: 'Swedish', da: 'Danish', no: 'Norwegian', fi: 'Finnish',
  };

  bindEvents() {
    this.els.btnStart.addEventListener('click', () => this.startSession());
    this.els.btnPause.addEventListener('click', () => this.togglePause());
    this.els.btnStop.addEventListener('click', () => this.stopSession());
    // Tab navigation
    document.querySelectorAll('#tab-bar .tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });
    // Clear transcript button removed from UI
    this.els.btnSaveContext.addEventListener('click', () => this.saveContext());
    this.els.btnClearContext.addEventListener('click', () => this.clearContext());
    this.els.btnDownloadTranscript.addEventListener('click', () => this.downloadTranscript());

    const btnImport = document.getElementById('btn-import-transcript');
    const inputImport = document.getElementById('input-import-transcript');
    const btnDownloadPdf = document.getElementById('btn-download-pdf');
    
    if (btnImport && inputImport) {
      btnImport.addEventListener('click', () => inputImport.click());
      inputImport.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.importTranscriptFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }
    
    if (btnDownloadPdf) {
      btnDownloadPdf.addEventListener('click', () => this.downloadPdfTranscript());
    }

    // Summary events
    if (this.els.btnGenerateSummary) {
      this.els.btnGenerateSummary.addEventListener('click', () => this.generateSummary());
    }
    if (this.els.btnCopySummary) {
      this.els.btnCopySummary.addEventListener('click', () => {
        navigator.clipboard.writeText(this.els.summaryContent.innerText);
        this.showToast('Summary copied!', 'info');
      });
    }
    if (this.els.btnExportSummary) {
      this.els.btnExportSummary.addEventListener('click', () => this.exportSummary());
    }

    // Copilot suggestions
    if (this.els.btnRefreshSuggestions) {
      this.els.btnRefreshSuggestions.addEventListener('click', () => this.generateCopilotQuestions());
    }

    // Transcript minimize toggle — entire header bar is clickable
    const transcriptHeader = document.querySelector('#transcript-area .section-header');
    transcriptHeader.addEventListener('click', () => {
      const area = document.getElementById('transcript-area');
      area.classList.toggle('minimized');
      const btn = document.getElementById('btn-toggle-transcript');
      btn.title = area.classList.contains('minimized') ? 'Expand transcript' : 'Minimize transcript';
      chrome.storage.local.set({ transcriptMinimized: area.classList.contains('minimized') });
    });

    // Restore minimized state (default: minimized)
    chrome.storage.local.get('transcriptMinimized', (data) => {
      const isMinimized = data.transcriptMinimized !== false; // default true
      if (isMinimized) {
        document.getElementById('transcript-area').classList.add('minimized');
        document.getElementById('btn-toggle-transcript').title = 'Expand transcript';
      }
    });

    // Transcript drag-to-resize
    this._initTranscriptResize();

    // Overlay toggle
    if (this.els.btnOverlay) {
      this.els.btnOverlay.addEventListener('click', () => this.toggleOverlay());
    }

    // Auto-save context on change
    let contextTimer = null;
    this.els.userContext.addEventListener('input', () => {
      clearTimeout(contextTimer);
      contextTimer = setTimeout(() => this.saveContext(true), 1000);
      this.toggleClearContextBtn();
      this.updateKnowledgeUsage();
    });

    // Listen for TAB_CAPTURED — show Ready state (do NOT auto-start)
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'SETTINGS_UPDATED') {
        Object.assign(this.settings, msg.settings);
      }
      if (msg.type === 'TAB_CAPTURED') {
        // Capture succeeded — surface the Ready state and let the user click Start.
        // Guard: if a session is already active or starting (e.g. user clicked the
        // icon again on the same meeting tab during a session), don't disturb it.
        if (!this.isSessionActive && !this.isSessionStarting) {
          this.showReadyToStart(msg.tabTitle);
        }
      }
      if (msg.type === 'CAPTURE_FAILED') {
        // Capture attempt failed (wrong page type, reload needed, etc.).
        // Render as inline placeholder — not a toast — so the message is
        // persistent, single, and doesn't stack on repeat attempts.
        this.pendingSessionStart = false;
        this.showCaptureError(msg.error || 'Tab audio capture failed.');
      }
      if (msg.type === 'OVERLAY_CLOSED') {
        this.overlayOpen = false;
        this.updateOverlayButton();
      }
      if (msg.type === 'SESSION_ENDED') {
        // Session ended unexpectedly - try to save session data
        this.saveSessionOnUnexpectedEnd(msg.reason);
      }
      if (msg.type === 'KNOWLEDGE_UPDATED_FROM_CLOUD') {
        // Web dashboard changed knowledge — reload from local storage (knowledge-sync already pulled it)
        chrome.storage.local.get(['knowledgeFiles', 'userContext'], (result) => {
          this.knowledgeFiles = result.knowledgeFiles || [];
          this.renderAllFiles();
          if (result.userContext && !document.hasFocus()) {
            this.els.userContext.value = result.userContext;
            this.toggleClearContextBtn();
          }
          this.updateKnowledgeUsage();
          chrome.runtime.sendMessage({ type: 'UPDATE_ENGINE_CONTEXT', userContext: this.getFullKnowledge() });
        });
      }
    });

    // ── File upload events ──────────────────────────────────
    this.els.fileInput.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
      e.target.value = '';
    });
    this.els.fileDropZone.addEventListener('click', (e) => {
      if (e.target.tagName !== 'LABEL') this.els.fileInput.click();
    });
    this.els.fileDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.els.fileDropZone.classList.add('drag-over');
    });
    this.els.fileDropZone.addEventListener('dragleave', () => {
      this.els.fileDropZone.classList.remove('drag-over');
    });
    this.els.fileDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.els.fileDropZone.classList.remove('drag-over');
      this.handleFiles(e.dataTransfer.files);
    });
  }

  // ══════════════════════════════════════════════════════════
  //  Engine Event Listener
  // ══════════════════════════════════════════════════════════
  listenToEngine() {
    chrome.runtime.onMessage.addListener((msg) => {
      switch (msg.type) {
        case 'ENGINE_STATUS':
          // Don't let engine status updates override the paused badge
          if (!this.isSessionPaused) this.setStatus(msg.status);
          break;

        case 'ENGINE_AUDIO_LEVEL':
          this.updateAudioLevel(msg.source, msg.level);
          break;

        case 'ENGINE_TRANSCRIPT':
          this.addTranscriptLine(msg.speaker, msg.text);
          break;

        case 'ENGINE_INTERIM':
          this.updateInterimTranscript(msg.speaker, msg.text);
          break;

        case 'ENGINE_CUE_START':
          this.handleCueStart(msg.cueId);
          break;

        case 'ENGINE_CUE_CHUNK':
          this.handleCueChunk(msg.cueId, msg.chunk);
          break;

        case 'ENGINE_CUE_DONE':
          this.handleCueDone(msg.cueId, msg.fullText);
          break;

        case 'ENGINE_CUE_NO_CUE':
          this.handleCueNoCue(msg.cueId);
          break;

        case 'ENGINE_CUE_ERROR':
          this.handleCueError(msg.cueId, msg.error);
          break;

        case 'ENGINE_ERROR':
          this.handleError({ message: msg.error });
          break;

        case 'TOGGLE_PAUSE_SHORTCUT':
          this.togglePause();
          break;
      }
    });
  }

  // ── Transcript Persistence & Export ──────────────────
  async downloadTranscript() {
    const transcriptLines = Array.from(this.els.transcript.querySelectorAll('.transcript-line'));
    if (transcriptLines.length === 0) {
      this.showToast('No transcript to download', 'info');
      return;
    }

    const title = this.capturedTabTitle || 'Meeting Transcript';
    const dateStr = new Date().toLocaleString();
    let text = `SIDECUE TRANSCRIPT\nDate: ${dateStr}\nMeeting: ${title}\n----------------------------------\n\n`;

    transcriptLines.forEach(line => {
      const speaker = line.querySelector('.speaker-label')?.textContent || line.querySelector('.speaker')?.textContent || '';
      const content = line.querySelector('.transcript-text')?.textContent || '';
      text += `${speaker} ${content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const filename = `Sidecue_Transcript_${new Date().toISOString().slice(0,10)}_${Date.now()}.txt`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Transcript downloaded to your Downloads folder', 'info');
  }

  async downloadPdfTranscript() {
    const transcriptLines = Array.from(this.els.transcript.querySelectorAll('.transcript-line'));
    if (transcriptLines.length === 0) {
      this.showToast('No transcript to export to PDF', 'info');
      return;
    }

    const title = this.capturedTabTitle || 'Meeting & Interview Transcript';
    const dateStr = new Date().toLocaleString();

    let linesHtml = '';
    transcriptLines.forEach(line => {
      const speakerEl = line.querySelector('.speaker') || line.querySelector('.speaker-label');
      const textEl = line.querySelector('.transcript-text');
      if (textEl) {
        const speaker = speakerEl ? speakerEl.textContent : 'SPEAKER';
        const speakerClass = speakerEl && speakerEl.classList.contains('speaker-user') ? 'speaker-user' : 'speaker-interviewer';
        const text = this.escapeHtml(textEl.textContent);
        linesHtml += `
          <div class="transcript-entry">
            <span class="speaker-badge ${speakerClass}">${this.escapeHtml(speaker)}</span>
            <span class="entry-text">${text}</span>
          </div>
        `;
      }
    });

    const htmlDoc = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>AI-Take-Notes Transcript</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; margin: 40px; color: #1a1a1a; background: #ffffff; }
          .header { border-bottom: 2px solid #3b82f6; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 6px 0; }
          .meta { font-size: 13px; color: #64748b; margin: 0; }
          .transcript-entry { margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border-left: 3px solid #cbd5e1; }
          .speaker-badge { display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px; letter-spacing: 0.5px; }
          .speaker-user { background: #dbeafe; color: #1e40af; }
          .speaker-interviewer { background: #e0e7ff; color: #3730a3; }
          .entry-text { display: block; font-size: 14px; line-height: 1.6; color: #334155; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">AI-Take-Notes Transcript</h1>
          <p class="meta"><strong>Meeting:</strong> ${this.escapeHtml(title)} &nbsp;|&nbsp; <strong>Date:</strong> ${this.escapeHtml(dateStr)}</p>
        </div>
        <div class="content">
          ${linesHtml}
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      this.showToast('PDF print preview opened. Save as PDF from your browser dialog.', 'info');
    } else {
      this.showToast('Pop-up blocked. Please allow pop-ups for PDF export.', 'warn');
    }
  }

  async importTranscriptFile(file) {
    if (!file) return;
    const name = file.name.toLowerCase();
    const ext = name.split('.').pop();
    
    // Make sure transcript container is visible
    if (this.els.btnDownloadTranscript) this.els.btnDownloadTranscript.style.display = 'flex';
    const btnPdf = document.getElementById('btn-download-pdf');
    if (btnPdf) btnPdf.style.display = 'flex';

    // Remove placeholder if present
    const placeholder = this.els.transcript.querySelector('.transcript-placeholder');
    if (placeholder) placeholder.remove();

    if (['txt', 'json', 'srt', 'vtt'].includes(ext)) {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        
        let importedCount = 0;
        lines.forEach(line => {
          // Check for Speaker pattern like "Speaker:", "YOU:", "Interviewer:"
          const match = line.match(/^([^:\n]+):\s*(.*)/);
          if (match) {
            const speakerRaw = match[1].trim().toLowerCase();
            const textContent = match[2].trim();
            const speaker = (speakerRaw.includes('you') || speakerRaw.includes('me') || speakerRaw.includes('user')) ? 'user' : 'interviewer';
            if (textContent) {
              this.addTranscriptLine(speaker, textContent);
              importedCount++;
            }
          } else if (line.length > 5 && !line.match(/^\d+$/) && !line.includes('-->')) {
            this.addTranscriptLine('interviewer', line);
            importedCount++;
          }
        });

        this.showToast(`Imported ${importedCount} lines from ${file.name}`, 'info');
        this.saveTranscriptLocally();
        this.generateCopilotQuestions();
      } catch (err) {
        this.showToast(`Failed to parse text file: ${err.message}`, 'error');
      }
    } else if (['mp3', 'wav', 'm4a', 'webm', 'ogg'].includes(ext)) {
      const apiKey = (this.settings.deepgramApiKey || '').trim();
      if (!apiKey) {
        this.showToast('Please set your Deepgram API Key in Settings to transcribe audio files.', 'warn');
        return;
      }

      this.showToast(`Transcribing ${file.name} via Deepgram...`, 'info');
      try {
        const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&diarize=true', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': file.type || 'audio/wav'
          },
          body: file
        });

        if (!response.ok) {
          throw new Error(`Deepgram API returned ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const paragraphs = data.results?.channels[0]?.alternatives[0]?.paragraphs?.paragraphs;

        if (paragraphs && paragraphs.length > 0) {
          paragraphs.forEach(p => {
            const speakerId = p.speaker || 0;
            const speakerLabel = speakerId === 0 ? 'user' : 'interviewer';
            const sentenceText = p.sentences.map(s => s.text).join(' ');
            if (sentenceText) {
              this.addTranscriptLine(speakerLabel, sentenceText);
            }
          });
        } else {
          const transcriptText = data.results?.channels[0]?.alternatives[0]?.transcript;
          if (transcriptText) {
            this.addTranscriptLine('interviewer', transcriptText);
          } else {
            this.showToast('No speech detected in audio file.', 'warn');
            return;
          }
        }

        this.showToast(`Audio transcript imported from ${file.name}`, 'info');
        this.saveTranscriptLocally();
        this.generateCopilotQuestions();

      } catch (err) {
        console.error('Audio transcription error:', err);
        this.showToast(`Audio transcription failed: ${err.message}`, 'error');
      }
    } else {
      this.showToast(`Unsupported transcript file format: .${ext}`, 'warn');
    }
  }

  saveTranscriptLocally() {
    const lines = Array.from(this.els.transcript.querySelectorAll('.transcript-line')).map(line => ({
      speaker: line.querySelector('.speaker-label')?.textContent || '',
      text: line.querySelector('.transcript-text')?.textContent || ''
    }));
    
    if (lines.length > 0) {
      chrome.storage.local.set({ 
        lastTranscript: {
          title: this.capturedTabTitle || 'Previous Session',
          date: new Date().toISOString(),
          lines: lines
        }
      });
    }
  }

  async loadLastTranscript() {
    chrome.storage.local.get('lastTranscript', (data) => {
      if (data.lastTranscript && data.lastTranscript.lines.length > 0 && !this.isSessionActive) {
        this.els.transcript.innerHTML = '';
        data.lastTranscript.lines.forEach(line => {
          this.addTranscriptLine(line.speaker.replace(':', ''), line.text);
        });
        if (this.els.btnDownloadTranscript) this.els.btnDownloadTranscript.style.display = 'flex';
        const btnPdf = document.getElementById('btn-download-pdf');
        if (btnPdf) btnPdf.style.display = 'flex';
        console.log('[Sidepanel] Loaded last transcript from local storage');
      }
    });
  }
  async startSession() {
    // Guard: only one session start may be in flight at a time. The TAB_CAPTURED
    // listener and _reconcilePendingCapture() can both fire roughly simultaneously
    // after a fresh icon click, and without this guard they both run the full
    // start flow and produce duplicate engine starts plus stacked errors.
    if (this.isSessionActive || this.isSessionStarting) {
      console.log('[Sidepanel] startSession ignored — already active or starting');
      return;
    }
    this.isSessionStarting = true;
    this.setStartButtonLoading(true);

    try {
      await this._startSessionInner();
    } finally {
      this.isSessionStarting = false;
      // Only clear the loading state if the button is still visible (i.e. we
      // didn't successfully transition into the active-session UI, which
      // hides the Start button entirely).
      if (this.els.btnStart && this.els.btnStart.style.display !== 'none') {
        this.setStartButtonLoading(false);
      }
    }
  }

  setStartButtonLoading(loading) {
    const btn = this.els.btnStart;
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      btn.classList.add('btn-loading');
      btn.innerHTML = '<span class="btn-spinner"></span> Starting…';
    } else {
      btn.disabled = false;
      btn.classList.remove('btn-loading');
      btn.innerHTML = '<span class="material-symbols-outlined">play_circle</span> Start';
    }
  }

  async _startSessionInner() {
    // ── Standalone Mode: Use local settings only ──
    const sttKey = this.settings.deepgramApiKey;
    const llmKey = this.settings.openrouterApiKey;

    if (!sttKey || !llmKey) {
      this.showToast('Please enter your Deepgram and OpenRouter API keys in Settings.', 'info');
      this.switchTab('settings');
      return;
    }

    let captureInfo = await this.getCaptureInfo();
    if (!captureInfo?.hasPendingCapture) {
      this.triggerCaptureActiveTab();
      return;
    }
    this.hideCapturePrompt();

    try {
      this.setStatus('connecting');

      const sessionSettings = {
        ...this.settings,
        sttProvider: 'deepgram',
        deepgramApiKey: sttKey,
        openrouterApiKey: llmKey,
        openrouterModel: this.settings.openrouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free'
      };

      // Send start command to engine
      chrome.runtime.sendMessage({
        type: 'START_SESSION',
        settings: sessionSettings,
        userContext: this.getFullKnowledge(),
        geminiFileUris: [], // Files not supported in simple local mode yet
        authToken: 'standalone',
      }, (response) => {
        if (response?.success) {
          this.isSessionActive = true;
          this.isSessionPaused = false;
          this.els.btnStart.style.display = 'none';
          this.els.btnPause.style.display = 'flex';
          this.els.btnStop.style.display = 'flex';
          document.getElementById('audio-levels').style.display = 'flex';
          this.els.transcript.innerHTML = '';
          if (this.els.btnDownloadTranscript) this.els.btnDownloadTranscript.style.display = 'none';
          const btnPdf = document.getElementById('btn-download-pdf');
          if (btnPdf) btnPdf.style.display = 'none';
          this.els.cueCards.innerHTML = '';
          this.activeCueCard = null;
          this.lastTranscriptLineEl = null;
          this.lastInterviewerLineEl = null;
          this.sessionCues = []; 
          this.capturedPlatform = this.detectPlatform(response.capturedTabTitle);
          this.capturedTabTitle = response.capturedTabTitle;
          this.updateSessionLocks();
          this.dismissLanguageReminder();
          this.dismissTabReminder();

          const nameEl = document.getElementById('capture-tab-name');
          const infoEl = document.getElementById('capture-info');
          if (response.capturedTabTitle) {
            nameEl.textContent = response.capturedTabTitle;
            infoEl.style.display = 'flex';
          }
          console.log('Standalone session started');
        } else {
          this.showError(response?.error || 'Failed to start session');
        }
      });
    } catch (err) {
      console.error('[Session] Failed to start session:', err);
      this.showError(err.message || 'Failed to start session');
      this.setStatus('idle');
    }
  }

  stopSession() {
    // Get transcript from engine before stopping
    chrome.runtime.sendMessage({ type: 'GET_ENGINE_STATE' }, (state) => {
      const transcript = state?.transcriptLines || [];
      
      // Stop the engine
      chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
      
      // End metered session with session data for saving
      const sessionData = {
        title: this.capturedTabTitle || this.capturedPlatform || 'Session',
        platform: this.capturedPlatform || 'Other',
        transcript: transcript.map(line => ({
          speaker: line.speaker,
          text: line.text
        })),
        cues: this.sessionCues || []
      };
      
      this.saveTranscriptLocally();
      
      console.log('[Session] Saving session data:', {
        title: sessionData.title,
        platform: sessionData.platform,
        transcriptLines: sessionData.transcript.length,
        cues: sessionData.cues.length
      });
      
      this.sessionManager?.endSession(sessionData).catch((err) => {
        console.warn('[Session] End session error:', err);
      });
      
      this.onSessionEnded();
    });
  }

  togglePause() {
    if (!this.isSessionActive) return;
    if (this.isSessionPaused) {
      // Resume
      chrome.runtime.sendMessage({ type: 'RESUME_SESSION' });
      this.isSessionPaused = false;
      this.setStatus('listening');
      this.els.btnPause.innerHTML = '<span class="material-symbols-outlined">pause</span> Pause';
    } else {
      // Pause
      chrome.runtime.sendMessage({ type: 'PAUSE_SESSION' });
      this.isSessionPaused = true;
      this.setStatus('paused');
      this.els.btnPause.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Resume';
    }
  }

  // Handle unexpected session end (tab close, audio loss) - save session data
  saveSessionOnUnexpectedEnd(reason) {
    // Get transcript from engine state (may still be available briefly)
    chrome.runtime.sendMessage({ type: 'GET_ENGINE_STATE' }, (state) => {
      const transcript = state?.transcriptLines || [];
      
      // Save session data if we have any meaningful content
      if ((transcript.length > 0 || this.sessionCues?.length > 0) && this.sessionManager) {
        const sessionData = {
          title: this.capturedTabTitle || this.capturedPlatform || 'Session',
          platform: this.capturedPlatform || 'Other',
          transcript: transcript.map(line => ({
            speaker: line.speaker,
            text: line.text
          })),
          cues: this.sessionCues || []
        };
        
        console.log('[Session] Saving session on unexpected end:', {
          reason,
          transcriptLines: sessionData.transcript.length,
          cues: sessionData.cues.length
        });
        
        this.sessionManager.endSession(sessionData).catch((err) => {
          console.warn('[Session] End session error:', err);
        });

        this.saveTranscriptLocally();
      } else {
        // Just end the metered session without saving content
        this.sessionManager?.endSession().catch((err) => {
          console.warn('[Session] End session error:', err);
        });
      }
      
      this.onSessionEnded(reason);
    });
  }

  onSessionEnded(reason, skipSave = false) {
    this.isSessionActive = false;
    this.isSessionPaused = false;
    this._readyTabTitle = null;
    this.hideCapturePrompt();
    this.setStatus('idle');
    this.els.btnStart.style.display = 'none';
    this.els.btnPause.style.display = 'none';
    this.els.btnStop.style.display = 'none';
    document.getElementById('audio-levels').style.display = 'none';
    document.getElementById('capture-info').style.display = 'none';
    this.els.levelTab.style.width = '0%';
    this.lastTranscriptLineEl = null;
    this.lastInterviewerLineEl = null;
    this.activeCueCard = null;
    this.updateSessionLocks();

    // Show reason-specific message
    if (reason === 'tab_audio_lost') {
      this.showToast('Tab audio was lost — the tab may have navigated away. Start a new session from your meeting tab.', 'warn');
    } else if (reason === 'tab_closed') {
      this.showToast('The meeting tab was closed. Session ended.', 'info');
    }

    console.log('Session ended', reason || '');
  }

  // Check if engine is already running (sidepanel reopened)
  async checkExistingSession() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_ENGINE_STATE' }, (state) => {
        if (state?.isActive) {
          this.isSessionActive = true;
          this.isSessionPaused = !!state.isPaused;
          this.els.btnPause.style.display = 'flex';
          this.els.btnStop.style.display = 'flex';
          document.getElementById('audio-levels').style.display = 'flex';

          if (this.isSessionPaused) {
            this.setStatus('paused');
            this.els.btnPause.innerHTML = '<span class="material-symbols-outlined">play_arrow</span> Resume';
          } else {
            this.setStatus('listening');
          }

          // Rebuild transcript from engine state
          if (state.transcriptLines) {
            for (const line of state.transcriptLines) {
              this.addTranscriptLine(line.speaker, line.text);
            }
          }

          // Show capture info
          chrome.runtime.sendMessage({ type: 'GET_CAPTURE_INFO' }, (info) => {
            if (info?.capturedTabTitle) {
              document.getElementById('capture-tab-name').textContent = info.capturedTabTitle;
              document.getElementById('capture-info').style.display = 'flex';
            }
          });

          console.log('Reconnected to active session');
        }

        // Check if overlay is still open (may have been opened before sidebar was closed)
        chrome.runtime.sendMessage({ type: 'IS_OVERLAY_OPEN' }, (resp) => {
          if (resp?.open) {
            this.overlayOpen = true;
            this.updateOverlayButton();
          }
        });

        resolve();
      });
    });
  }

  // ── Mic Permission Helpers ────────────────────────────────
  async _xx_removed_mic_helpers() { /* removed */ }

  // ── Tab Capture Prompt ───────────────────────────────
  getCaptureInfo() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_CAPTURE_INFO' }, resolve);
    });
  }

  triggerCaptureActiveTab() {
    this.showToast('Connecting meeting tab audio...', 'info');
    chrome.runtime.sendMessage({ type: 'TRIGGER_CAPTURE_ACTIVE_TAB' }, (resp) => {
      if (resp && !resp.success) {
        this.showToast(resp.error || 'Failed to capture tab audio', 'error');
      }
    });
  }

  showCapturePrompt() {
    this.pendingSessionStart = true;
    this.els.cueCards.innerHTML = `
      <div class="cue-card cue-capture-prompt" style="text-align: center; padding: 24px 16px;">
        <img src="logo/sidecue_logo_big.png" class="capture-prompt-icon" alt="Sidecue" style="width: 56px; height: 56px; margin-bottom: 12px;">
        <p style="margin-bottom: 12px;"><strong>Open your meeting tab (Zoom, Meet, Teams) and click Connect Audio:</strong></p>
        <button id="btn-connect-audio-prompt" class="btn btn-primary" style="display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px; width: 100%;">
          <span class="material-symbols-outlined">graphic_eq</span>
          Connect Tab Audio & Start
        </button>
        <p class="capture-prompt-sub">Or click the Sidecue icon in your Chrome toolbar / press <kbd>Alt+S</kbd> on your meeting tab.</p>
      </div>
    `;
    const btn = this.els.cueCards.querySelector('#btn-connect-audio-prompt');
    if (btn) btn.addEventListener('click', () => this.triggerCaptureActiveTab());
    this.switchTab('cues');
  }

  showCaptureError(message) {
    this.els.cueCards.innerHTML = `
      <div class="cue-card cue-capture-error">
        <span class="material-symbols-outlined capture-error-icon">error_outline</span>
        <p class="capture-error-title">Can’t capture this page</p>
        <p class="capture-error-msg"></p>
        <p class="capture-prompt-sub">Open a meeting tab (Google Meet, Zoom, Teams…) or any web page with audio, then click the Sidecue icon or press <kbd>Alt+S</kbd>.</p>
      </div>
    `;
    const msgEl = this.els.cueCards.querySelector('.capture-error-msg');
    if (msgEl) msgEl.textContent = message;
    this.switchTab('cues');
  }

  hideCapturePrompt() {
    this.pendingSessionStart = false;
    this.els.cueCards.innerHTML = `
      <div class="cue-card cue-placeholder">
        <img src="logo/sidecue_logo_big.png" class="placeholder-app-icon" alt="Sidecue">
        <p><strong>Open your meeting tab</strong> (Google Meet, Zoom, Teams…) and click the <strong>Sidecue icon</strong> in your Chrome toolbar to start.</p>
        <p class="capture-prompt-sub">Or press <kbd>Alt+S</kbd> while on the meeting tab.</p>
      </div>
    `;
  }

  // ── Ready-To-Start State ─────────────────────────────
  showReadyToStart(tabTitle) {
    if (this.isSessionActive || this.isSessionStarting) return;

    if (this._readyTabTitle === tabTitle && this.els.cueCards.querySelector('.cue-ready')) {
      return;
    }
    this._readyTabTitle = tabTitle;

    this.setStatus('ready');
    this.els.btnStart.style.display = 'flex';
    this.els.btnPause.style.display = 'none';
    this.els.btnStop.style.display = 'none';

    const nameEl = document.getElementById('capture-tab-name');
    const infoEl = document.getElementById('capture-info');
    if (tabTitle && nameEl && infoEl) {
      nameEl.textContent = tabTitle;
      infoEl.style.display = 'flex';
    }

    const safeTitle = tabTitle ? String(tabTitle) : 'your meeting tab';
    this.els.cueCards.innerHTML = `
      <div class="cue-card cue-placeholder cue-ready">
        <img src="logo/sidecue_logo_big.png" class="placeholder-app-icon" alt="Sidecue">
        <p><strong>Ready to start.</strong></p>
        <p>Tab audio is connected. Click <strong>Start</strong> when your meeting begins — recording and transcription will only run while a session is active.</p>
        <p class="capture-prompt-sub ready-tab-line"></p>
      </div>
    `;
    // Insert tab title via textContent to avoid HTML injection
    const tabLine = this.els.cueCards.querySelector('.ready-tab-line');
    if (tabLine) tabLine.textContent = `Connected to: ${safeTitle}`;

    this.switchTab('cues');
  }

  hideReadyToStart() {
    this._readyTabTitle = null;
    if (this.els.btnStart) this.els.btnStart.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════
  //  Overlay Toggle
  // ══════════════════════════════════════════════════════════
  toggleOverlay() {
    if (this.overlayOpen) {
      chrome.runtime.sendMessage({ type: 'CLOSE_OVERLAY' });
      this.overlayOpen = false;
    } else {
      chrome.runtime.sendMessage({ type: 'OPEN_OVERLAY' }, (resp) => {
        if (resp?.ok) {
          this.overlayOpen = true;
        } else {
          this.showToast(resp?.error || 'Overlay can only be shown on meeting tabs. Open a meeting first.', 'info');
        }
        this.updateOverlayButton();
      });
    }
    this.updateOverlayButton();
  }

  updateOverlayButton() {
    if (!this.els.btnOverlay) return;
    if (this.overlayOpen) {
      this.els.btnOverlay.classList.add('overlay-active');
    } else {
      this.els.btnOverlay.classList.remove('overlay-active');
    }
  }

  // ══════════════════════════════════════════════════════════
  //  Cue Card Handling (display only)
  // ══════════════════════════════════════════════════════════
  handleCueStart(cueId) {
    // Create or reuse the active cue card
    if (!this.activeCueCard || this.activeCueCard.cueId !== cueId) {
      // A different cue is starting — if the old one never finalized, remove it
      if (this.activeCueCard && this.activeCueCard.cueId !== cueId) {
        this.activeCueCard.card.remove();
        this.activeCueCard = null;
      }

      // New cue — create card
      const placeholder = this.els.cueCards.querySelector('.cue-placeholder');
      if (placeholder) placeholder.remove();
      if (this.autoDismiss) this.dismissOldCues();

      this.activeCueCard = this.createCueCard(cueId);
    }

    const card = this.activeCueCard;

    if (this.skeletonLoading) {
      this.showSkeletonCard(card);
    } else {
      card.questionEl.innerHTML = '<span class="material-symbols-outlined cue-status-icon cue-status-spin">auto_awesome</span> Generating cue…';
      card.questionEl.classList.add('cue-question-status');
      card.answerEl.innerHTML = '<span class="cue-streaming"></span>';
    }
  }

  handleCueChunk(cueId, chunk) {
    if (!this.activeCueCard || this.activeCueCard.cueId !== cueId) return;
    // Buffer chunks silently — don't render until done
    this.activeCueCard.text += chunk;
  }

  handleCueDone(cueId, fullText) {
    console.log('[CueDone] cueId:', cueId, 'fullText length:', fullText?.length, 'preview:', fullText?.substring(0, 150));
    if (!this.activeCueCard || this.activeCueCard.cueId !== cueId) {
      console.warn('[CueDone] No matching active card for cueId:', cueId);
      return;
    }
    const card = this.activeCueCard;
    card.text = fullText;

    // NOW render the complete cue card in one shot (no flickering)
    if (card.card.classList.contains('cue-skeleton')) {
      this.clearSkeletonCard(card);
    } else if (card.questionEl.classList.contains('cue-question-status')) {
      card.questionEl.classList.remove('cue-question-status');
    }

    this.renderCueCardText(card);

    // Remove streaming cursor (renderCueCardText adds one — remove it since we're done)
    const cursor = card.answerEl.querySelector('.cue-streaming');
    if (cursor) cursor.remove();

    card.card.classList.remove('cue-active');
    
    // Save cue for session history
    const parsedCue = this.parseCueText(fullText);
    if (parsedCue) {
      this.sessionCues.push(parsedCue);
    }
    
    this.activeCueCard = null;
  }
  
  // Parse cue text into {question, answer} format
  parseCueText(text) {
    if (!text || text.trim() === 'NO_CUE') return null;
    
    const lines = text.split('\n');
    if (lines.length === 0) return null;
    
    const firstLine = lines[0].trim();
    const qMatch = firstLine.match(/^(\*\*Q:\*\*|\*\*Q:|Q:|Question:)\s*(.*)/);
    const topicMatch = firstLine.match(/^(\*\*Topic:\*\*|\*\*Topic:|Topic:)\s*(.*)/);
    
    let question = '';
    let answer = '';
    
    if (qMatch) {
      question = qMatch[2].replace(/\*\*/g, '');
      answer = lines.slice(1).join('\n').trim();
    } else if (topicMatch) {
      question = topicMatch[2].replace(/\*\*/g, '');
      answer = lines.slice(1).join('\n').trim();
    } else {
      question = 'Detected question';
      answer = text.trim();
    }
    
    return { question, answer };
  }

  handleCueNoCue(cueId) {
    if (this.activeCueCard && this.activeCueCard.cueId === cueId) {
      this.activeCueCard.card.remove();
      this.activeCueCard = null;
    } else {
      // Orphaned card (superseded by a newer cue) — find and remove by data attribute
      this._removeOrphanedCard(cueId);
    }
  }

  handleCueError(cueId, error) {
    if (this.activeCueCard && this.activeCueCard.cueId === cueId) {
      this.activeCueCard.card.remove();
      this.activeCueCard = null;
    } else {
      this._removeOrphanedCard(cueId);
    }
    this.handleError({ message: error });
  }

  _removeOrphanedCard(cueId) {
    const orphan = this.els.cueCards.querySelector(`[data-cue-id="${cueId}"]`);
    if (orphan) orphan.remove();
  }

  createCueCard(cueId) {
    const card = document.createElement('div');
    card.className = 'cue-card cue-active';
    card.dataset.cueId = cueId;

    const questionEl = document.createElement('div');
    questionEl.className = 'cue-question';

    const answerEl = document.createElement('div');
    answerEl.className = 'cue-answer';

    card.appendChild(questionEl);
    card.appendChild(answerEl);
    this.els.cueCards.prepend(card);

    // Deactivate older cards
    const allCards = this.els.cueCards.querySelectorAll('.cue-card');
    allCards.forEach((c, i) => { if (i > 0) c.classList.remove('cue-active'); });

    // Max 5 cards
    while (this.els.cueCards.children.length > 5) {
      this.els.cueCards.lastElementChild.remove();
    }

    return { cueId, card, questionEl, answerEl, text: '' };
  }

  renderCueCardText(card) {
    const lines = card.text.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const qMatch = firstLine.match(/^(\*\*Q:\*\*|\*\*Q:|Q:|Question:)\s*(.*)/);
      const topicMatch = firstLine.match(/^(\*\*Topic:\*\*|\*\*Topic:|Topic:)\s*(.*)/);
      if (qMatch) {
        card.questionEl.textContent = qMatch[2].replace(/\*\*/g, '');
        const answerText = lines.slice(1).join('\n').trim();
        card.answerEl.innerHTML = this.renderMarkdown(answerText) + '<span class="cue-streaming"></span>';
      } else if (topicMatch) {
        card.questionEl.textContent = '\uD83D\uDCAC ' + topicMatch[2].replace(/\*\*/g, '');
        const answerText = lines.slice(1).join('\n').trim();
        card.answerEl.innerHTML = this.renderMarkdown(answerText) + '<span class="cue-streaming"></span>';
      } else {
        card.questionEl.textContent = 'Detected question';
        card.answerEl.innerHTML = this.renderMarkdown(card.text) + '<span class="cue-streaming"></span>';
      }
    }
  }

  showSkeletonCard(cueCard) {
    cueCard.card.classList.add('cue-skeleton');
    cueCard.questionEl.innerHTML = '<div class="skeleton-line skeleton-question"></div>';
    cueCard.questionEl.classList.remove('cue-question-status');
    cueCard.answerEl.innerHTML =
      '<div class="skeleton-line skeleton-long"></div>' +
      '<div class="skeleton-line skeleton-medium"></div>' +
      '<div class="skeleton-line skeleton-short"></div>';
  }

  clearSkeletonCard(cueCard) {
    cueCard.card.classList.remove('cue-skeleton');
    cueCard.questionEl.textContent = '';
    cueCard.answerEl.innerHTML = '';
  }

  dismissOldCues() {
    const cards = this.els.cueCards.querySelectorAll('.cue-card:not(.cue-placeholder)');
    cards.forEach(c => {
      c.classList.add('cue-dismissing');
      c.addEventListener('animationend', () => c.remove(), { once: true });
    });
  }

  // ══════════════════════════════════════════════════════════
  //  Transcript Display
  // ══════════════════════════════════════════════════════════
  addTranscriptLine(speaker, text) {
    if (this.els.btnDownloadTranscript) this.els.btnDownloadTranscript.style.display = 'flex';
    const btnPdf = document.getElementById('btn-download-pdf');
    if (btnPdf) btnPdf.style.display = 'flex';
    const speakerClass = (speaker === 'interviewer' || speaker.toLowerCase().includes('speaker')) ? 'speaker-interviewer' : 'speaker-user';
    const speakerLabel = speaker === 'interviewer' ? this.speakerLabel : (speaker.toLowerCase().includes('speaker') ? speaker : (speaker.toLowerCase() === 'you' ? 'YOU' : speaker));

    const interim = this.els.transcript.querySelector('.transcript-interim');
    if (interim) interim.remove();

    // Deduplicate: skip if the new text is already fully contained in the last line
    if (this.lastTranscriptLineEl && this.lastTranscriptLineEl.speaker === speaker) {
      const textNode = this.lastTranscriptLineEl.el.querySelector('.transcript-text');
      if (textNode) {
        const existing = textNode.textContent.toLowerCase().trim();
        const incoming = text.toLowerCase().trim();
        // Skip exact duplicates or substrings of what's already there
        if (existing === incoming || existing.endsWith(incoming)) return;

        // Merge consecutive lines from the same speaker
        if (this.mergeLines) {
          textNode.textContent += ' ' + text;
          this.els.transcript.scrollTop = this.els.transcript.scrollHeight;
          return;
        }
      }
    }

    const line = document.createElement('div');
    line.className = 'transcript-line';
    line.innerHTML = `<span class="speaker ${speakerClass}">${this.escapeHtml(speakerLabel)}</span><span class="transcript-text">${this.escapeHtml(text)}</span>`;
    this.els.transcript.appendChild(line);
    this.els.transcript.scrollTop = this.els.transcript.scrollHeight;

    this.lastTranscriptLineEl = { el: line, speaker };
    // Keep legacy ref for interviewer (used by engine merge-break logic)
    this.lastInterviewerLineEl = speaker === 'interviewer' ? line : null;
  }

  updateInterimTranscript(speaker, text) {
    let interim = this.els.transcript.querySelector('.transcript-interim');
    if (!interim) {
      interim = document.createElement('div');
      interim.className = 'transcript-line transcript-interim';
      this.els.transcript.appendChild(interim);
    }
    const speakerClass = speaker === 'interviewer' ? 'speaker-interviewer' : 'speaker-user';
    const speakerLabel = speaker === 'interviewer' ? this.speakerLabel : 'YOU';
    interim.innerHTML = `<span class="speaker ${speakerClass}">${this.escapeHtml(speakerLabel)}</span><span class="transcript-text">${this.escapeHtml(text)}</span>`;
    this.els.transcript.scrollTop = this.els.transcript.scrollHeight;
    
    // Show suggestions container if transcript has content
    if (this.els.copilotSuggestions) {
      this.els.copilotSuggestions.style.display = 'block';
    }
  }

  clearTranscript() {
    this.els.transcript.innerHTML = '<p class="transcript-placeholder">Conversation will appear here...</p>';
    this.lastTranscriptLineEl = null;
    this.lastInterviewerLineEl = null;
  }

  _initTranscriptResize() {
    const handle = document.getElementById('transcript-resize-handle');
    const transcript = this.els.transcript;
    let startY, startH;

    const onMouseMove = (e) => {
      const delta = startY - e.clientY;
      const newH = Math.min(Math.max(startH + delta, 60), 500);
      transcript.style.height = newH + 'px';
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      chrome.storage.local.set({ transcriptHeight: transcript.offsetHeight });
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startY = e.clientY;
      startH = transcript.offsetHeight;
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });

    // Restore saved height
    chrome.storage.local.get('transcriptHeight', (data) => {
      if (data.transcriptHeight) {
        transcript.style.height = data.transcriptHeight + 'px';
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  Audio Levels
  // ══════════════════════════════════════════════════════════
  updateAudioLevel(source, level) {
    // Only one source now (tab); levelMic was removed.
    if (source === 'tab' && this.els.levelTab) {
      const scaled = Math.min(level * 300, 100);
      this.els.levelTab.style.width = `${scaled}%`;
    }
  }

  // ══════════════════════════════════════════════════════════
  //  Markdown Renderer
  // ══════════════════════════════════════════════════════════
  renderMarkdown(text) {
    if (!text) return '';
    let clean = text.replace(/<br\s*\/?>/gi, '\n');
    clean = clean.replace(/<\/?[a-z][^>]*>/gi, '');
    // Strip "- " or "* " before emoji characters
    clean = clean.replace(/^[*\-]\s*(?=[\p{Emoji_Presentation}\p{Extended_Pictographic}])/gmu, '');

    let html = this.escapeHtml(clean);
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<p>\s*<\/p>/g, '');
    return html;
  }

  // ══════════════════════════════════════════════════════════
  //  Status & Errors
  // ══════════════════════════════════════════════════════════
  setStatus(status) {
    const badge = this.els.statusBadge;
    badge.className = 'badge';
    switch (status) {
      case 'idle':       badge.classList.add('badge-idle'); badge.textContent = 'Idle'; break;
      case 'ready':      badge.classList.add('badge-ready'); badge.textContent = 'Ready'; break;
      case 'connecting': badge.classList.add('badge-connecting'); badge.textContent = 'Connecting…'; break;
      case 'listening':  badge.classList.add('badge-listening'); badge.textContent = 'Active'; break;
      case 'processing': badge.classList.add('badge-processing'); badge.textContent = 'Thinking...'; break;
      case 'paused':     badge.classList.add('badge-paused'); badge.textContent = 'Paused'; break;
      case 'error':      badge.classList.add('badge-error'); badge.textContent = 'Error'; break;
    }
  }

  handleError(err) {
    const errMsg = err?.message || String(err);
    console.error('AI-Take-Notes error:', errMsg, err);

    // Capture-precondition errors aren't really errors — they mean the user
    // hasn't clicked the toolbar icon yet. Render the friendly inline prompt
    // instead of a red toast.
    const isCapturePrecondition =
      errMsg.includes('no audio stream is parked') ||
      errMsg.includes('No tab audio captured') ||
      errMsg.includes('No active tab') ||
      errMsg.includes('Cannot start session: no audio stream');
    if (isCapturePrecondition) {
      console.log('[AI-Take-Notes] Capture-precondition error — showing inline prompt instead of toast');
      this.setStatus('idle');
      this._resetSessionUI();
      this.showCapturePrompt();
      return;
    }

    // Dedupe: identical errors within a short window get suppressed so
    // a cascading failure (e.g. tab capture → mic → STT) doesn't spam toasts.
    const now = Date.now();
    if (errMsg === this._lastErrorMsg && (now - (this._lastErrorAt || 0)) < 2000) {
      console.log('[AI-Take-Notes] Suppressing duplicate error within dedupe window');
      return;
    }
    this._lastErrorMsg = errMsg;
    this._lastErrorAt = now;

    this.setStatus('error');
    this.showToast(errMsg, 'error');

    // If we thought a session was active but the engine errored out before
    // it could fully start, reset the UI so the user isn't stuck looking at
    // Pause/Stop buttons over an IDLE status.
    if (this.isSessionActive) {
      this._resetSessionUI();
    }
  }

  _resetSessionUI() {
    this.isSessionActive = false;
    this.isSessionStarting = false;
    this.isSessionPaused = false;
    if (this.els.btnStart) this.els.btnStart.style.display = 'none';
    if (this.els.btnPause) this.els.btnPause.style.display = 'none';
    if (this.els.btnStop)  this.els.btnStop.style.display  = 'none';
    const lvl = document.getElementById('audio-levels');
    if (lvl) lvl.style.display = 'none';
    const infoEl = document.getElementById('capture-info');
    if (infoEl) infoEl.style.display = 'none';
    // Tell background to drop pending capture so a fresh icon click can restart.
    chrome.runtime.sendMessage({ type: 'STOP_SESSION' }, () => { void chrome.runtime.lastError; });
  }

  showError(msg) { this.handleError({ message: msg }); }

  // severity: 'error' | 'warn' | 'info'
  showToast(msg, severity = 'error') {
    const isError = severity === 'error';
    const isWarn  = severity === 'warn';

    const toast = document.createElement('div');
    toast.className = 'sidecue-toast sidecue-toast-' + severity;
    toast.innerHTML = `
      <span class="material-symbols-outlined sidecue-toast-icon">${isError ? 'error' : isWarn ? 'info' : 'info'}</span>
      <span class="sidecue-toast-msg">${this.escapeHtml(msg)}</span>
    `;

    // Mount above cue cards, inside cue-area
    let container = document.getElementById('sidecue-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sidecue-toast-container';
      document.getElementById('cue-area').prepend(container);
    }
    container.appendChild(toast);

    const ttl = isError ? 7000 : 4000;
    setTimeout(() => {
      toast.classList.add('sidecue-toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, ttl);
  }

  // ══════════════════════════════════════════════════════════
  //  Theme
  // ══════════════════════════════════════════════════════════
  applyTheme() {
    document.body.classList.remove('theme-light', 'theme-dark');
    if (this.theme === 'light') document.body.classList.add('theme-light');
  }

  applyTranscriptVisibility() {
    const area = document.getElementById('transcript-area');
    area.style.display = this.showTranscript ? '' : 'none';
  }

  // ══════════════════════════════════════════════════════════
  //  Language Reminder
  // ══════════════════════════════════════════════════════════
  showLanguageReminder() {
    // Don't show if permanently dismissed or session is already active
    if (this.isSessionActive) return;

    chrome.storage.local.get('langReminderDismissed', (result) => {
      if (result.langReminderDismissed) return;

      const banner = document.getElementById('lang-reminder');
      const currentLangEl = document.getElementById('lang-reminder-current');
      const langCode = this.settings.sttLanguage || 'en';
      currentLangEl.textContent = SideCueApp.LANGUAGE_NAMES[langCode] || langCode;
      banner.style.display = '';

      // "Change language" — navigate to settings, open language accordion, scroll to it
      document.getElementById('lang-reminder-change').onclick = () => {
        this.dismissLanguageReminder();
        this.switchTab('settings');
        const langAccordion = document.getElementById('accordion-language');
        if (langAccordion) {
          document.querySelectorAll('.settings-accordion').forEach(d => d.removeAttribute('open'));
          langAccordion.setAttribute('open', '');
          requestAnimationFrame(() => langAccordion.scrollIntoView({ behavior: 'smooth', block: 'center' }));
        }
      };

      // "Dismiss" — hide for this session only
      document.getElementById('lang-reminder-dismiss').onclick = () => {
        this.dismissLanguageReminder();
      };

      // "Don't show again" — permanently dismiss
      document.getElementById('lang-reminder-never').onclick = () => {
        chrome.storage.local.set({ langReminderDismissed: true });
        this.dismissLanguageReminder();
      };
    });
  }

  dismissLanguageReminder() {
    const banner = document.getElementById('lang-reminder');
    banner.style.display = 'none';
  }

  showTabReminder() {
    if (this.isSessionActive) return;

    chrome.storage.local.get('tabReminderDismissed', (result) => {
      if (result.tabReminderDismissed) return;

      const banner = document.getElementById('tab-reminder');
      banner.style.display = '';

      document.getElementById('tab-reminder-instructions').onclick = () => {
        chrome.tabs.create({ url: 'https://www.sidecue.app/instructions' });
        this.dismissTabReminder();
      };

      document.getElementById('tab-reminder-dismiss').onclick = () => {
        this.dismissTabReminder();
      };

      document.getElementById('tab-reminder-never').onclick = () => {
        chrome.storage.local.set({ tabReminderDismissed: true });
        this.dismissTabReminder();
      };
    });
  }

  dismissTabReminder() {
    const banner = document.getElementById('tab-reminder');
    banner.style.display = 'none';
  }

  // ══════════════════════════════════════════════════════════
  //  Context & Knowledge Files
  // ══════════════════════════════════════════════════════════
  saveContext(silent = false) {
    const context = this.els.userContext.value;
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: { userContext: context } }, () => {
      // Also push updated context to running engine
      chrome.runtime.sendMessage({ type: 'UPDATE_ENGINE_CONTEXT', userContext: this.getFullKnowledge() });
      if (!silent) {
        this.els.btnSaveContext.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">check</span> Saved';
        setTimeout(() => {
          this.els.btnSaveContext.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">save</span> Save';
        }, 1500);
      }
    });
    // knowledge-sync.js handles Supabase sync via storage.onChanged
  }

  clearContext() {
    this.els.userContext.value = '';
    this.saveContext(true);
    this.toggleClearContextBtn();
    this.updateKnowledgeUsage();
  }

  toggleClearContextBtn() {
    this.els.btnClearContext.style.display = this.els.userContext.value.trim() ? '' : 'none';
  }

  updateKnowledgeUsage() {
    const fileCount = this.knowledgeFiles.length;
    const max = SideCueApp.MAX_FILES;
    const pct = Math.min((fileCount / max) * 100, 100);

    this.els.usageFill.style.width = pct + '%';
    this.els.usageLabel.textContent = `${fileCount} / ${max} files`;

    this.els.usageFill.classList.remove('usage-warn', 'usage-full');
    this.els.usageLabel.classList.remove('usage-warn', 'usage-full');
    if (pct >= 100) {
      this.els.usageFill.classList.add('usage-full');
      this.els.usageLabel.classList.add('usage-full');
    } else if (pct >= 80) {
      this.els.usageFill.classList.add('usage-warn');
      this.els.usageLabel.classList.add('usage-warn');
    }
  }

  updateUsageBar(remainingSeconds, quotaSeconds, tier) {
    // Update the account tab usage display if it exists
    const tierBadge = document.getElementById('tier-badge');
    const usageText = document.getElementById('session-usage-text');
    if (tierBadge) tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    if (usageText) {
      const used = quotaSeconds - remainingSeconds;
      usageText.textContent = `${SessionManager.formatTime(used)} / ${SessionManager.formatTime(quotaSeconds)} used`;
    }
    console.log(`[Session] Usage: ${SessionManager.formatTime(quotaSeconds - remainingSeconds)} / ${SessionManager.formatTime(quotaSeconds)} (${tier})`);
  }

  getFullKnowledge() {
    let context = (this.els.userContext.value || '').trim();
    
    // Append text from knowledge files
    if (this.knowledgeFiles && this.knowledgeFiles.length > 0) {
      const fileContexts = this.knowledgeFiles
        .filter(f => f.text)
        .map(f => `--- FILE: ${f.name} ---\n${f.text}`)
        .join('\n\n');
      
      if (fileContexts) {
        context = `USER MANUAL CONTEXT:\n${context}\n\nKNOWLEDGE BASE FILES:\n${fileContexts}`;
      }
    }
    
    return context;
  }

  getKnowledgeFilesForUpload() {
    // Returns files that have a storage_path (uploaded to Supabase Storage)
    return this.knowledgeFiles.filter(f => f.storage_path);
  }

  // ── Knowledge File Uploads ────────────────────────────────
  async handleFiles(fileList) {
    const ALLOWED_EXTS = ['txt', 'md', 'pdf', 'docx', 'doc'];

    for (const file of fileList) {
      if (this.knowledgeFiles.some(f => f.name === file.name)) continue;

      if (this.knowledgeFiles.length >= SideCueApp.MAX_FILES) {
        this.showToast(`Max ${SideCueApp.MAX_FILES} files allowed`, 'warn');
        break;
      }

      const ext = file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) {
        this.renderFileItem({ name: file.name, size: file.size, error: 'Unsupported file type' });
        continue;
      }

      try {
        // Local Standalone Mode: Extract text directly from the file
        const text = await FileTextExtractor.extract(file);
        
        if (text.length > SideCueApp.MAX_FILE_CHARS) {
          console.warn(`[Knowledge] File ${file.name} truncated from ${text.length} to ${SideCueApp.MAX_FILE_CHARS} chars`);
        }

        const entry = {
          name: file.name,
          size: file.size,
          text: text.substring(0, SideCueApp.MAX_FILE_CHARS),
          storage_path: null,
          storage_url: null,
        };

        this.knowledgeFiles.push(entry);
        this.renderFileItem(entry);
        this.saveKnowledgeFiles();
        this.updateKnowledgeUsage();
        chrome.runtime.sendMessage({ type: 'UPDATE_ENGINE_CONTEXT', userContext: this.getFullKnowledge() });
      } catch (err) {
        console.error('[Knowledge] Extraction failed:', err);
        this.renderFileItem({ name: file.name, size: file.size, error: 'Failed to read file: ' + err.message });
      }
    }
  }

  removeFile(name) {
    this.knowledgeFiles = this.knowledgeFiles.filter(f => f.name !== name);
    const item = this.els.fileList.querySelector(`[data-filename="${CSS.escape(name)}"]`);
    if (item) item.remove();
    this.saveKnowledgeFiles();
    this.updateKnowledgeUsage();
    chrome.runtime.sendMessage({ type: 'UPDATE_ENGINE_CONTEXT', userContext: this.getFullKnowledge() });
  }

  renderFileItem(entry) {
    const el = document.createElement('div');
    el.className = 'file-item' + (entry.error ? ' file-item-error' : '');
    el.dataset.filename = entry.name;
    const icon = entry.error ? 'error' : this.fileIcon(entry.name);
    const sizeStr = entry.error ? entry.error : this.formatFileSize(entry.size);
    el.innerHTML = `
      <span class="material-symbols-outlined file-item-icon">${icon}</span>
      <span class="file-item-name" title="${this.escapeHtml(entry.name)}">${this.escapeHtml(entry.name)}</span>
      <span class="file-item-size">${sizeStr}</span>
      <button class="file-item-remove" title="Remove"><span class="material-symbols-outlined">close</span></button>
    `;
    el.querySelector('.file-item-remove').addEventListener('click', () => this.removeFile(entry.name));
    this.els.fileList.appendChild(el);
  }

  renderAllFiles() {
    this.els.fileList.innerHTML = '';
    for (const f of this.knowledgeFiles) this.renderFileItem(f);
  }

  saveKnowledgeFiles() {
    // Persist storage_url so getFullKnowledge() can pass it to Gemini after a reload
    const toStore = this.knowledgeFiles.map(f => ({
      name: f.name,
      size: f.size,
      text: f.text || '',
      storage_path: f.storage_path || null,
      storage_url: f.storage_url || null,
    }));
    // knowledge-sync.js listens to storage.onChanged and handles Supabase sync
    chrome.storage.local.set({ knowledgeFiles: toStore });
  }

  async loadKnowledgeFiles() {
    // 1. Load from local cache immediately so the UI isn't blank
    await new Promise((resolve) => {
      chrome.storage.local.get('knowledgeFiles', (result) => {
        this.knowledgeFiles = result.knowledgeFiles || [];
        this.renderAllFiles();
        resolve();
      });
    });
    // 2. Pull from Supabase if already signed in
    await this._loadKnowledgeFromSupabase();
  }

  async _loadKnowledgeFromSupabase() {
    // Pull from Supabase — only if session is already available.
    // knowledge-sync.js owns the full startup sync via INITIAL_SESSION;
    // this is just a fast-path to populate the UI if we're already signed in.
    try {
      if (typeof supabaseClient === 'undefined') return;
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) return;

      const { data, error } = await supabaseClient
        .from('user_knowledge')
        .select('context_text, files')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error || !data) return;

      // Restore context text if the textarea is still empty
      if (data.context_text && !this.els.userContext.value.trim()) {
        this.els.userContext.value = data.context_text;
        this.toggleClearContextBtn();
      }

      // Restore files if cloud has them
      if (Array.isArray(data.files) && data.files.length > 0) {
        this.knowledgeFiles = data.files;
        chrome.storage.local.set({ knowledgeFiles: data.files });
        this.renderAllFiles();
        this.updateKnowledgeUsage();
      }
      // If cloud is empty but local has files, knowledge-sync.js INITIAL_SESSION
      // handler will push them — don't race with it here.
    } catch (err) {
      console.warn('[Knowledge] Failed to load from Supabase:', err);
    }
  }

  fileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    switch (ext) {
      case 'docx': return 'description';
      case 'md': case 'markdown': return 'code';
      case 'rtf': return 'article';
      default: return 'text_snippet';
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ══════════════════════════════════════════════════════════
  //  Settings Panel
  // ══════════════════════════════════════════════════════════
  async loadSettings() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
        this.settings = settings || {};
        if (this.settings.userContext) this.els.userContext.value = this.settings.userContext;
        this.toggleClearContextBtn();
        resolve();
      });
    });
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('#tab-bar .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });
    // Update tab content panels
    document.querySelectorAll('.tab-content').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
    // Side effects when switching to settings
    if (tabName === 'settings') {
      this.populateSettingsUI();
    }
  }

  populateSettingsUI() {
    document.getElementById('stt-language').value = this.settings.sttLanguage || 'en';
    document.getElementById('setting-web-grounding').checked = this.webGrounding;
    document.getElementById('setting-skeleton-loading').checked = this.skeletonLoading;

    // API Keys
    document.getElementById('setting-deepgram-key').value = this.settings.deepgramApiKey || '';
    document.getElementById('setting-openrouter-key').value = this.settings.openrouterApiKey || '';
    document.getElementById('setting-openrouter-model').value = this.settings.openrouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';

    document.getElementById('setting-theme').value = this.theme;
    document.getElementById('setting-speaker-label').value = this.settings.speakerLabel || '';
    document.getElementById('setting-show-transcript').checked = this.showTranscript;
    document.getElementById('setting-merge-lines').checked = this.mergeLines;
    document.getElementById('setting-auto-dismiss').checked = this.autoDismiss;
    document.getElementById('setting-bullet-mode').checked = this.bulletMode;
    document.getElementById('setting-strict-context').checked = this.strictContext;
    document.getElementById('setting-questions-only').checked = this.questionsOnly;

    // Persona & Prompt
    const personaEl = document.getElementById('setting-persona');
    const promptEl = document.getElementById('setting-system-prompt');
    if (personaEl) personaEl.value = this.settings.persona || 'interviewer';
    if (promptEl) promptEl.value = this.settings.systemPrompt || '';

    const styleVal = this.responseStyle;
    document.getElementById('setting-response-style').value = styleVal;
    document.getElementById('style-description').textContent = SideCueApp.STYLE_DESCRIPTIONS[styleVal];

    const lengthVal = this.responseLength;
    document.getElementById('setting-response-length').value = lengthVal;
    document.getElementById('length-description').textContent = SideCueApp.LENGTH_DESCRIPTIONS[lengthVal];

    const delayVal = parseFloat(this.settings.cueDelay) || 2.5;
    document.getElementById('setting-cue-delay').value = delayVal;
    document.getElementById('cue-delay-value').textContent = delayVal.toFixed(1) + 's';

    document.querySelectorAll('.md3-slider input[type="range"]').forEach(input => this.updateSliderFill(input));
    this.updateSessionLocks();

    // Fetch current keyboard shortcut from Chrome
    this.loadShortcutDisplay();
  }

  updateSliderFill(input) {
    const min = parseFloat(input.min);
    const max = parseFloat(input.max);
    const val = parseFloat(input.value);
    const pct = ((val - min) / (max - min)) * 100;
    const slider = input.closest('.md3-slider');
    if (slider) slider.style.setProperty('--fill', pct + '%');
  }

  updateSessionLocks() {
    const locked = this.isSessionActive;
    // Settings that require a session restart to take effect
    const ids = [
      'stt-language',          // STT connection params
    ];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.disabled = locked;
      const field = el.closest('.field');
      if (field) field.classList.toggle('field-locked', locked);
    });
  }

  collectSettings() {
    return {
      sttLanguage: document.getElementById('stt-language').value,
      webGrounding: document.getElementById('setting-web-grounding').checked,
      skeletonLoading: document.getElementById('setting-skeleton-loading').checked,
      deepgramApiKey: document.getElementById('setting-deepgram-key').value.trim(),
      openrouterApiKey: document.getElementById('setting-openrouter-key').value.trim(),
      openrouterModel: document.getElementById('setting-openrouter-model').value.trim(),
      theme: document.getElementById('setting-theme').value,
      speakerLabel: document.getElementById('setting-speaker-label').value.trim(),
      showTranscript: document.getElementById('setting-show-transcript').checked,
      mergeLines: document.getElementById('setting-merge-lines').checked,
      autoDismiss: document.getElementById('setting-auto-dismiss').checked,
      bulletMode: document.getElementById('setting-bullet-mode').checked,
      strictContext: document.getElementById('setting-strict-context').checked,
      questionsOnly: document.getElementById('setting-questions-only').checked,
      responseStyle: parseInt(document.getElementById('setting-response-style').value),
      responseLength: parseInt(document.getElementById('setting-response-length').value),
      cueDelay: parseFloat(document.getElementById('setting-cue-delay').value),
      persona: document.getElementById('setting-persona') ? document.getElementById('setting-persona').value : 'interviewer',
      systemPrompt: document.getElementById('setting-system-prompt') ? document.getElementById('setting-system-prompt').value : '',
    };
  }

  saveSettings() {
    const newSettings = this.collectSettings();
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: newSettings }, (response) => {
      if (response?.success) {
        Object.assign(this.settings, newSettings);
        // Push to running engine
        chrome.runtime.sendMessage({ type: 'UPDATE_ENGINE_SETTINGS', settings: newSettings });
        this.applyTheme();
        this.applyTranscriptVisibility();
      }
    });
  }

  initSettingsEvents() {
    // Settings auto-save on change
    document.getElementById('setting-cue-delay').addEventListener('input', (e) => {
      document.getElementById('cue-delay-value').textContent = parseFloat(e.target.value).toFixed(1) + 's';
    });
    document.getElementById('setting-response-style').addEventListener('input', (e) => {
      document.getElementById('style-description').textContent = SideCueApp.STYLE_DESCRIPTIONS[parseInt(e.target.value)] || '';
    });
    document.getElementById('setting-response-length').addEventListener('input', (e) => {
      document.getElementById('length-description').textContent = SideCueApp.LENGTH_DESCRIPTIONS[parseInt(e.target.value)] || '';
    });

    let settingsTimer = null;
    const autoSave = () => { clearTimeout(settingsTimer); settingsTimer = setTimeout(() => this.saveSettings(), 400); };

    document.querySelectorAll('#tab-settings select, #tab-settings input[type="checkbox"]')
      .forEach(el => el.addEventListener('change', () => this.saveSettings()));
    document.querySelectorAll('#tab-settings input[type="text"], #tab-settings input[type="password"], #tab-settings input[type="range"], #tab-settings textarea')
      .forEach(el => el.addEventListener('input', autoSave));

    document.querySelectorAll('.settings-accordion').forEach(details => {
      details.addEventListener('toggle', () => {
        if (details.open) {
          document.querySelectorAll('.settings-accordion').forEach(other => {
            if (other !== details) other.removeAttribute('open');
          });
        }
      });
    });

    document.querySelectorAll('.md3-slider input[type="range"]').forEach(input => {
      input.addEventListener('input', () => this.updateSliderFill(input));
    });

    document.querySelectorAll('.toggle-vis').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.getAttribute('data-target'));
        const icon = btn.querySelector('.material-symbols-outlined');
        if (input.type === 'password') { input.type = 'text'; icon.textContent = 'visibility_off'; }
        else { input.type = 'password'; icon.textContent = 'visibility'; }
      });
    });

    // Chrome shortcuts link — both rows share the .link-chrome-shortcuts class
    document.querySelectorAll('.link-chrome-shortcuts').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
      });
    });
  }

  loadShortcutDisplay() {
    chrome.commands.getAll((commands) => {
      const pauseCmd = commands.find(c => c.name === 'toggle-pause');
      const pauseKbd = document.getElementById('shortcut-pause-key');
      if (pauseKbd && pauseCmd) {
        pauseKbd.textContent = pauseCmd.shortcut || 'Not set';
      }
      const startCmd = commands.find(c => c.name === 'start-session');
      const startKbd = document.getElementById('shortcut-start-key');
      if (startKbd && startCmd) {
        startKbd.textContent = startCmd.shortcut || 'Not set';
      }
    });
  }

  // ══════════════════════════════════════════════════════════
  //  Auth
  // ══════════════════════════════════════════════════════════
  async initAuth() {
    // Standalone Mode: Always show signed-in state
    const signedOut = document.getElementById('auth-signed-out');
    const signedIn = document.getElementById('auth-signed-in');
    if (signedOut) signedOut.style.display = 'none';
    if (signedIn) signedIn.style.display = 'block';

    // Mock session data for UI
    document.getElementById('auth-user-name').textContent = 'Local User';
    document.getElementById('auth-user-email').textContent = 'Standalone Mode';
    document.getElementById('auth-tier-badge').textContent = 'Unlimited';
    
    // Hide usage row in standalone mode
    const usageRow = document.getElementById('auth-usage-row');
    if (usageRow) usageRow.style.display = 'none';

    console.log('AI-Take-Notes running in Standalone Mode (Auth bypassed)');
  }

  _showAuthError(msg) {
    const el = document.getElementById('auth-error');
    const ok = document.getElementById('auth-success');
    if (ok) ok.style.display = 'none';
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  _showAuthSuccess(msg) {
    const el = document.getElementById('auth-success');
    const err = document.getElementById('auth-error');
    if (err) err.style.display = 'none';
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }
  _hideAuthMessages() {
    const el = document.getElementById('auth-error');
    const ok = document.getElementById('auth-success');
    if (el) el.style.display = 'none';
    if (ok) ok.style.display = 'none';
  }

  async signInWithGoogle() {
    this._hideAuthMessages();

    try {
      const redirectUrl = chrome.identity.getRedirectURL();
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          skipBrowserRedirect: true,
          redirectTo: redirectUrl,
        },
      });

      if (error) { this._showAuthError(error.message); return; }

      if (data?.url) {
        // Use launchWebAuthFlow — works in dev (no published extension needed)
        // Chrome intercepts the redirect to chromiumapp.org internally
        const responseUrl = await chrome.identity.launchWebAuthFlow({
          url: data.url,
          interactive: true,
        });

        if (responseUrl) {
          console.log('[Auth] responseUrl:', responseUrl);

          // Try hash fragment first (implicit flow)
          const hash = responseUrl.split('#')[1] || '';
          const hashParams = new URLSearchParams(hash);
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');

          // Try query params (PKCE / code flow)
          const urlObj = new URL(responseUrl);
          const code = urlObj.searchParams.get('code');

          if (access_token) {
            await supabaseClient.auth.setSession({ access_token, refresh_token });
          } else if (code) {
            // Supabase sent an auth code — exchange it
            const { error: exchangeErr } = await supabaseClient.auth.exchangeCodeForSession(code);
            if (exchangeErr) this._showAuthError(exchangeErr.message);
          } else {
            console.error('[Auth] Unexpected redirect, no token or code. URL:', responseUrl);
            this._showAuthError('Authentication failed — unexpected redirect.');
          }
        }
      }
    } catch (err) {
      // User closed the popup or other error
      if (err.message?.includes('user rejected') || err.message?.includes('canceled')) return;
      this._showAuthError(err.message || 'Google sign-in failed');
    }
  }

  async signInWithEmail() {
    this._hideAuthMessages();
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
      this._showAuthError('Enter your email and password.');
      return;
    }

    const btn = document.getElementById('btn-email-signin');
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) {
        // Generic 'Invalid login credentials' — probe which provider the account uses
        // so we can give a more specific message
        if (error.message?.toLowerCase().includes('invalid login credentials') ||
            error.message?.toLowerCase().includes('invalid_credentials')) {
          await this._showSmartSignInError(email);
        } else {
          this._showAuthError(error.message);
        }
      }
    } catch (err) {
      this._showAuthError(err.message || 'Sign-in failed');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  }

  async _showSmartSignInError(email) {
    try {
      const resp = await fetch('https://unrkulfqflksywwzifmb.supabase.co/functions/v1/check-auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const { exists, providers } = await resp.json();

      if (!exists) {
        // No account — don't confirm to prevent enumeration, use neutral message
        this._showAuthError('Incorrect email or password.');
        return;
      }

      const hasPassword = providers.includes('email');
      const oauthProviders = providers.filter(p => p !== 'email');
      const providerLabel = oauthProviders[0] === 'google' ? 'Google'
        : oauthProviders[0] === 'github' ? 'GitHub'
        : oauthProviders[0] ? oauthProviders[0].charAt(0).toUpperCase() + oauthProviders[0].slice(1)
        : null;

      if (!hasPassword && providerLabel) {
        this._showAuthError(`This account uses ${providerLabel} sign-in. Use the “Continue with ${providerLabel}” button above.`);
      } else if (!hasPassword && oauthProviders.length > 0) {
        this._showAuthError('This account was created with a social login. Use the corresponding sign-in button above.');
      } else {
        // Has email/password but wrong password
        this._showAuthError('Incorrect password.');
      }
    } catch {
      // If the probe fails, fall back to generic message — don't block sign-in UX
      this._showAuthError('Incorrect email or password.');
    }
  }

  async signUpWithEmail() {
    this._hideAuthMessages();
    const email = document.getElementById('auth-email')?.value?.trim();
    const password = document.getElementById('auth-password')?.value;

    if (!email || !password) {
      this._showAuthError('Enter an email and password to create an account.');
      return;
    }
    if (password.length < 6) {
      this._showAuthError('Password must be at least 6 characters.');
      return;
    }

    const btn = document.getElementById('btn-email-signup');
    btn.disabled = true;

    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) {
        this._showAuthError(error.message);
      } else if (data?.user?.identities?.length === 0) {
        this._showAuthError('An account with this email already exists.');
      } else if (data?.session) {
        // Auto-confirmed — already signed in
      } else {
        this._showAuthSuccess('Check your email for a confirmation link.');
      }
    } catch (err) {
      this._showAuthError(err.message || 'Sign-up failed');
    } finally {
      btn.disabled = false;
    }
  }

  async resetPassword() {
    this._hideAuthMessages();
    const email = document.getElementById('auth-email')?.value?.trim();
    if (!email) {
      this._showAuthError('Enter your email address first.');
      return;
    }
    const btn = document.getElementById('btn-forgot-password');
    btn.disabled = true;
    btn.textContent = 'Sending…';
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
      if (error) {
        this._showAuthError(error.message);
      } else {
        this._showAuthSuccess('Password reset link sent — check your email.');
      }
    } catch (err) {
      this._showAuthError(err.message || 'Failed to send reset email');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Forgot password?';
    }
  }

  async signOut() {
    await supabaseClient.auth.signOut();
    this.updateAuthUI(null);
  }

  openUpgradePage() {
    chrome.tabs.create({ url: 'https://sidecue.app/pricing' });
  }

  openManageAccount() {
    chrome.tabs.create({ url: 'https://polar.sh/sidecue/portal/request' });
  }

  async updateAuthUI(session) {
    const signedOut = document.getElementById('auth-signed-out');
    const signedIn = document.getElementById('auth-signed-in');
    if (!signedOut || !signedIn) return;

    if (!session) {
      signedOut.style.display = '';
      signedIn.style.display = 'none';
      return;
    }

    signedOut.style.display = 'none';
    signedIn.style.display = '';
    this._hideAuthMessages();

    const user = session.user;
    const meta = user.user_metadata || {};

    const avatarUrl = meta.avatar_url || meta.picture || '';
    const avatarEl = document.getElementById('auth-avatar');
    const avatarFallback = document.getElementById('auth-avatar-fallback');
    
    if (avatarUrl) {
      avatarEl.src = avatarUrl;
      avatarEl.style.display = '';
      if (avatarFallback) avatarFallback.style.display = 'none';
    } else {
      avatarEl.style.display = 'none';
      if (avatarFallback) avatarFallback.style.display = 'flex';
    }
    
    document.getElementById('auth-user-name').textContent =
      meta.full_name || meta.name || user.email;
    document.getElementById('auth-user-email').textContent = user.email;

    // Tier & usage display — fetch from server
    this._loadTierAndUsage(user.id);
  }

  async _loadTierAndUsage(userId) {
    try {
      // Ensure sessionManager exists (may be called before a session starts)
      if (!this.sessionManager) {
        this.sessionManager = new SessionManager();
      }
      const data = await this.sessionManager.getAccountStatus();

      const tier = data.tier || 'free';
      const quota = data.quota_seconds || 3600;
      const remaining = data.remaining_seconds ?? 0;
      this._periodEnd = data.period_end || null;

      this.updateAuthUsageDisplay(remaining, quota, tier);
    } catch (err) {
      console.warn('[Auth] Failed to load tier/usage:', err);
      // Fallback display
      this.updateAuthUsageDisplay(0, 0, 'free');
    }
  }

  updateAuthUsageDisplay(remainingSeconds, quotaSeconds, tier) {
    const badge = document.getElementById('auth-tier-badge');
    if (badge) {
      const label = { free: 'Free', pro: 'Pro', power: 'Power' }[tier] || 'Free';
      badge.textContent = label;
      badge.className = 'auth-tier-badge tier-' + tier;
    }

    const usageFill = document.getElementById('auth-usage-fill');
    const usageLabel = document.getElementById('auth-usage-label');
    const usageReset = document.getElementById('auth-usage-reset');
    const quotaExceeded = document.getElementById('auth-quota-exceeded');
    const btnUpgrade = document.getElementById('btn-upgrade');
    const btnManage = document.getElementById('btn-manage-account');

    // Only show Manage button for paid subscribers
    const isPaid = tier !== 'free';
    if (btnManage) btnManage.style.display = isPaid ? '' : 'none';
    const actDivider = document.querySelector('.auth-actions-divider');
    if (actDivider) actDivider.style.display = isPaid ? '' : 'none';

    if (quotaSeconds > 0) {
      const used = quotaSeconds - remainingSeconds;
      const pct = Math.min((used / quotaSeconds) * 100, 100);
      if (usageFill) {
        usageFill.style.width = pct + '%';
        // Color the bar red when near/at limit
        usageFill.style.background = pct >= 100 ? 'var(--danger)' : pct >= 80 ? 'var(--warning)' : 'var(--accent)';
      }
      if (usageLabel) usageLabel.textContent = `${SessionManager.formatTime(used)} / ${SessionManager.formatTime(quotaSeconds)} used`;

      // Show reset date (based on user's billing cycle)
      if (usageReset) {
        if (this._periodEnd) {
          const resetDate = new Date(this._periodEnd);
          const resetStr = resetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          usageReset.textContent = `Resets ${resetStr}`;
        } else {
          usageReset.textContent = '';
        }
      }

      // Quota exceeded warning + upgrade button
      const exceeded = remainingSeconds <= 0;
      if (quotaExceeded) quotaExceeded.style.display = exceeded ? 'flex' : 'none';
      if (btnUpgrade) btnUpgrade.style.display = (exceeded || tier === 'free') ? 'flex' : 'none';
    } else {
      if (usageFill) usageFill.style.width = '0%';
      if (usageLabel) usageLabel.textContent = 'Loading...';
      if (usageReset) usageReset.textContent = '';
    }
  }

  // ── Util ─────────────────────────────────────────────────
  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ══════════════════════════════════════════════════════════
  //  Generative Features (Summary & Copilot)
  // ══════════════════════════════════════════════════════════

  async fetchFromOpenRouter(messages) {
    const key = this.settings.openrouterApiKey;
    const model = this.settings.openrouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
    if (!key) {
      throw new Error('OpenRouter API key is missing. Add it in Settings.');
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
        'HTTP-Referer': 'https://sidecue.app',
        'X-Title': 'AI-Take-Notes',
      },
      body: JSON.stringify({
        model: model,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'OpenRouter API error: ' + response.statusText);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  getTranscriptText() {
    const lines = Array.from(this.els.transcript.querySelectorAll('.transcript-line'));
    return lines.map(line => {
      const speaker = line.querySelector('.speaker')?.textContent || '';
      const text = line.querySelector('.transcript-text')?.textContent || '';
      return `${speaker}: ${text}`;
    }).join('\n');
  }

  async generateSummary() {
    if (!this.els.btnGenerateSummary) return;
    const transcriptText = this.getTranscriptText();
    if (!transcriptText || transcriptText.trim().length === 0) {
      this.showToast('No transcript available to summarize.', 'info');
      return;
    }

    this.els.btnGenerateSummary.disabled = true;
    this.els.btnGenerateSummary.innerHTML = '<span class="material-symbols-outlined cue-status-spin">sync</span> Generating...';

    try {
      const persona = this.settings.persona || 'interviewer';
      const customSysPrompt = this.settings.systemPrompt || '';
      let systemInstruction = `You are a helpful AI assistant. Generate a structured, comprehensive summary of the provided transcript.`;
      
      if (customSysPrompt) {
        systemInstruction += `\nAdditional Persona context: ${customSysPrompt}`;
      }
      
      const knowledge = this.getFullKnowledge();
      let userPrompt = `Please summarize the following meeting transcript.\nInclude Key Takeaways, Action Items, and Main Topics.\n\nTRANSCRIPT:\n${transcriptText}`;
      if (knowledge) {
        userPrompt += `\n\nADDITIONAL CONTEXT (Knowledge Base):\n${knowledge}`;
      }

      const summaryText = await this.fetchFromOpenRouter([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ]);

      if (this.els.summaryArea) {
        this.els.summaryArea.style.display = 'block';
        this.els.summaryContent.innerHTML = this.renderMarkdown(summaryText);
      }
    } catch (err) {
      this.showError('Summary failed: ' + err.message);
    } finally {
      this.els.btnGenerateSummary.disabled = false;
      this.els.btnGenerateSummary.innerHTML = '<span class="material-symbols-outlined">auto_awesome</span> Generate Summary';
    }
  }

  exportSummary() {
    if (!this.els.summaryContent) return;
    const text = this.els.summaryContent.innerText;
    if (!text) return;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const filename = `Sidecue_Summary_${new Date().toISOString().slice(0,10)}.txt`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Summary exported!', 'info');
  }

  async generateCopilotQuestions() {
    if (!this.els.btnRefreshSuggestions) return;
    const transcriptText = this.getTranscriptText();
    // Use last 10 lines for context to save tokens and stay relevant
    const lines = transcriptText.split('\n');
    const recentContext = lines.slice(Math.max(lines.length - 15, 0)).join('\n');
    
    if (!recentContext || recentContext.trim().length === 0) {
      return;
    }

    const btn = this.els.btnRefreshSuggestions;
    btn.classList.add('loading');
    
    try {
      const systemInstruction = `You are an AI meeting copilot. Based on the recent conversation transcript, suggest 3 concise, high-value follow-up questions or cues that the user could ask or bring up next. Respond ONLY with a JSON array of 3 strings. Example: ["What are the next steps?", "Can you clarify the timeline?", "Are there any blockers?"]`;
      
      const response = await this.fetchFromOpenRouter([
        { role: 'system', content: systemInstruction },
        { role: 'user', content: `Recent transcript:\n${recentContext}` }
      ]);
      
      // Parse JSON from response
      let questions = [];
      try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
        questions = JSON.parse(cleaned);
      } catch (e) {
        // Fallback parsing if LLM didn't return perfect JSON
        questions = response.split('\n')
          .filter(l => l.trim().length > 5)
          .map(l => l.replace(/^[-*0-9.)\s]+/, '').replace(/["']/g, ''))
          .slice(0, 3);
      }
      
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Could not parse questions.');
      }
      
      this.renderCopilotSuggestions(questions);
      
    } catch (err) {
      console.warn('Copilot Suggestions failed:', err);
    } finally {
      btn.classList.remove('loading');
    }
  }

  renderCopilotSuggestions(questions) {
    if (!this.els.suggestionsList) return;
    this.els.suggestionsList.innerHTML = '';
    
    questions.forEach(q => {
      const chip = document.createElement('div');
      chip.className = 'suggestion-chip';
      
      const text = document.createElement('span');
      text.className = 'suggestion-text';
      text.textContent = q;
      
      const copyBtn = document.createElement('button');
      copyBtn.className = 'icon-btn icon-btn-sm suggestion-copy';
      copyBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px;">content_copy</span>';
      copyBtn.title = 'Copy question';
      
      // Let user click chip to simulate generating an answer for this question
      // For now, let's just copy it or trigger an event
      chip.addEventListener('click', (e) => {
        if (e.target.closest('.suggestion-copy')) {
          navigator.clipboard.writeText(q);
          this.showToast('Question copied!', 'info');
        } else {
          // If they click the chip body, copy it too
          navigator.clipboard.writeText(q);
          this.showToast('Question copied!', 'info');
        }
      });
      
      chip.appendChild(text);
      chip.appendChild(copyBtn);
      this.els.suggestionsList.appendChild(chip);
    });
    
    if (this.els.copilotSuggestions) {
      this.els.copilotSuggestions.style.display = 'block';
    }
  }
  
  // Detect video platform from tab title or URL
  detectPlatform(tabTitle) {
    if (!tabTitle) return 'Other';
    const title = tabTitle.toLowerCase();
    
    if (title.includes('meet.google.com') || title.includes('google meet')) {
      return 'Google Meet';
    }
    if (title.includes('zoom.us') || title.includes('zoom meeting') || title.includes('zoom -')) {
      return 'Zoom';
    }
    if (title.includes('teams.microsoft.com') || title.includes('microsoft teams') || title.includes('| teams')) {
      return 'Microsoft Teams';
    }
    if (title.includes('webex.com') || title.includes('webex')) {
      return 'Webex';
    }
    if (title.includes('discord')) {
      return 'Discord';
    }
    if (title.includes('slack')) {
      return 'Slack';
    }
    
    return 'Other';
  }
}

// ── Boot ───────────────────────────────────────────────────
const app = new SideCueApp();
