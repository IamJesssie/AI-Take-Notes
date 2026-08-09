// lib/pcm-worklet.js — AudioWorklet processor for downsample + PCM16 conversion
//
// Receives input frames (Float32, mono, at AudioContext's sample rate),
// downsamples to 16 kHz using a simple linear-interpolation resampler,
// converts to 16-bit signed PCM, and posts ArrayBuffer chunks back to the
// main thread for streaming to Deepgram.
//
// AudioWorkletProcessor runs on the audio thread (no main-thread jank),
// receives frames in 128-sample blocks (~2.7 ms at 48 kHz), and is the
// modern replacement for the deprecated ScriptProcessorNode.

class PCMDownsamplerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Target sample rate for STT
    this.targetRate = (options && options.processorOptions && options.processorOptions.targetRate) || 16000;
    // Send a chunk roughly this often, in target-rate samples.
    // 4096 samples @ 16 kHz = 256 ms — matches the old ScriptProcessor cadence.
    this.chunkSize = (options && options.processorOptions && options.processorOptions.chunkSize) || 4096;

    // Resampler state. Each input frame contributes (targetRate / sampleRate)
    // output samples on average. We accumulate a fractional read position and
    // emit one output sample per integer step. `sampleRate` is a globalThis
    // property available inside AudioWorklets.
    this.sampleRatio = this.targetRate / sampleRate;
    this.readPos = 0;
    this.lastInputSample = 0;

    // Output buffer — fills up to chunkSize, then ships
    this.outBuffer = new Int16Array(this.chunkSize);
    this.outIndex = 0;

    // For RMS level reporting (cheap, computed per chunk)
    this.levelAccumulator = 0;
    this.levelSampleCount = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];
    if (!channel || channel.length === 0) return true;

    // Linear-interpolating downsampler. readPos walks the input array in
    // fractional steps of (sampleRate / targetRate). Whenever it advances
    // past an integer boundary, we emit an output sample.
    const step = 1 / this.sampleRatio; // input samples per output sample
    let p = this.readPos;

    while (p < channel.length) {
      const i = Math.floor(p);
      const frac = p - i;
      const a = i === 0 ? this.lastInputSample : channel[i - 1];
      const b = channel[i];
      const sample = a + (b - a) * frac;

      // Clamp and convert to PCM16
      const clamped = Math.max(-1, Math.min(1, sample));
      this.outBuffer[this.outIndex++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

      // Accumulate squared sample for RMS level
      this.levelAccumulator += sample * sample;
      this.levelSampleCount++;

      if (this.outIndex >= this.chunkSize) {
        this._flush();
      }
      p += step;
    }

    // Save tail state for next process() call
    this.lastInputSample = channel[channel.length - 1];
    this.readPos = p - channel.length;

    return true;
  }

  _flush() {
    // Copy into a new ArrayBuffer (the posted buffer is transferred/detached)
    const out = new Int16Array(this.outIndex);
    out.set(this.outBuffer.subarray(0, this.outIndex));

    const level = this.levelSampleCount > 0
      ? Math.sqrt(this.levelAccumulator / this.levelSampleCount)
      : 0;

    this.port.postMessage(
      { type: 'pcm', buffer: out.buffer, level },
      [out.buffer]
    );

    this.outIndex = 0;
    this.levelAccumulator = 0;
    this.levelSampleCount = 0;
  }
}

registerProcessor('pcm-downsampler', PCMDownsamplerProcessor);
