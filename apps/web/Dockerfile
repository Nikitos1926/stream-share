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
# Full workspace install: tsup/typescript live in the ROOT devDependencies, so a
# --filter'd install would leave packages/db && packages/shared unable to build.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/signaling/package.json apps/signaling/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web

# NEXT_PUBLIC_* is inlined at build time — it cannot be injected at run time
ARG NEXT_PUBLIC_SIGNALING_URL
ARG NEXT_PUBLIC_SIGNALING_WS_URL
ENV NEXT_PUBLIC_SIGNALING_URL=$NEXT_PUBLIC_SIGNALING_URL \
    NEXT_PUBLIC_SIGNALING_WS_URL=$NEXT_PUBLIC_SIGNALING_WS_URL \
    NODE_ENV=production \
    # placeholder: lib/db creates a pg Pool at import time (it does not connect)
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

RUN pnpm --filter @stream-share/db build \
 && pnpm --filter @stream-share/shared build \
 && pnpm --filter @stream-share/web build

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
