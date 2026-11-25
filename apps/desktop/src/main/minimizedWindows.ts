import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const MAX_OUTPUT_BYTES = 1024 * 1024;
const TIMEOUT_MS = 10_000;

export type MinimizedWindow = { id: string; name: string; exePath: string | null };

/** Same shape as desktopCapturer ids, so a restored window keeps the id it was picked by. */
const WINDOW_ID = /^window:(\d+):\d+$/;

const NATIVE_TYPES = `
Add-Type -TypeDefinition '
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class Win {
  delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint cmd);
  [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr h, int index);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h, int attr, out int value, int size);
  public class Info { public long Hwnd; public uint Pid; public string Title; }
  public static List<Info> Minimized() {
    var found = new List<Info>();
    EnumWindows((h, l) => {
      if (!IsWindowVisible(h) || !IsIconic(h)) return true;
      if (GetWindow(h, 4) != IntPtr.Zero) return true;        // GW_OWNER: dialogs and popups
      if ((GetWindowLong(h, -20) & 0x80) != 0) return true;   // WS_EX_TOOLWINDOW
      int cloaked;
      if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true;
      var title = new StringBuilder(512);
      if (GetWindowText(h, title, title.Capacity) == 0) return true;
      uint pid;
      GetWindowThreadProcessId(h, out pid);
      found.Add(new Info { Hwnd = h.ToInt64(), Pid = pid, Title = title.ToString() });
      return true;
    }, IntPtr.Zero);
    return found;
  }
}'
`;

const LIST_SCRIPT = `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
${NATIVE_TYPES}
$rows = @([Win]::Minimized() | ForEach-Object {
  $path = try { (Get-Process -Id $_.Pid).Path } catch { $null }
  [pscustomobject]@{ hwnd = $_.Hwnd; pid = $_.Pid; title = $_.Title; path = $path }
})
ConvertTo-Json -InputObject $rows -Compress
`;

/**
 * SW_SHOWNOACTIVATE (4) keeps the maximized state but takes no focus. The z-order is set on
 * both sides of it so the window opens behind ours instead of covering it.
 * 0x4013 = SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE | SWP_ASYNCWINDOWPOS.
 */
const restoreScript = (hwnd: string, behindHwnd: bigint) => `
$ErrorActionPreference = 'Stop'
${NATIVE_TYPES}
$h = [IntPtr]::new(${hwnd})
$behind = [IntPtr]::new(${behindHwnd})
if ([Win]::IsIconic($h)) {
  [void][Win]::SetWindowPos($h, $behind, 0, 0, 0, 0, 0x4013)
  [void][Win]::ShowWindowAsync($h, 4)
  [void][Win]::SetWindowPos($h, $behind, 0, 0, 0, 0, 0x4013)
}
`;

async function runPowerShell(script: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { windowsHide: true, maxBuffer: MAX_OUTPUT_BYTES, timeout: TIMEOUT_MS },
  );
  return stdout;
}

/** desktopCapturer omits minimized windows on Windows, so they are enumerated separately. */
export async function listMinimizedWindows(): Promise<MinimizedWindow[]> {
  if (process.platform !== 'win32') return [];
  const rows = JSON.parse(await runPowerShell(LIST_SCRIPT)) as {
    hwnd: number;
    pid: number;
    title: string;
    path: string | null;
  }[];
  return rows
    .filter((row) => row.pid !== process.pid)
    .map((row) => ({ id: `window:${row.hwnd}:0`, name: row.title, exePath: row.path }));
}

/**
 * Restores a window behind `behindHwnd` without activating it. Does nothing when the window
 * is not minimized or no longer exists.
 */
export async function restoreWindowBehind(sourceId: string, behindHwnd: bigint): Promise<void> {
  if (process.platform !== 'win32') return;
  const hwnd = WINDOW_ID.exec(sourceId)?.[1];
  if (hwnd) await runPowerShell(restoreScript(hwnd, behindHwnd));
}
