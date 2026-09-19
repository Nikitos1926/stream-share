/**
 * Rebuilds `electron-native-screenshare` against the installed Electron ABI.
 *
 * Run as this package's `postinstall`, which means it runs during *every*
 * workspace install — including installs by someone who will never open the
 * desktop app. The module compiles against PipeWire, PulseAudio and X11 headers
 * on Linux, so on a machine without them the rebuild fails, and a failing
 * lifecycle script aborts the whole `pnpm install`: the other six packages are
 * left without their dependencies, and every later `pnpm run` re-runs the failed
 * install instead of the command asked for. That is how a checkout ends up
 * type-checking `apps/web` against a half-linked workspace.
 *
 * So the rebuild is best-effort locally and strict in CI: `CI=true` (set by
 * GitHub Actions, where desktop-release.yml installs the headers first) or
 * `DESKTOP_NATIVE_REQUIRED=1` makes a failure fatal again, so a release can
 * never ship an installer whose desktop-audio capture is missing.
 */
import { spawnSync } from 'node:child_process';

const strict = process.env.CI === 'true' || process.env.DESKTOP_NATIVE_REQUIRED === '1';

const result = spawnSync('electron-rebuild', ['-f', '-w', 'electron-native-screenshare'], {
  stdio: 'inherit',
  // On Windows the binary is a .cmd shim, which spawn cannot execute directly.
  shell: process.platform === 'win32',
});

const code = result.status ?? 1;
if (code === 0) process.exit(0);

if (strict) {
  console.error(
    '\n✗ electron-native-screenshare failed to build, and this is a strict (CI) install.\n' +
      '  Install the native build dependencies first — on Linux:\n' +
      '  sudo apt-get install -y libpipewire-0.3-dev libpulse-dev libx11-dev\n',
  );
  process.exit(code);
}

console.warn(
  '\n⚠ electron-native-screenshare could not be rebuilt — continuing anyway.\n' +
    '  Only the desktop app needs it; the rest of the workspace is installed and usable.\n' +
    '  Running the Electron app without it fails as soon as desktop audio is captured.\n' +
    '  To build it, install the native headers — on Linux:\n' +
    '  sudo apt-get install -y libpipewire-0.3-dev libpulse-dev libx11-dev\n' +
    '  then re-run: pnpm --filter @stream-share/desktop exec electron-rebuild -f -w electron-native-screenshare\n',
);
