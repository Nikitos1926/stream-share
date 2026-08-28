# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=22-bookworm-slim

FROM node:${NODE_VERSION}
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/
COPY apps/signaling/package.json apps/signaling/
COPY apps/desktop/package.json apps/desktop/
COPY packages/db/package.json packages/db/
COPY packages/shared/package.json packages/shared/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter @stream-share/db

COPY tsconfig.base.json ./
COPY packages/db packages/db

WORKDIR /app/packages/db
# No drizzle/ migration folder is committed, so this applies the schema directly.
# Switch to `drizzle-kit migrate` once you commit generated migrations (recommended for prod).
CMD ["pnpm", "exec", "drizzle-kit", "push", "--force"]
