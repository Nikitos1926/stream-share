import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'path';
import { registerAppHandlers } from '../conveyor/handlers/app.handler';
import { registerStreamHandlers } from '../conveyor/handlers/stream.handler';
import { registerWindowHandlers } from '../conveyor/handlers/window.handler';
import { registerResourcesProtocol } from './protocols';
import { resolveIcon } from '../utils';

const isDev = !app.isPackaged;

export function createAppWindow(): BrowserWindow {
  registerResourcesProtocol();

  Menu.setApplicationMenu(null);

  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 700,
    minHeight: 500,
    show: false,
    title: 'Stream Share',
    icon: resolveIcon('tray-icon'),
    maximizable: true,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev,
    },
  });

  registerWindowHandlers(mainWindow);
  registerAppHandlers(app);
  registerStreamHandlers(mainWindow);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  void mainWindow.loadURL(__WEB_URL__);

  return mainWindow;
}
