#!/usr/bin/env node
/**
 * Headless checks of the desktop app's application-following logic (Розділ 5).
 *
 * Bundles apps/desktop/src/main/{sourceFollower,processTable}.ts with esbuild,
 * replacing `electron-log/main` by a silent stub, and drives SourceFollower with
 * a scripted window list and process table — the same FollowerDeps the Electron
 * main process injects. Real timers are used (poll 1 500 ms, return wait 20 s),
 * so the run takes about half a minute. Window capture itself is NOT exercised.
 *
 * Usage: node thesis/tests/follower.mjs   (from the repository root, after pnpm install)
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const desktop = path.join(root, 'apps/desktop');
const fromVite = createRequire(createRequire(path.join(desktop, 'package.json')).resolve('vite'));
const esbuild = fromVite('esbuild');

const out = mkdtempSync(path.join(tmpdir(), 'follower-'));
const stub = path.join(out, 'log-stub.mjs');
writeFileSync(
  stub,
  'const noop = () => {}; export default { info: noop, warn: noop, error: noop };\n',
);
writeFileSync(
  path.join(out, 'entry.ts'),
  `export * from '${path.join(desktop, 'src/main/sourceFollower.ts')}';\n` +
    `export { listProcesses } from '${path.join(desktop, 'src/main/processTable.ts')}';\n`,
);
await esbuild.build({
  entryPoints: [path.join(out, 'entry.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: path.join(out, 'bundle.mjs'),
  alias: { 'electron-log/main': stub },
  logLevel: 'silent',
});
const { SourceFollower, POLL_INTERVAL_MS, listProcesses } = await import(
  pathToFileURL(path.join(out, 'bundle.mjs')).href
);

const results = [];
const check = (id, title, ok, detail) => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${title}${detail ? ` — ${detail}` : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A scripted desktop: windows (id → { name, pid }) and processes (pid → info). */
function world() {
  const t = (offsetMs) => new Date(Date.now() + offsetMs);
  const procs = new Map([
    [1, { pid: 1, ppid: 0, name: 'systemd', createdAt: t(-3_600_000) }],
    [10, { pid: 10, ppid: 1, name: 'explorer.exe', createdAt: t(-600_000) }],
    [100, { pid: 100, ppid: 10, name: 'LeagueClient.exe', createdAt: t(-60_000) }],
    [300, { pid: 300, ppid: 10, name: 'notepad.exe', createdAt: t(-30_000) }],
  ]);
  const windows = new Map([
    ['window:100:0', { name: 'League of Legends', pid: 100 }],
    ['window:10:0', { name: 'Explorer', pid: 10 }],
  ]);
  const events = [];
  let selected = null;
  const follower = new SourceFollower({
    listWindows: async () => [...windows].map(([id, w]) => ({ id, name: w.name })),
    listProcesses: async () => new Map(procs),
    resolvePid: (id) => windows.get(id)?.pid ?? 0,
    setSelectedSourceId: (id) => (selected = id),
    emit: (e) => events.push({ ...e, at: Date.now() }),
  });
  return { procs, windows, events, follower, t, selected: () => selected };
}
const waitFor = async (pred, ms) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (pred()) return true;
    await sleep(50);
  }
  return false;
};

// F0 — the real process table of this machine (Linux `ps`) feeds the follower.
{
  const table = await listProcesses();
  const self = table.get(process.pid);
  check(
    'Д1',
    'таблиця процесів ОС (ps)',
    !!self && self.ppid === process.ppid,
    `${table.size} процесів, власний PID знайдено з батьківським ${self?.ppid}`,
  );
}

// F1 — a shell window (explorer.exe) is never followed.
{
  const w = world();
  await w.follower.onSourcePicked('window:10:0');
  w.procs.set(400, { pid: 400, ppid: 10, name: 'calc.exe', createdAt: w.t(0) });
  w.windows.set('window:400:0', { name: 'Calculator', pid: 400 });
  await sleep(POLL_INTERVAL_MS * 2 + 200);
  check(
    'Д2',
    'вікно оболонки ОС не відстежується',
    w.events.length === 0,
    `подій: ${w.events.length}`,
  );
  w.follower.stop();
}

// F2–F4 — child window is followed, an unrelated one is not, then return to the anchor.
{
  const w = world();
  await w.follower.onSourcePicked('window:100:0');
  const t0 = Date.now();
  w.procs.set(200, { pid: 200, ppid: 100, name: 'League of Legends.exe', createdAt: w.t(500) });
  w.windows.set('window:200:0', { name: 'League of Legends (TM) Client', pid: 200 });
  const followed = await waitFor(() => w.events.some((e) => e.reason === 'follow'), 5000);
  const f = w.events.find((e) => e.reason === 'follow');
  check(
    'Д3',
    'перемикання на вікно дочірнього процесу',
    followed && f.sourceId === 'window:200:0' && w.selected() === 'window:200:0',
    f ? `через ${f.at - t0} мс` : 'немає події',
  );

  w.procs.set(500, { pid: 500, ppid: 300, name: 'helper.exe', createdAt: w.t(0) });
  w.windows.set('window:500:0', { name: 'Unrelated', pid: 500 });
  await sleep(POLL_INTERVAL_MS * 2 + 200);
  check(
    'Д4',
    'вікно стороннього процесу ігнорується',
    w.selected() === 'window:200:0' && w.events.length === 1,
  );

  const t1 = Date.now();
  w.windows.delete('window:200:0');
  w.procs.delete(200);
  const back = await waitFor(() => w.events.some((e) => e.reason === 'return'), 5000);
  const r = w.events.find((e) => e.reason === 'return');
  check(
    'Д5',
    'повернення до вихідного вікна',
    back && w.selected() === 'window:100:0',
    r ? `через ${r.at - t1} мс` : 'немає події',
  );
  w.follower.stop();
}

// F5 — following switched off: a child window does not change the source.
{
  const w = world();
  await w.follower.onSourcePicked('window:100:0');
  w.follower.setEnabled(false);
  w.procs.set(200, { pid: 200, ppid: 100, name: 'League of Legends.exe', createdAt: w.t(500) });
  w.windows.set('window:200:0', { name: 'Game', pid: 200 });
  await sleep(POLL_INTERVAL_MS * 2 + 200);
  check(
    'Д6',
    'вимкнене відстеження не змінює джерело',
    w.events.length === 0 && w.selected() === null,
  );
  w.follower.stop();
}

// F6 — child closes while the anchor window is gone: wait, then report `lost`.
{
  const w = world();
  await w.follower.onSourcePicked('window:100:0');
  w.procs.set(200, { pid: 200, ppid: 100, name: 'Game.exe', createdAt: w.t(500) });
  w.windows.set('window:200:0', { name: 'Game', pid: 200 });
  await waitFor(() => w.events.some((e) => e.reason === 'follow'), 5000);
  w.windows.delete('window:100:0');
  await sleep(POLL_INTERVAL_MS + 200);
  const t1 = Date.now();
  w.windows.delete('window:200:0');
  const lost = await waitFor(() => w.events.some((e) => e.reason === 'lost'), 30_000);
  const l = w.events.find((e) => e.reason === 'lost');
  check(
    'Д7',
    'вихідне вікно не повернулося — трансляцію втрачено',
    lost,
    l ? `через ${((l.at - t1) / 1000).toFixed(1)} с` : 'немає події',
  );
  w.follower.stop();
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
