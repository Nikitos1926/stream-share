# thesis/tests — checks behind Розділ 5

These scripts are **not part of the product** and are not wired into CI. They exist so every
"фактичний результат" marked as observed in `chapters/50-chapter5.md` can be reproduced. They
were run on 05.10.2026 against commit `7c2f481` (application code on `diploma` = `main`):
Debian 13 aarch64, Node.js 24.21.0, PostgreSQL 18.4, mediasoup 3.20.5, Next.js 16.2.6.

| Script | What it drives | Needs |
| --- | --- | --- |
| `follower.mjs` | `SourceFollower` + `listProcesses()` of the desktop app, with a scripted window list / process table (esbuild bundle, `electron-log` stubbed) | `pnpm install` only; ≈ 40 s |
| `smoke.mjs` | real web (`next start`) and signaling (`node dist/index.js`) servers over HTTP and WebSocket: route gate, guest sign-in, cookie flags, REST/WS auth, stream create / produce / join / consume, disconnect timeout, end of stream, authorization probes | PostgreSQL, both servers running, ≈ 40 s |

Neither script captures, encodes or plays media; those cases need real browsers and are
listed in the chapter as data the author must provide.

## Running `smoke.mjs`

```bash
pnpm install && SKIP_ENV_VALIDATION=1 pnpm --filter '!@stream-share/desktop' -r build  # as the web Dockerfile
# any PostgreSQL; the run used embedded-postgres on port 5433
export NODE_ENV=production DATABASE_URL=postgresql://postgres:postgres@localhost:5433/streamshare
export AUTH_SECRET=$(openssl rand -hex 32)
(cd packages/db && pnpm exec drizzle-kit push --force)
(cd apps/signaling && MEDIASOUP_ANNOUNCED_IP=127.0.0.1 MEDIASOUP_NUM_WORKERS=1 \
   THUMBNAILS_DIR=/tmp/thumbs node dist/index.js &)
(cd apps/web && GOOGLE_CLIENT_ID=x GOOGLE_CLIENT_SECRET=x AUTH_TRUST_HOST=true \
   pnpm exec next start -p 3000 &)
node thesis/tests/smoke.mjs
```

A signed-in Google user cannot be produced without Google, so the script inserts a `user` row and
mints its session JWT with `@auth/core/jwt` `encode()` — the same function, secret and salt Auth.js
uses. Guest sessions go through the real `/api/auth/callback/guest` endpoint.

Expected outcome at `7c2f481`: **20/23 passed** (`follower.mjs`: 7/7). The three failures are real defects reported
in §5.2–5.3 of the chapter (forged token → 500; a guest can create a stream; any session can
open another user's broadcast socket and end the stream).
