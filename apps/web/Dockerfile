# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1 \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN corepack enable
WORKDIR /app

# ---------- deps ----------
# Every manifest is copied so pnpm sees the same workspace importers the lockfile
# records — otherwise --frozen-lockfile rejects the install. `--filter` does NOT
# help here: a workspace-root install always installs every project (verified on
# both pnpm 9 and 10), so signaling's mediasoup gets pulled in regardless.
#
# --ignore-scripts is what keeps that harmless. Without it, mediasoup's
# postinstall tries to compile its native worker from source whenever the
# prebuilt download misses, and this image has no python/build toolchain — so the
# web build would fail on a dependency it never runs. Nothing here needs a native
# postinstall: the runner stage below takes only Next's standalone output.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/signaling/package.json apps/signaling/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

# ---------- build ----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web

ENV NODE_ENV=production

# Secrets are injected at run time, not baked in, so the server-side env schema
# has nothing to validate here. The client schema still runs — its NEXT_PUBLIC_*
# values must be present now, because they are inlined into the bundle.
ENV SKIP_ENV_VALIDATION=1

# Defaults come from the tracked apps/web/.env; override only to build an image
# for a deployment whose Caddy uses a different prefix.
#
# Written to .env.production — which outranks .env in Next's loader — rather than
# set with ENV. `ENV FOO=${FOO:-}` would define FOO as an empty string whenever
# the ARG is unset, and @next/env never overrides an already-set variable, so the
# tracked default in apps/web/.env would be ignored on every ordinary build.
#
# The `if` matters for the same reason: writing the line unconditionally would
# put an empty assignment in .env.production and shadow the default just as badly.
ARG NEXT_PUBLIC_PROXY_PREFIX
RUN if [ -n "${NEXT_PUBLIC_PROXY_PREFIX}" ]; then \
      echo "NEXT_PUBLIC_PROXY_PREFIX=${NEXT_PUBLIC_PROXY_PREFIX}" \
        >> apps/web/.env.production; \
    fi

RUN pnpm --filter @stream-share/db build \
 && pnpm --filter @stream-share/shared build \
 && pnpm --filter @stream-share/env build \
 && pnpm --filter @stream-share/web build

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

