import {
  app,
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
import { listMinimizedWindows, restoreWindowBehind } from '../../main/minimizedWindows';
import log from 'electron-log/main';

const RESTORE_WAIT_MS = 4000;
const RESTORE_POLL_MS = 200;

/** DXGI opens this in the game's process for as long as the game is in exclusive fullscreen. */
const DXGI_HELPER_WINDOW = 'D3DProxyWindow';

function pidForSource(sourceId: string): number {
  if (!sourceId.startsWith('window:')) return 0;
  const hwnd = Number(sourceId.split(':')[1]);
  return Number.isFinite(hwnd) ? getPidFromWindowHandle(hwnd) : 0;
}

async function fileIconDataUrl(path: string): Promise<string> {
  try {
    return (await app.getFileIcon(path)).toDataURL();
  } catch {
    return '';
  }
}

async function listMinimizedSources() {
  try {
    const windows = await listMinimizedWindows();
    return await Promise.all(
      windows.map(async ({ id, name, exePath }) => ({
        id,
        name,
        display_id: '',
        isScreen: false,
        isMinimized: true,
        appIcon: exePath ? await fileIconDataUrl(exePath) : '',
        thumbnail: '',
      })),
    );
  } catch (err) {
    log.warn('[capture] could not list minimized windows', err);
    return [];
  }
}

async function findSource(sourceId: string) {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 0, height: 0 },
  });
  return sources.find((s) => s.id === sourceId);
}

function nativeHandle(window: BrowserWindow): bigint {
  const handle = window.getNativeWindowHandle();
  return handle.length >= 8 ? handle.readBigUInt64LE() : BigInt(handle.readUInt32LE());
}

/** A minimized window cannot be captured, so it is restored, behind ours, before Chromium gets it. */
async function findOrRestoreSource(sourceId: string, mainWindow: BrowserWindow) {
  const listed = await findSource(sourceId);
  if (listed || !sourceId.startsWith('window:')) return listed;

  log.info('[capture] source not listed, restoring', sourceId);
  await restoreWindowBehind(sourceId, nativeHandle(mainWindow));
  const deadline = Date.now() + RESTORE_WAIT_MS;
  while (Date.now() < deadline) {
    const restored = await findSource(sourceId);
    if (restored) return restored;
    await new Promise((resolve) => setTimeout(resolve, RESTORE_POLL_MS));
  }
  return undefined;
}

/** Only null denies the request; the typings omit it and `{}` makes Electron throw. */
function denyDisplayMedia(callback: (streams: Electron.Streams) => void) {
  callback(null as unknown as Electron.Streams);
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
      return sources
        .filter((s) => s.name !== DXGI_HELPER_WINDOW)
        .map((s) => ({ id: s.id, name: s.name }));
    },
    listProcesses,
    resolvePid: pidForSource,
    isWindowOpen: (sourceId) => pidForSource(sourceId) !== 0,
    setSelectedSourceId: (id) => {
      selectedSourceId = id;
    },
    emit: (payload) => sendEvent(mainWindow, 'stream:sourceChanged', payload),
  });

  handle('stream:getSources', async () => {
    const [width, height] = mainWindow.getSize();
    const [sources, minimized] = await Promise.all([
      desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: width ?? 320, height: height ?? 180 },
        fetchWindowIcons: true,
      }),
      listMinimizedSources(),
    ]);
    const visible = sources.map((source) => ({
      ...source,
      isScreen: !!source.display_id,
      isMinimized: false,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : '',
      thumbnail: source.thumbnail ? source.thumbnail.toDataURL() : '',
    }));
    const visibleIds = new Set(visible.map((source) => source.id));
    return [...visible, ...minimized.filter((source) => !visibleIds.has(source.id))];
  });

  handle('stream:pickSource', async (sourceId: string) => {
    selectedSourceId = sourceId;
    void follower.onSourcePicked(sourceId);
  });

  handle('stream:setFollowApp', async (enabled: boolean) => follower.setEnabled(enabled));
  handle('stream:getFollowState', async () => follower.getState());
  handle('stream:resolveEndedSource', async () => follower.resolveEnded());
  handle('stream:releaseSource', async () => follower.stop());

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  session.defaultSession.setDisplayMediaRequestHandler(async (request, callback) => {
    log.info('[capture] display media request for', selectedSourceId);
    let source: Electron.DesktopCapturerSource | undefined;
    try {
      // Never substitute another source for a picked one: it can be a screen the user did not pick.
      source = selectedSourceId
        ? await findOrRestoreSource(selectedSourceId, mainWindow)
        : (await desktopCapturer.getSources({ types: ['window', 'screen'] }))[0];
    } catch (err) {
      log.error('[capture] could not resolve the source', err);
    }
    log.info('[capture] answering with', source?.name ?? 'nothing, source is unavailable');
    if (source) callback({ video: source });
    else denyDisplayMedia(callback);
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
