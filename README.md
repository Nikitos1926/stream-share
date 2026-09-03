# stream-share

### Features

- [x] video/audio content streaming
- [x] authentication using Google provider
- [x] anonymous session
- [x] private stream sessions
- [x] toast notifications
- [x] stream thumbnails
- [x] prune unused guest sessions
- [x] env using dotenv
- [ ] deploy to hosting
- [ ] desktop app
- [ ] replace client fetches with react-query

## Configuration

Every variable is validated once at startup by `@stream-share/env`. A missing or
malformed value fails immediately with a list of everything that is wrong, rather
than surfacing later as `undefined`.

**Application code never reads `process.env` and never loads an env file.**
Populating the environment is the runner's job — `dotenvx` in development,
`env_file:` in Compose in production — so both environments behave identically. An
ESLint rule enforces this; `NODE_ENV` is the one exemption.

### Layout

| File                        | Tracked | Purpose                                                                                        |
| --------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `.env.development`          | yes     | Shared dev values (`DATABASE_URL`, `AUTH_SECRET`, `POSTGRES_*`). Local-only, not real secrets. |
| `.env.example`              | yes     | Template for `.env.production`, plus the variables Compose interpolates.                       |
| `.env.production`           | **no**  | Production secrets and Compose variables.                                                      |
| `apps/web/.env`             | yes     | Public `NEXT_PUBLIC_*` defaults. Non-secret by definition — inlined into the browser bundle.   |
| `apps/web/.env.development` | yes     | Web-only dev values.                                                                           |
| `apps/*/.env.production`    | **no**  | Per-app production values; see the matching `.example`.                                        |

`NEXT_PUBLIC_*` values are baked in at build time, so changing one needs a rebuild,
not a restart.

### Development

```bash
pnpm infra:up     # postgres + redis
pnpm dev          # loads .env.development, then each app loads its own
```

`pnpm dev` injects the shared root file into the environment; each app then layers
its own `.env.development` on top. Values already set win, so the root file is the
single source of truth for anything shared.

### Production

Fill in the templates, then bring the stack up:

```bash
cp .env.example .env.production
cp apps/web/.env.production.example apps/web/.env.production
cp apps/signaling/.env.production.example apps/signaling/.env.production

pnpm prod:config  # validate before deploying
pnpm prod:up
```

Use the `prod:*` scripts rather than calling `docker compose` directly — they pass
the `--env-file` flag that resolves the `${VAR}` references in
`infra/docker-compose.prod.yml`.

Two values are easy to get wrong and worth checking:

- `MEDIASOUP_ANNOUNCED_IP` must be the host's **public IPv4**. It is what ends up
  in the ICE candidates the browser dials back on, so a loopback or private
  address means every stream fails to connect. It is intentionally blank in the
  template so startup fails loudly instead of half-working.
- `SIGNALING_INTERNAL_URL` must be `http://signaling:4000`, the Compose service
  name — inside the web container, `localhost` is the web server itself.

`SKIP_ENV_VALIDATION=1` bypasses validation for image builds and typechecks, where
secrets are legitimately absent. Never set it on a running server.


### Prod SSH connection 

`ssh -i C:\Users\coort\.ssh\oracle-stream-share.key ubuntu@streamshare.space`
