const MAX_BUFFERED_SECONDS = 1;

class PcmSourceProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    /** @type {Float32Array[][]} queued chunks, each an array of per-channel planes */
    this.chunks = [];
    /** frames already consumed from chunks[0] */
    this.readOffset = 0;
    /** total unconsumed frames across all chunks */
    this.buffered = 0;
    this.port.onmessage = (event) => this.enqueue(event.data);
  }

  enqueue({ ab, meta }) {
    let planes = toPlanarFloat(ab, meta);
    if (meta.sampleRate !== sampleRate) {
      planes = planes.map((plane) => resampleLinear(plane, meta.sampleRate, sampleRate));
    }
    const frames = planes[0]?.length ?? 0;
    if (!frames) return;

    this.chunks.push(planes);
    this.buffered += frames;

    const maxFrames = MAX_BUFFERED_SECONDS * sampleRate;
    while (this.buffered > maxFrames && this.chunks.length > 1) {
      this.buffered -= this.chunks[0][0].length - this.readOffset;
      this.chunks.shift();
      this.readOffset = 0;
    }
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    let written = 0;

    while (written < frames && this.chunks.length) {
      const chunk = this.chunks[0];
      const available = chunk[0].length - this.readOffset;
      const count = Math.min(available, frames - written);

      for (let c = 0; c < output.length; c++) {
        // Mono capture feeds every output channel; extra capture channels are dropped.
        const plane = chunk[Math.min(c, chunk.length - 1)];
        output[c].set(plane.subarray(this.readOffset, this.readOffset + count), written);
      }

      written += count;
      this.readOffset += count;
      this.buffered -= count;
      if (this.readOffset >= chunk[0].length) {
        this.chunks.shift();
        this.readOffset = 0;
      }
    }

    // Output buffers arrive zeroed each quantum, so an underrun is already silence.
    return true;
  }
}

function toPlanarFloat(ab, { channels, bitsPerSample, isFloat }) {
  const interleaved = readSamples(ab, bitsPerSample, isFloat);
  const frames = Math.floor(interleaved.length / channels);
  const planes = [];
  for (let c = 0; c < channels; c++) {
    const plane = new Float32Array(frames);
    for (let i = 0; i < frames; i++) plane[i] = interleaved[i * channels + c];
    planes.push(plane);
  }
  return planes;
}

function readSamples(ab, bitsPerSample, isFloat) {
  const bytes = bitsPerSample / 8;
  const length = Math.floor(ab.byteLength / bytes);
  if (isFloat) {
    if (bitsPerSample === 32) return new Float32Array(ab, 0, length);
    if (bitsPerSample === 64) return Float32Array.from(new Float64Array(ab, 0, length));
  } else {
    if (bitsPerSample === 16) {
      return Float32Array.from(new Int16Array(ab, 0, length), (v) => v / 0x8000);
    }
    if (bitsPerSample === 32) {
      return Float32Array.from(new Int32Array(ab, 0, length), (v) => v / 0x80000000);
    }
    if (bitsPerSample === 8) {
      return Float32Array.from(new Uint8Array(ab, 0, length), (v) => (v - 128) / 128);
    }
  }
  throw new Error(`Unsupported PCM format: ${bitsPerSample}-bit ${isFloat ? 'float' : 'integer'}`);
}

function resampleLinear(input, fromRate, toRate) {
  const outLength = Math.round((input.length * toRate) / fromRate);
  const output = new Float32Array(outLength);
  const step = fromRate / toRate;
  const last = input.length - 1;
  for (let i = 0; i < outLength; i++) {
    const pos = i * step;
    const i0 = Math.min(Math.floor(pos), last);
    const i1 = Math.min(i0 + 1, last);
    const t = pos - i0;
    output[i] = input[i0] + (input[i1] - input[i0]) * t;
  }
  return output;
}

registerProcessor('pcm-source-processor', PcmSourceProcessor);
