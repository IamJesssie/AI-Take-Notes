// lib/stt-webspeech.js — Free Web Speech API STT Provider
// Works natively in Chrome with zero API keys and zero cost.

class WebSpeechProvider {
  constructor(config) {
    this.language = config.language || 'en-US';
    this.onTranscript = config.onTranscript;
    this.onError = config.onError;
    this.onStatusChange = config.onStatusChange;

    this.recognition = null;
    this.intentionalClose = false;
    this.restartTimer = null;
  }

  async connect() {
    this.intentionalClose = false;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Web Speech API is not supported in this browser.');
    }

    this._startRecognition();
    this.onStatusChange?.('connected');
    console.log('[WebSpeech] Speech recognition initialized successfully');
  }

  _startRecognition() {
    if (this.intentionalClose) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      if (this.recognition) {
        try { this.recognition.abort(); } catch (e) {}
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = this.language.includes('-') ? this.language : `${this.language}-US`;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript?.trim();
          if (!text || text.length < 2) continue;

          this.onTranscript?.({
            speaker: 'interviewer',
            text: text,
            isFinal: result.isFinal,
            confidence: result[0]?.confidence || 0.9,
            provider: 'webspeech'
          });
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') {
          return;
        }
        console.warn('[WebSpeech] Recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          this.onError?.(new Error('Microphone permission denied for Web Speech'));
        }
      };

      this.recognition.onend = () => {
        if (!this.intentionalClose) {
          clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (!this.intentionalClose) {
              this._startRecognition();
            }
          }, 300);
        }
      };

      this.recognition.start();
    } catch (err) {
      console.warn('[WebSpeech] Start error:', err.message);
    }
  }

  sendAudio(audioData) {
    // Web Speech API receives audio via browser device
  }

  disconnect() {
    this.intentionalClose = true;
    clearTimeout(this.restartTimer);
    if (this.recognition) {
      try { this.recognition.abort(); } catch (e) {}
      this.recognition = null;
    }
    this.onStatusChange?.('disconnected');
  }
}
