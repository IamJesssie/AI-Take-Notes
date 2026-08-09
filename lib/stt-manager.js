// lib/stt-manager.js — Thin wrapper over the Deepgram provider.
//
// Kept as a separate class so the engine can stay provider-agnostic if we
// ever add a second STT backend. With tab-only capture there's no channel
// routing — sendAudio takes a single ArrayBuffer of PCM16.

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
    this.provider = new DeepgramProvider({
      onTranscript: this.callbacks.onTranscript,
      onError: this.callbacks.onError,
      onStatusChange: this.callbacks.onStatusChange,
      apiKey: this.apiKey,
      language: this.language,
    });
    await this.provider.connect();
  }

  sendAudio(audioData) {
    this.provider?.sendAudio(audioData);
  }

  disconnect() {
    this.provider?.disconnect();
    this.provider = null;
  }
}
