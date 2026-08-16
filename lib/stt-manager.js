// lib/stt-manager.js — Provider manager supporting Deepgram & Free WebSpeech fallback

class STTManager {
  constructor(config) {
    this.callbacks = {
      onTranscript: config.onTranscript,
      onError: config.onError,
      onStatusChange: config.onStatusChange,
    };
    this.language = config.language || 'en';
    this.apiKey = config.deepgramApiKey;
    this.provider = null;
  }

  async connect() {
    // If user provided a custom Deepgram key, attempt Deepgram first
    const hasCustomKey = this.apiKey && this.apiKey.trim().length > 10;

    if (hasCustomKey) {
      try {
        console.log('[STT] Connecting to Deepgram...');
        this.provider = new DeepgramProvider({
          onTranscript: this.callbacks.onTranscript,
          onError: (err) => {
            console.warn('[STT] Deepgram error, falling back to WebSpeech:', err.message);
            this._fallbackToWebSpeech();
          },
          onStatusChange: this.callbacks.onStatusChange,
          apiKey: this.apiKey.trim(),
          language: this.language,
        });
        await this.provider.connect();
        return;
      } catch (err) {
        console.warn('[STT] Deepgram connection failed, activating WebSpeech fallback:', err.message);
      }
    }

    // Default & Fallback: Web Speech API (100% Free, Zero API Keys)
    this._fallbackToWebSpeech();
  }

  _fallbackToWebSpeech() {
    try {
      this.provider?.disconnect();
      this.provider = new WebSpeechProvider({
        onTranscript: this.callbacks.onTranscript,
        onError: this.callbacks.onError,
        onStatusChange: this.callbacks.onStatusChange,
        language: this.language,
      });
      this.provider.connect();
      console.log('[STT] WebSpeech provider active');
    } catch (e) {
      console.error('[STT] WebSpeech fallback failed:', e);
      this.callbacks.onError?.(e);
    }
  }

  sendAudio(audioData) {
    this.provider?.sendAudio(audioData);
  }

  disconnect() {
    this.provider?.disconnect();
    this.provider = null;
  }
}
