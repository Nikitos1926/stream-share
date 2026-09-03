import { createEnv, httpUrl } from '@stream-share/env';
import { z } from 'zod';
import { env as clientEnv } from './env/client';

const isDev = process.env.NODE_ENV === 'development';

/**
 * Validated lazily rather than at module scope: this module is imported from both
 * Server Components and Client Components, and only the server branch below can
 * ever reach it. Module-scope validation would fail every browser bundle.
 */
let internalBase: string | undefined;

function internalBaseUrl(): string {
  internalBase ??= createEnv(
    'web/server (signaling)',
    z.object({ SIGNALING_INTERNAL_URL: httpUrl }),
    {
      SIGNALING_INTERNAL_URL: process.env.SIGNALING_INTERNAL_URL,
      SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    },
  ).SIGNALING_INTERNAL_URL;

  return internalBase;
}

/** `path` is the route as Fastify defines it, e.g. '/streams'. */
export function signalingUrl(path: string, forceExternal?: boolean): string {
  if (typeof window === 'undefined' && !forceExternal) {
    // server-side: straight over the compose network, no proxy, no prefix
    return `${internalBaseUrl()}${path}`;
  }
  return isDev
    ? `${clientEnv.NEXT_PUBLIC_SIGNALING_URL}${path}`
    : `${clientEnv.NEXT_PUBLIC_PROXY_PREFIX}${path}`;
}

export function signalingWsUrl(path: string): string {
  if (isDev) return `${clientEnv.NEXT_PUBLIC_SIGNALING_WS_URL}${path}`;
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${clientEnv.NEXT_PUBLIC_PROXY_PREFIX}${path}`;
}
