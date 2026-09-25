import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type ProcessInfo = { pid: number; ppid: number; name: string; createdAt: Date };
export type ProcessTable = Map<number, ProcessInfo>;

/** Large enough for a few thousand processes in CSV. */
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

/**
 * CreationDate is a CIM datetime; format it as ISO 8601 UTC on the PowerShell
 * side so the Node side is a plain `new Date(...)`. Vanguard-protected
 * processes hide ExecutablePath but still report ParentProcessId and
 * CreationDate, which is all the follower needs.
 */
const WINDOWS_QUERY = [
  'Get-CimInstance Win32_Process',
  "Select-Object ProcessId,ParentProcessId,Name,@{n='Created';e={ if ($_.CreationDate) { $_.CreationDate.ToUniversalTime().ToString('o') } else { '' } }}",
  'ConvertTo-Csv -NoTypeInformation',
].join(' | ');

/** Snapshot of every running process keyed by PID. Rejects if the OS tool fails. */
export function listProcesses(): Promise<ProcessTable> {
  return process.platform === 'win32' ? listWindows() : listPosix();
}

async function listWindows(): Promise<ProcessTable> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', WINDOWS_QUERY],
    { windowsHide: true, maxBuffer: MAX_OUTPUT_BYTES, timeout: TIMEOUT_MS },
  );
  return parseWindowsCsv(stdout);
}

/** Rows look like: "13916","24628","LeagueClientUx.exe","2026-09-25T11:11:47.4892360Z" */
const WINDOWS_ROW = /^"(\d+)","(\d+)","(.*)","(.*)"$/;

export function parseWindowsCsv(csv: string): ProcessTable {
  const table: ProcessTable = new Map();
  for (const line of csv.split(/\r?\n/)) {
    const match = WINDOWS_ROW.exec(line.trim());
    if (!match) continue; // header, blank line, or malformed row
    const [, pid, ppid, name, created] = match;
    const createdAt = created ? new Date(created) : new Date(0);
    table.set(Number(pid), {
      pid: Number(pid),
      ppid: Number(ppid),
      name: name ?? '',
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
    });
  }
  return table;
}

async function listPosix(): Promise<ProcessTable> {
  const { stdout } = await execFileAsync('ps', ['-axo', 'pid=,ppid=,lstart=,comm='], {
    maxBuffer: MAX_OUTPUT_BYTES,
    timeout: TIMEOUT_MS,
  });
  return parsePosixPs(stdout);
}

/**
 * Rows look like: " 4242  1 Thu Sep 25 11:06:02 2026 /Applications/Foo.app/Contents/MacOS/Foo"
 * lstart is always five whitespace-separated tokens. Unverified on mac/Linux.
 */
export function parsePosixPs(text: string): ProcessTable {
  const table: ProcessTable = new Map();
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 8) continue;
    const [pid, ppid, ...rest] = parts;
    const startText = rest.slice(0, 5).join(' ');
    const command = rest.slice(5).join(' ');
    const createdAt = new Date(startText);
    const name = command.split('/').pop() ?? command;
    table.set(Number(pid), {
      pid: Number(pid),
      ppid: Number(ppid),
      name,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt,
    });
  }
  return table;
}
