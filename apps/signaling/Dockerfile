# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN corepack enable
WORKDIR /app

# mediasoup ships a prebuilt worker binary for linux x64/arm64 *glibc* (hence
# bookworm, not alpine). These packages are only the fallback source build.
FROM base AS toolchain
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates python3 python3-pip build-essential ninja-build pkg-config \
 && rm -rf /var/lib/apt/lists/*

FROM toolchain AS manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/signaling/package.json apps/signaling/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/

# ---------- build ----------
FROM manifests AS build
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages packages
COPY apps/signaling apps/signaling
RUN pnpm --filter @stream-share/db build \
 && pnpm --filter @stream-share/shared build \
 && pnpm --filter @stream-share/signaling build

# ---------- production dependency tree ----------
# hoisted linker => one flat /app/node_modules, so the tsup bundle can resolve
# transitive deps of the workspace libs (e.g. `pg`, pulled in by @stream-share/db).
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --node-linker=hoisted \
      --filter @stream-share/signaling...

# ---------- runner ----------
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    THUMBNAILS_DIR=/data/thumbnails \
    ASSETS_DIR=/app/apps/signaling/assets \
    MEDIASOUP_RTC_MIN_PORT=10100 \
    MEDIASOUP_RTC_MAX_PORT=10100
WORKDIR /app

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build     --chown=node:node /app/apps/signaling/dist ./apps/signaling/dist
COPY --chown=node:node apps/signaling/assets ./apps/signaling/assets

RUN mkdir -p /data/thumbnails && chown -R node:node /data
USER node
EXPOSE 4000
CMD ["node", "apps/signaling/dist/index.js"]
