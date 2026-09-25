import type { ProcessInfo, ProcessTable } from './processTable';

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

const MIN_USER_PID = 5;

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

export function isShellProcess(table: ProcessTable, pid: number): boolean {
  const info = table.get(pid);
  return !info || isBoundary(info.pid, info.name);
}

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
