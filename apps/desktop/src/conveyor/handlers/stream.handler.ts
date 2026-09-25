import {
  BrowserWindow,
  desktopCapturer,
  MessageChannelMain,
  session,
  utilityProcess,
} from 'electron';
import { handle, sendEvent } from '../../main/shared';
import { join } from 'path';
import type { AudioWorkerInit, AudioWorkerStatus } from '../../audioWorker/messages';
import { getPidFromWindowHandle } from 'electron-native-screenshare';
import { SourceFollower } from '../../main/sourceFollower';
import { listProcesses } from '../../main/processTable';

/** `window:<hwnd>:0` / `screen:<id>:0` -> owning PID, 0 for screens or unknown handles. */
function pidForSource(sourceId: string): number {
  if (!sourceId.startsWith('window:')) return 0;
  const hwnd = Number(sourceId.split(':')[1]);
  return Number.isFinite(hwnd) ? getPidFromWindowHandle(hwnd) : 0;
}

export function registerStreamHandlers(mainWindow: BrowserWindow) {
  let selectedSourceId: string | null = null;

  const follower = new SourceFollower({
    listWindows: async () => {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 0, height: 0 },
        fetchWindowIcons: false,
      });
      return sources.map((s) => ({ id: s.id, name: s.name }));
    },
    listProcesses,
    resolvePid: pidForSource,
    setSelectedSourceId: (id) => {
      selectedSourceId = id;
    },
    emit: (payload) => sendEvent(mainWindow, 'stream:sourceChanged', payload),
  });

  handle('stream:getSources', async () => {
    const [width, height] = mainWindow.getSize();
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: width ?? 320, height: height ?? 180 },
      fetchWindowIcons: true,
    });
    return sources.map((source) => ({
      ...source,
      isScreen: !!source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : '',
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
    }));
  });

  handle('stream:pickSource', async (sourceId: string) => {
    selectedSourceId = sourceId;
    // Detached on purpose: the snapshot takes ~350 ms and the picker must not wait.
    void follower.onSourcePicked(sourceId);
  });

  handle('stream:setFollowApp', async (enabled: boolean) => follower.setEnabled(enabled));
  handle('stream:getFollowState', async () => follower.getState());
  handle('stream:resolveEndedSource', async () => follower.resolveEnded());
  handle('stream:releaseSource', async () => follower.stop());

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    const chosen = sources.find((s) => s.id === selectedSourceId);
    callback({ video: chosen ?? sources[0] });
  });

  let audioChild: Electron.UtilityProcess | null = null;

  handle('stream:startAudioCapture', async () => {
    if (audioChild || !selectedSourceId) return;
    const child = utilityProcess.fork(join(__dirname, 'audioWorker.js'));
    audioChild = child;
    const { port1, port2 } = new MessageChannelMain();

    const ready = new Promise<void>((resolve, reject) => {
      child.once('message', (status: AudioWorkerStatus) => {
        if (status.type === 'ready') resolve();
        else reject(new Error(status.error));
      });
      child.once('exit', (code) => {
        reject(new Error(`Audio worker exited with code ${code} before reporting ready`));
      });
    });

    const pid = pidForSource(selectedSourceId);

    const init: AudioWorkerInit = { type: 'init', processId: pid };
    child.postMessage(init, [port1]);

    try {
      await ready;
    } catch (err) {
      child.kill();
      port2.close();
      if (audioChild === child) audioChild = null;
      throw err;
    }

    mainWindow.webContents.postMessage('audio-port', null, [port2]);
  });

  handle('stream:stopAudioCapture', async () => {
    audioChild?.kill();
    audioChild = null;
  });
}
