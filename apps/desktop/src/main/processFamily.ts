import type { ProcessInfo, ProcessTable } from './processTable';

/**
 * Processes that launch unrelated things. Walking parents stops *below* these,
 * otherwise every app on the machine would share explorer.exe as a root.
 */
const SHELL_NAMES = new Set([
  'explorer.exe',
  'services.exe',
  'wininit.exe',
  'svchost.exe',
  'system',
  'idle',
  'system idle process',
  'runtimebroker.exe',
  'sihost.exe',
  'launchd',
  'systemd',
  'init',
]);

/** PIDs 0..4 are the kernel/idle placeholders on Windows; treat them as boundaries too. */
const MIN_USER_PID = 5;

/**
 * A parent is always created before its child. A "parent" that is newer than
 * the child is a reused PID pointing at an unrelated process. `ps -o lstart`
 * has one-second resolution, hence the slack.
 */
const CLOCK_SLACK_MS = 2000;

function isBoundary(pid: number, name: string): boolean {
  return pid < MIN_USER_PID || SHELL_NAMES.has(name.toLowerCase());
}

function realParent(table: ProcessTable, child: ProcessInfo): ProcessInfo | undefined {
  const parent = table.get(child.ppid);
  if (!parent) return undefined;
  if (parent.createdAt.getTime() > child.createdAt.getTime() + CLOCK_SLACK_MS) return undefined;
  return parent;
}

/** True when `pid` is itself a shell/system process. Anchoring on one would make every launched app "family". */
export function isShellProcess(table: ProcessTable, pid: number): boolean {
  const info = table.get(pid);
  return !info || isBoundary(info.pid, info.name);
}

/**
 * The top-most ancestor of `pid` that is still part of the same application:
 * walk parents until the parent is missing, a boundary, or already visited
 * (PID reuse can make the table cyclic). Returns null if `pid` is unknown.
 *
 * League: LeagueClientUx.exe → LeagueClient.exe → RiotClientServices.exe (root),
 * because RiotClientServices' parent is explorer.exe.
 */
export function findFamilyRoot(table: ProcessTable, pid: number): number | null {
  let current = table.get(pid);
  if (!current) return null;
  const seen = new Set<number>([current.pid]);
  for (;;) {
    const parent = realParent(table, current);
    if (!parent || seen.has(parent.pid) || isBoundary(parent.pid, parent.name)) return current.pid;
    seen.add(parent.pid);
    current = parent;
  }
}

/** True when walking `pid`'s parents reaches `root` (or `pid` is `root`). */
export function isInFamily(table: ProcessTable, pid: number, root: number): boolean {
  const seen = new Set<number>();
  let current = table.get(pid);
  while (current && !seen.has(current.pid)) {
    if (current.pid === root) return true;
    seen.add(current.pid);
    current = realParent(table, current);
  }
  return false;
}
