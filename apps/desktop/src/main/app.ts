import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'path';
import { registerAppHandlers } from '../conveyor/handlers/app.handler';
import { registerAuthHandlers } from '../conveyor/handlers/auth.handler';
import { registerStreamHandlers } from '../conveyor/handlers/stream.handler';
import { registerWindowHandlers } from '../conveyor/handlers/window.handler';
import { resolveIcon } from '../utils';

const isDev = !app.isPackaged;

const WEB_ORIGIN = new URL(__WEB_URL__).origin;

function parseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

export function createAppWindow(): BrowserWindow {
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
  registerAuthHandlers(mainWindow);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    void shell.openExternal(details.url);
    return { action: 'deny' };
  });

  const keepInBrowser = (event: Electron.Event, url: string) => {
    const target = parseUrl(url);
    if (target?.origin === WEB_ORIGIN) return;
    event.preventDefault();
    if (target && (target.protocol === 'https:' || target.protocol === 'http:')) {
      void shell.openExternal(target.href);
    }
  };

  mainWindow.webContents.on('will-navigate', keepInBrowser);
  mainWindow.webContents.on('will-redirect', keepInBrowser);

  void mainWindow.loadURL(__WEB_URL__);

  return mainWindow;
}
