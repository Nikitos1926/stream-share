import {
  AudioDataCallback,
  getLoadError,
  isAvailable,
  startCapture,
} from 'electron-native-screenshare';
import type { AudioWorkerInit, AudioWorkerStatus } from './messages';

/**
 * Runs in an Electron utility process. Receives one end of a MessageChannel
 * from main, starts native system-audio capture and forwards every PCM buffer
 * over that port to the renderer (see apps/web/src/lib/media/audio.bridge.ts).
 *
 * Reports 'ready' or 'error' back to main so the renderer is only ever handed a
 * port that will actually carry audio.
 */

const report = (status: AudioWorkerStatus) => process.parentPort.postMessage(status);

process.parentPort.once('message', (e) => {
  const { processId } = e.data as AudioWorkerInit;
  const port = e.ports[0];
  if (!port) {
    report({ type: 'error', error: 'Expected a MessagePort in ports[0]' });
    return;
  }

  if (!isAvailable()) {
    report({
      type: 'error',
      error: getLoadError() ?? 'Native audio capture module is unavailable',
    });
    return;
  }

  try {
    const startCaptureCallback: AudioDataCallback = (audioData, meta) => {
      const ab = audioData.buffer.slice(
        audioData.byteOffset,
        audioData.byteOffset + audioData.byteLength,
      );
      port.postMessage({ ab, meta });
    };
    const args: [number, boolean, AudioDataCallback] = processId
      ? [processId, true, startCaptureCallback]
      : [process.pid, false, startCaptureCallback];

    port.start();
    const started = startCapture(...args);
    if (!started) throw new Error('startCapture() returned false');
    report({ type: 'ready' });
  } catch (err) {
    report({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
});
