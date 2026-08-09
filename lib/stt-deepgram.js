// lib/stt-deepgram.js — Deepgram Real-time STT Provider (single channel)
//
// Single WebSocket connection streaming 16 kHz PCM16 from tab audio.
// All recognized speech is attributed to the "interviewer" (since we no
// longer capture mic input). Auto-reconnects on unexpected close.

class DeepgramProvider {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.language = config.language || 'en';
    this.onTranscript = config.onTranscript;
    this.onError = config.onError;
    this.onStatusChange = config.onStatusChange;

    this.ws = null;
    this.intentionalClose = false;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECTS = 5;
  }

  async connect() {
    this.intentionalClose = false;
    await this._openSocket();
    this.onStatusChange?.('connected');
  }

  _openSocket() {
    return new Promise((resolve, reject) => {
      const params = new URLSearchParams({
        model: 'nova-2',
        language: this.language,
        smart_format: 'true',
        interim_results: 'true',
        utterance_end_ms: '1500',
        vad_events: 'true',
        encoding: 'linear16',
        sample_rate: '16000',
        channels: '1',
      });

      const url = `wss://api.deepgram.com/v1/listen?${params}`;
      let ws;
      try {
        ws = new WebSocket(url, ['token', this.apiKey]);
      } catch (err) {
        reject(err);
        return;
      }

      let opened = false;

      ws.onopen = () => {
        opened = true;
        this.ws = ws;
        this.reconnectAttempts = 0;
        console.log('[Deepgram] Socket connected');
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'Results') {
            const alt = data.channel?.alternatives?.[0];
            if (alt && alt.transcript) {
              this.onTranscript?.({
                speaker: 'interviewer',
                text: alt.transcript,
                isFinal: data.is_final,
                confidence: alt.confidence,
                provider: 'deepgram',
              });
            }
          }
        } catch (err) {
          console.error('[Deepgram] Parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Deepgram] Socket error:', err);
        if (!opened) {
          // Failure during initial open — reject the connect promise
          reject(new Error('Deepgram connection failed'));
        } else {
          // Mid-stream error — surface but don't crash
          this.onError?.(new Error('Deepgram connection error'));
        }
      };

      ws.onclose = (event) => {
        console.log('[Deepgram] Socket closed:', event.code, event.reason);
        this.ws = null;

        if (this.intentionalClose) return;
        if (event.code === 1000) return;

        // Unexpected close — attempt reconnect with backoff, capped.
        if (this.reconnectAttempts < this.MAX_RECONNECTS) {
          this.reconnectAttempts++;
          const delay = Math.min(2000 * this.reconnectAttempts, 10000);
          this.onStatusChange?.('reconnecting');
          console.log(`[Deepgram] Reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
          setTimeout(() => {
            if (!this.intentionalClose) {
              this._openSocket().catch(err => {
                console.error('[Deepgram] Reconnect failed:', err);
                this.onError?.(err);
              });
            }
          }, delay);
        } else {
          this.onError?.(new Error('Deepgram connection lost (reconnect attempts exhausted)'));
        }
      };
    });
  }

  sendAudio(audioData) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    }
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.ws) {
      try { this.ws.close(1000, 'Session ended'); } catch {}
      this.ws = null;
    }
    this.onStatusChange?.('disconnected');
  }
}
