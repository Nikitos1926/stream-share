# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN corepack enable
WORKDIR /app

# ---------- build ----------
# Every manifest is copied so pnpm sees the same workspace importers the lockfile
# records — otherwise --frozen-lockfile rejects the install. --filter does not
# prune a workspace-root install (pnpm installs every project regardless), so
# signaling's mediasoup lands here too; --ignore-scripts stops it compiling a
# native worker this image has no toolchain for and never runs.
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/signaling/package.json apps/signaling/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

COPY tsconfig.base.json ./
COPY packages/db packages/db

# `pnpm deploy` is what actually prunes: it writes a self-contained tree holding
# only @stream-share/db and its dependencies. Not --prod — drizzle-kit is a
# devDependency and is the whole point of this image.
RUN pnpm deploy --filter @stream-share/db /out

# ---------- runner ----------
# No pnpm or corepack here: the deployed tree has drizzle-kit's binary already,
# so the runtime needs nothing but node.
#
# The original packages/db depth is preserved deliberately. The deployed tree
# carries tsconfig.json, which extends ../../tsconfig.base.json, and drizzle-kit
# reads it while loading drizzle.config.ts — flattening this to /app breaks that
# relative path.
FROM node:${NODE_VERSION} AS runner
ENV NODE_ENV=production
WORKDIR /app/packages/db

COPY --from=build --chown=node:node /app/tsconfig.base.json /app/tsconfig.base.json
COPY --from=build --chown=node:node /out /app/packages/db

USER node
# No drizzle/ migration folder is committed, so this applies the schema directly.
# Switch to `drizzle-kit migrate` once you commit generated migrations (recommended for prod).
CMD ["./node_modules/.bin/drizzle-kit", "push", "--force"]
