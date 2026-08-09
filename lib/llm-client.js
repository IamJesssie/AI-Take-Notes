// lib/llm-client.js — Standalone LLM Client for OpenRouter
// Now calls OpenRouter directly using the user's API key.

class LLMClient {
  constructor(config = {}) {
    this.abortController = null;
    this.apiKey = config.apiKey || null;
    this.model = config.model || 'google/gemini-2.0-flash-lite-preview-02-05:free';
  }

  // ── Set config (passed from engine) ───────────
  setConfig(settings) {
    this.apiKey = settings.openrouterApiKey;
    this.model = settings.openrouterModel || 'google/gemini-2.0-flash-lite-preview-02-05:free';
  }

  // ── Generate Cue from Transcript ──────────────────────────
  async generateCue({ transcript, recentSpeech, userContext, responseStyle, responseLength, questionsOnly, bulletMode, strictContext, onChunk, onDone, onError }) {
    this.abort();
    this.abortController = new AbortController();

    if (!this.apiKey) {
      onError?.(new Error('OpenRouter API Key missing. Please add it in Settings.'));
      return;
    }

    try {
      const systemPrompt = this._buildSystemPrompt({ 
        userContext, responseStyle, responseLength, questionsOnly, bulletMode, strictContext 
      });

      const userMessage = `TRANSCRIPT SO FAR:\n${transcript}\n\nRECENT SPEECH (most important):\n${recentSpeech}`;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://sidecue.app', // Required by OpenRouter
          'X-Title': 'Sidecue Standalone',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          stream: true,
          temperature: 0.4,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error('[LLM] OpenRouter error:', response.status, errBody);
        throw new Error(`Cue generation failed (${response.status}): ${errBody}`);
      }

      await this._processStream(response.body, onChunk, onDone, onError);

    } catch (err) {
      if (err.name === 'AbortError') return;
      onError?.(err);
    }
  }

  _buildSystemPrompt({ userContext, responseStyle, responseLength, questionsOnly, bulletMode, strictContext }) {
    const styleMap = {
      1: 'Short, relaxed, and conversational with contractions.',
      2: 'Warm, approachable, and friendly.',
      3: 'Natural, polished, and professional.',
      4: 'Structured, metrics-forward, and authoritative.',
      5: 'Strategic, executive-level, and leadership-focused.',
    };

    const lengthMap = {
      1: 'Keep it very brief (1-2 sentences).',
      2: 'Moderate depth (3-4 sentences).',
      3: 'Detailed and comprehensive.',
    };

    let prompt = `You are the user's secret "inner voice" during an interview or meeting. 
Your goal is to provide ready-to-speak, FIRST-PERSON answers that the user can read out loud naturally.

CORE DIRECTIVES:
1. ALWAYS use first-person ("I", "me", "my", "we"). Never say "The speaker asked..." or "You should say...".
2. Sound like a HUMAN, not an AI. Use natural transitions and professional vocabulary.
3. ADOPT THE PERSONA: Speak as if you ARE the person in the meeting using the provided background.
4. If a question is detected in the transcript, provide the direct answer immediately.
5. ${styleMap[responseStyle] || styleMap[3]}
6. ${lengthMap[responseLength] || lengthMap[2]}
7. ${bulletMode ? 'Use concise talking points if helpful, but keep the language speakable.' : 'Use natural, spoken paragraph form.'}
8. ${questionsOnly ? 'Focus ONLY on answering the specific questions asked.' : 'Provide helpful notes or answers based on the flow.'}
9. ${strictContext ? 'Use ONLY the provided background information to answer.' : 'Use the provided info as your primary source, supplemented by general professional knowledge.'}

IF NO HELP IS NEEDED or no question is active, respond ONLY with [NO_CUE].

USER'S PROFESSIONAL BACKGROUND (YOUR IDENTITY):
${userContext || 'No specific background provided. Use general professional expertise.'}`;

    return prompt;
  }

  // ── SSE Stream Processor (OpenAI format via OpenRouter) ──
  async _processStream(body, onChunk, onDone, onError) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onChunk?.(content);
            }
          } catch (e) {
            console.warn('[LLM] SSE parse error:', e.message);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (fullText.trim().includes('[NO_CUE]')) {
      onDone?.(''); // Signal no cue
    } else {
      onDone?.(fullText);
    }
  }

  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
