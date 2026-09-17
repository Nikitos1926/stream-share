import { app, BrowserWindow, Menu, nativeTheme, Tray } from 'electron';
import { resolveIcon } from '../utils';
import { checkForUpdatesInteractively } from './updater';

let tray: Tray | undefined;
export function createAppTray(mainWindow: BrowserWindow): Tray {
  tray = new Tray(resolveIcon('tray-icon'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open', click: () => mainWindow.show() },
    { label: 'Check for updates…', click: () => void checkForUpdatesInteractively() },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Stream Share');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow.isVisible()) return mainWindow.hide();
    mainWindow.show();
  });

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  if (process.platform !== 'darwin') {
    nativeTheme.on('updated', () => {
      tray?.setImage(resolveIcon('tray-icon'));
    });
  }

  return tray;
}
