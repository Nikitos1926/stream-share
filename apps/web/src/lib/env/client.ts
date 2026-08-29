import { createEnv, httpUrl } from '@stream-share/env';
import { z } from 'zod';

const schema = z.object({
  /**
   * Stripped by Caddy before the request reaches signaling.
   *
   * Required rather than defaulted: a default here would silently duplicate the
   * value in apps/web/.env, and would paper over the variable going missing —
   * which is the exact defect that once shipped `undefined/streams` to browsers.
   */
  NEXT_PUBLIC_PROXY_PREFIX: z.string().startsWith('/'),

  /** Dev only — in production the browser goes through the proxy prefix. */
  NEXT_PUBLIC_SIGNALING_URL: httpUrl,
  NEXT_PUBLIC_SIGNALING_WS_URL: z
    .string()
    .refine((value) => /^wss?:\/\/.+/.test(value), 'must be a ws(s) URL'),
});

/**
 * The source is spelled out one key at a time on purpose. Bundlers replace
 * individual `process.env.NEXT_PUBLIC_X` reads with string literals, but they do
 * not make `process.env` itself enumerable in the browser — spreading it here
 * would validate an empty object and then hand back `undefined` at runtime.
 *
 * SKIP_ENV_VALIDATION is deliberately NOT forwarded. These values are inlined at
 * build time and none of them are secret, so they are always available — and a
 * missing one is exactly the defect that shipped `undefined/streams` to the
 * browser. It should fail the build, not the request.
 */
export const env = createEnv('web/client', schema, {
  NEXT_PUBLIC_PROXY_PREFIX: process.env.NEXT_PUBLIC_PROXY_PREFIX,
  NEXT_PUBLIC_SIGNALING_URL: process.env.NEXT_PUBLIC_SIGNALING_URL,
  NEXT_PUBLIC_SIGNALING_WS_URL: process.env.NEXT_PUBLIC_SIGNALING_WS_URL,
});
