/**
 * Renderer side of the desktop system-audio pipeline.
 *
 * The Electron main process forks a utility process that captures system audio
 * natively and hands this window one end of a MessageChannel (see
 * apps/desktop/src/conveyor/handlers/stream.handler.ts). The preload relays that
 * port with window.postMessage('audio-port-ready'). Here the port is wired into
 * an AudioWorklet that turns the raw PCM into a MediaStreamTrack.
 */

let captureInit: Promise<MediaStreamTrack> | null = null;
let resolvedCtx: AudioContext | null = null;

const PORT_TIMEOUT_MS = 10_000;

function waitForPort(): Promise<MessagePort> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Timed out waiting for the desktop audio port'));
    }, PORT_TIMEOUT_MS);

    function handler(event: MessageEvent) {
      if (event.data !== 'audio-port-ready') return;
      clearTimeout(timer);
      window.removeEventListener('message', handler);
      const [port] = event.ports;
      if (port) resolve(port);
      else reject(new Error('Desktop audio port message carried no port'));
    }

    window.addEventListener('message', handler);
  });
}

async function startCapture(): Promise<MediaStreamTrack> {
  // Arm the listener before asking main to start: the port can be delivered
  // before the invoke promise resolves. Promise.all also swallows the port
  // timeout if main rejects first, so no rejection goes unhandled.
  const portPromise = waitForPort();
  const [, port] = await Promise.all([window.conveyor!.stream.startAudioCapture(), portPromise]);

  const ctx = new AudioContext();
  try {
    await ctx.audioWorklet.addModule('/pcm-source-processor.js');
    const workletNode = new AudioWorkletNode(ctx, 'pcm-source-processor', {
      numberOfInputs: 0,
      outputChannelCount: [2],
    });
    const dest = ctx.createMediaStreamDestination();
    workletNode.connect(dest);
    port.onmessage = (e: MessageEvent<{ ab: ArrayBuffer }>) =>
      workletNode.port.postMessage(e.data, [e.data.ab]);

    resolvedCtx = ctx;
    return dest.stream.getAudioTracks()[0]!;
  } catch (err) {
    port.close();
    void ctx.close();
    throw err;
  }
}

/**
 * Single entry point for desktop audio. Safe to call any number of times (first
 * source pick, changeSource, re-render): the IPC request is sent once per
 * capture session and every caller receives the same resolved track. A failed
 * attempt tears the session down and rejects, so the next call retries.
 */
export function ensureAudioCapture(): Promise<MediaStreamTrack> {
  if (!captureInit) {
    captureInit = startCapture().catch((err: unknown) => {
      teardownAudioCapture();
      throw err;
    });
  }
  return captureInit;
}

export function teardownAudioCapture() {
  void window.conveyor?.stream.stopAudioCapture();
  void resolvedCtx?.close();
  resolvedCtx = null;
  captureInit = null;
}
