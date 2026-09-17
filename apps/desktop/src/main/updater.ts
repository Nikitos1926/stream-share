import { app, dialog } from 'electron';
import log from 'electron-log/main';
import { autoUpdater } from 'electron-updater';

// Auto-updates are only wired up for Windows (NSIS) and Linux (AppImage).
// electron-updater refuses to install unsigned builds on macOS and we do not
// ship a signed/notarized app, so Mac users download new DMGs manually.
const UPDATES_SUPPORTED = process.platform === 'win32' || process.platform === 'linux';

let restartPromptShown = false;

export function setupAutoUpdater(): void {
  // Unpacked dev builds have no install to update; electron-updater would only
  // log "Skip checkForUpdates because application is not packed".
  if (!app.isPackaged || !UPDATES_SUPPORTED) return;

  // Main-process console output is lost in a packaged app, so route updater
  // logs to electron-log's file (%APPDATA%/<app>/logs/main.log on Windows,
  // ~/.config/<app>/logs/main.log on Linux) to make failed updates debuggable.
  log.initialize();
  autoUpdater.logger = log;

  // Download in the background and, if the user postpones the restart,
  // install silently the next time the app exits.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    if (restartPromptShown) return;
    restartPromptShown = true;

    void dialog
      .showMessageBox({
        type: 'info',
        title: 'Update ready',
        message: `Stream Share ${info.version} has been downloaded.`,
        detail: 'Restart now to apply the update, or it will be installed when you quit the app.',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) installUpdateNow();
      });
  });

  autoUpdater.on('error', (error) => {
    log.error('Auto-update failed:', error);
  });

  // A failed check (offline, GitHub down, release without latest.yml) both
  // emits 'error' and rejects this promise; the handler above already logged
  // it, so swallow the rejection to avoid an unhandled-rejection warning.
  autoUpdater.checkForUpdates().catch(() => undefined);
}

/**
 * Manual "Check for updates" entry point (tray menu). Reports the outcome to the
 * user, unlike the silent startup check.
 */
export async function checkForUpdatesInteractively(): Promise<void> {
  if (!app.isPackaged || !UPDATES_SUPPORTED) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Check for updates',
      message: 'Automatic updates are not available on this platform.',
      detail: 'Download the latest version from https://streamshare.space.',
    });
    return;
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result?.isUpdateAvailable) {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Check for updates',
        message: `You are on the latest version (${app.getVersion()}).`,
      });
    }
    // If an update is available it downloads in the background and the
    // 'update-downloaded' handler above prompts for a restart.
  } catch (error) {
    log.error('Manual update check failed:', error);
    await dialog.showMessageBox({
      type: 'error',
      title: 'Check for updates',
      message: 'Could not check for updates.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function installUpdateNow(): void {
  // The tray's window 'close' handler hides the window instead of closing it
  // unless this flag is set, which would leave quitAndInstall hanging.
  app.isQuitting = true;
  autoUpdater.quitAndInstall();
}
