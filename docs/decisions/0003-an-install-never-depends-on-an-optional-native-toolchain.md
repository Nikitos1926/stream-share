# 3. An install never depends on an optional native toolchain

Date: 2026-09-18

## Status

Accepted

## Context

`pnpm install` on a clean checkout failed on any machine without the PipeWire,
PulseAudio and X11 development headers: `apps/desktop`'s `postinstall` ran
`electron-rebuild -f -w electron-native-screenshare`, node-gyp could not compile
`src/linux/pipewire_capture.cpp`, and pnpm aborted the whole workspace install —
`ERR_PNPM_EXECUTOR_LIFECYCLE_SCRIPT_FAILED`. The six packages that have nothing
to do with Electron were installed but the install was recorded as incomplete, so
every later `pnpm run …` re-ran it and failed again before reaching the command.

The usual way out — installing one app only, `pnpm install --filter @stream-share/web` —
is worse, because it links `packages/env` without installing
`packages/env/node_modules`. Every package publishes `src` as its public types, so
`apps/web` then type-checks library source whose `zod` import resolves to nothing,
`createEnv`'s return type collapses to `unknown`, and `pnpm --filter @stream-share/web
typecheck` reports `'env' is of type 'unknown'` in a dozen unrelated files — a bug
report about `packages/env` that was really a bug report about the install.

## Decision

Installing the workspace must succeed on any machine, so a native module that only
one app needs may not fail the install. `apps/desktop`'s `postinstall` runs
`scripts/rebuild-native.mjs`, which warns and exits 0 when the rebuild fails, and
says what to install and how to re-run it. `CI=true` (GitHub Actions) or
`DESKTOP_NATIVE_REQUIRED=1` makes it fatal again, so `desktop-release.yml` — which
installs the headers as its first step — can still never publish an installer
whose desktop-audio capture is missing.

## Consequences

- `pnpm install` at the root completes everywhere, which is what keeps the
  source-as-types boundary between `packages/*` and the apps working.
- A local Electron run without the native module fails at desktop-audio capture
  rather than at install time. The warning says so; the rest of the workspace is
  unaffected.
- Releases keep their guarantee only as long as the release workflow builds with
  `CI=true` — which GitHub Actions sets for every job.
