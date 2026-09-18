# stream-share — workspace conventions

A pnpm workspace: `apps/web`, `apps/signaling`, `apps/desktop` on top of `packages/db`,
`packages/env`, `packages/shared`. Per-area conventions live in the nearest `CLAUDE.md`
(e.g. `apps/web/CLAUDE.md`); decisions live in `docs/decisions/`.

**Install the whole workspace, from the root.** `pnpm install`. A filtered install must keep
the `...` suffix — `pnpm install --filter @stream-share/web...`, the way
`.github/workflows/desktop-release.yml` does it — so the workspace packages it depends on get
their own dependencies too. Without the suffix pnpm links `packages/env` into the app but never
installs `packages/env/node_modules`, and because every package publishes **`src` as its public
types** (`"types": "./src/index.ts"`), the app then type-checks library _source_ whose `zod`
import resolves to nothing. `pnpm install` at the root is the fix. Read the errors from the
bottom: a `TS2307: Cannot find module 'zod'` under `packages/` is the cause, and anything it
reports in an app is a symptom — which is why `apps/web/src/lib/env/*.ts` annotates its `env`
exports (`z.infer<typeof schema>`) instead of inferring them through `createEnv`, so a collapsed
inference no longer sprays `'env' is of type 'unknown'` across unrelated modules.

**Build the libraries before running or bundling an app.** `packages/*` publish `src` for types
but `dist/` for runtime, and `dist/` is gitignored — so on a fresh checkout `next build` and
`node` cannot resolve `@stream-share/env` until `tsup` has run. Root `pnpm build` and `pnpm dev`
handle the order themselves, and `pnpm --filter @stream-share/web build` builds its workspace
dependencies first (`--filter @stream-share/web^...`). `typecheck` and `lint` need no build,
because types come from source. Anything else run against a single package by hand —
`pnpm --filter @stream-share/signaling start`, `electron-vite` — needs `pnpm build` or
`pnpm dev:lib` first.

**The desktop native module never blocks an install.** `electron-native-screenshare` needs
PipeWire/PulseAudio/X11 headers, which most machines and sandboxes lack, so
`apps/desktop/scripts/rebuild-native.mjs` warns and continues instead of failing the install
(`CI=true` or `DESKTOP_NATIVE_REQUIRED=1` restores strictness — see `docs/decisions/0003-*`).
A warning there means the Electron app will fail when it captures desktop audio; nothing else
is affected.

**Verification is manual: `pnpm lint && pnpm typecheck && pnpm build`.** There is no test runner
and CI builds artifacts only, so run those three before handing work over.

**What is covered instead are `check:*` scripts — plain `node` harnesses next to the code they
guard.** Each one drives the real library or module behind a stub of whatever it cannot have
(Google, Electron) and fails on the regression it was written for; run the ones near what you
touched, and add one when a bug is only visible in a sequence of steps rather than in a type.
`pnpm --filter @stream-share/web check:desktop-auth | check:session-cookie | check:contrast`,
`pnpm --filter @stream-share/desktop check:sign-in-guard` (one sign-in flow at a time: the
button being disabled is UI, the guard that counts is in the main process).
