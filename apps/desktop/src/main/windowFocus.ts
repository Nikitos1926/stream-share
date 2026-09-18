import { app, type BrowserWindow } from 'electron';

/**
 * Bringing a window forward is a request, not a command. Windows and most Linux
 * window managers refuse focus to a process that did not just receive user
 * input — and after a browser sign-in the input went to the browser — while
 * macOS only raises windows of the app that is already frontmost. So this
 * escalates: plain show/restore/focus first, then a brief always-on-top toggle,
 * and if the window still has not come forward, the taskbar flash (dock bounce
 * on macOS), which every platform honours.
 *
 * The pin is always dropped again: a window left always-on-top would sit over
 * everything else for the rest of the session.
 *
 * Only call this for something the user just asked for and completed elsewhere
 * (a finished sign-in). A failed or cancelled attempt must not make windows
 * jump in front of whatever the user moved on to.
 */

/** How long the OS gets to honour focus() before the next step. */
const FOCUS_SETTLE_MS = 200;
/** Long enough for the window manager to act on the pin, short enough not to be seen. */
const ALWAYS_ON_TOP_MS = 250;

export function bringWindowToFront(window: BrowserWindow): void {
  if (window.isDestroyed()) return;

  // Closing the window hides it to the tray (see tray.ts), so "not visible" is
  // an ordinary state here, not a destroyed window.
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
  // flashFrame does nothing for a window on macOS; there the dock icon bounces.
  if (process.platform === 'darwin') {
    app.dock?.bounce('informational');
    return;
  }

  window.flashFrame(true);
  // Flashing has to be switched off explicitly, or the taskbar entry keeps
  // blinking after the user has come back.
  window.once('focus', () => {
    if (!window.isDestroyed()) window.flashFrame(false);
  });
}
