/**
 * Deterministic check for the double-click guard on the desktop sign-in
 * (src/main/googleAuth.ts).
 *
 * The renderer disables the button, but the button is not the thing that must
 * not run twice: `shell.openExternal` is. So this drives the *real* main-process
 * module — bundled with Vite against a stub `electron`, the way electron-vite
 * builds it, with `__WEB_URL__` defined — and asserts that two overlapping
 * requests open one browser window, both callers get that one attempt's result,
 * and cancelling puts the flow back so the next click can open a new one.
 *
 * Run: `pnpm --filter @stream-share/desktop check:sign-in-guard`
 */

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_URL = 'https://sign-in-guard.test';

let failures = 0;

const check = (ok, what) => {
  if (!ok) failures += 1;
  console.log(`${ok ? 'OK   ' : 'FAIL '} ${what}`);
};

const delay = (ms) => new Promise((done) => setTimeout(done, ms));

/** The browser leg is asynchronous; poll instead of guessing a sleep length. */
const waitFor = async (predicate, what, timeoutMs = 5000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await delay(10);
  }
  throw new Error(`Timed out waiting for ${what}`);
};

/* ----------------------------------------------------------- the stub shell */

/** Every URL `shell.openExternal` was asked to open, in order. */
const opened = [];

globalThis.__openExternal = (url) => {
  opened.push(url);
  return Promise.resolve(true);
};

/**
 * A window that is already visible and focused, so `bringWindowToFront` stops
 * at its first step instead of running the escalation timers.
 */
const fakeWindow = {
  isDestroyed: () => false,
  isVisible: () => true,
  isMinimized: () => false,
  isFocused: () => true,
  isAlwaysOnTop: () => false,
  setAlwaysOnTop: () => {},
  show: () => {},
  restore: () => {},
  focus: () => {},
  flashFrame: () => {},
  once: () => {},
};

/* ------------------------------------------------- build the module under test */

const outDir = await mkdtemp(join(tmpdir(), 'sign-in-guard-'));
const electronStub = join(outDir, 'electron-stub.mjs');

await writeFile(
  electronStub,
  [
    'export const shell = { openExternal: (url) => globalThis.__openExternal(url) };',
    'export const app = { focus: () => {}, dock: undefined };',
    'export default { shell, app };',
    '',
  ].join('\n'),
);

await build({
  root,
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { electron: electronStub } },
  define: { __WEB_URL__: JSON.stringify(WEB_URL) },
  build: {
    outDir,
    emptyOutDir: false,
    minify: false,
    ssr: resolve(root, 'src/main/googleAuth.ts'),
    rollupOptions: { output: { format: 'es', entryFileNames: 'googleAuth.mjs' } },
  },
});

const { startGoogleSignIn, cancelGoogleSignIn } = await import(
  pathToFileURL(join(outDir, 'googleAuth.mjs')).href
);

/* ------------------------------------------ 1. two clicks, one browser window */

const first = startGoogleSignIn(fakeWindow);
const second = startGoogleSignIn(fakeWindow);

await waitFor(() => opened.length > 0, 'the account chooser to be opened');
// Anything a superseding second attempt would do happens within a few ticks of
// the first; give it room to go wrong before asserting that it did not.
await delay(100);

check(opened.length === 1, 'a double click opens exactly one browser window');

// The other half of the same bug: a click that lands *after* the browser is
// already up (a slow double click, Enter twice, a reloaded renderer). This is
// the one that used to open a second tab and strand the first attempt.
const late = startGoogleSignIn(fakeWindow);
await delay(100);
check(opened.length === 1, 'a click while the browser is already open opens no second one');

const handoff = new URL(opened[0]);
check(handoff.origin === WEB_URL, 'the browser is sent to the web app hand-off');

const port = handoff.searchParams.get('port');
const state = handoff.searchParams.get('state');

try {
  const callback = await fetch(`http://127.0.0.1:${port}/callback?state=${state}&code=the-code`);
  await callback.text();
} catch (error) {
  // A listener that is gone means the attempt the browser was sent to was torn
  // down behind the user's back — report it rather than hanging on a promise
  // that can no longer settle.
  check(false, `the listener the browser was sent to is still up (${error.message})`);
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}

const results = await Promise.all([first, second, late]);

check(results[0].status === 'success', 'the click that started the flow gets the code');
check(
  results.every((result) => result.code === 'the-code'),
  'every swallowed click sees the code the one browser window returned',
);
check(opened.length === 1, 'no second window was opened behind the completed flow');

/* --------------------------------- 2. a cancelled attempt can be retried once */

const cancelled = startGoogleSignIn(fakeWindow);
await waitFor(() => opened.length === 2, 'a second attempt to open the browser');

cancelGoogleSignIn();
check((await cancelled).status === 'cancelled', 'cancel ends the attempt in progress');

const retried = startGoogleSignIn(fakeWindow);
await waitFor(() => opened.length === 3, 'the retry to open the browser');
check(opened.length === 3, 'after a cancel the next click opens a window again');

const retryUrl = new URL(opened[2]);
check(
  retryUrl.searchParams.get('state') !== handoff.searchParams.get('state'),
  'the retry is a fresh attempt, not the cancelled one',
);

cancelGoogleSignIn();
await retried;

/* ------------------------- 3. a browser that cannot be opened frees the guard */

globalThis.__openExternal = () => Promise.reject(new Error('no browser here'));

const failed = await startGoogleSignIn(fakeWindow);
check(failed.status === 'error', 'a browser that will not open is reported as an error');

globalThis.__openExternal = (url) => {
  opened.push(url);
  return Promise.resolve(true);
};

const afterFailure = startGoogleSignIn(fakeWindow);
await waitFor(() => opened.length === 4, 'a new attempt after the failed one');
check(opened.length === 4, 'a failed attempt does not wedge the guard shut');

cancelGoogleSignIn();
await afterFailure;

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks OK.');
process.exit(failures ? 1 : 0);
