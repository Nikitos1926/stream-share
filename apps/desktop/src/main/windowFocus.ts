import { app, type BrowserWindow } from 'electron';

/** How long the OS gets to honour focus() before the next step. */
const FOCUS_SETTLE_MS = 200;
/** Long enough for the window manager to act on the pin, short enough not to be seen. */
const ALWAYS_ON_TOP_MS = 250;

export function bringWindowToFront(window: BrowserWindow): void {
  if (window.isDestroyed()) return;

  if (!window.isVisible()) window.show();
  if (window.isMinimized()) window.restore();
  window.focus();
  if (process.platform === 'darwin') app.focus({ steal: true });

  setTimeout(() => forceToFront(window), FOCUS_SETTLE_MS);
}

/** Second attempt, for the platforms that quietly ignored the first one. */
function forceToFront(window: BrowserWindow): void {
  if (window.isDestroyed() || window.isFocused()) return;

  const wasAlwaysOnTop = window.isAlwaysOnTop();
  if (!wasAlwaysOnTop) window.setAlwaysOnTop(true);
  window.show();
  window.focus();

  setTimeout(() => {
    if (window.isDestroyed()) return;
    if (!wasAlwaysOnTop) window.setAlwaysOnTop(false);
    if (!window.isFocused()) flashForAttention(window);
  }, ALWAYS_ON_TOP_MS);
}

/** Last resort: point at the app in the taskbar/dock instead of doing nothing. */
function flashForAttention(window: BrowserWindow): void {
  if (process.platform === 'darwin') {
    app.dock?.bounce('informational');
    return;
  }

  window.flashFrame(true);
  window.once('focus', () => {
    if (!window.isDestroyed()) window.flashFrame(false);
  });
}
