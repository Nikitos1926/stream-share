import 'server-only';
import { authSecret, createEnv, httpUrl, nonEmpty, postgresUrl } from '@stream-share/env';
import { z } from 'zod';

/**
 * Secrets. The `server-only` import above makes it a build-time error for a
 * Client Component to reach these, so they can never be inlined into a bundle
 * the browser downloads.
 *
 * `SIGNALING_INTERNAL_URL` deliberately lives in `@/lib/signaling` instead: that
 * module is imported from both sides of the boundary, and an internal hostname
 * is not a secret.
 */
const schema = z.object({
  DATABASE_URL: postgresUrl,
  AUTH_SECRET: authSecret,

  GOOGLE_CLIENT_ID: nonEmpty,
  GOOGLE_CLIENT_SECRET: nonEmpty,

  /** Set by compose in production; Auth.js infers it locally. */
  AUTH_URL: httpUrl.optional(),
  AUTH_TRUST_HOST: z.enum(['true', 'false']).optional(),
});

/**
 * The type is spelled out rather than inferred. `createEnv` derives its return
 * type through the zod schema, and an incomplete workspace install makes that
 * inference collapse to `unknown` (see the root CLAUDE.md) — which used to show
 * up as a dozen `'env' is of type 'unknown'` errors in unrelated modules. With
 * the annotation the same breakage is a single error, here, next to its cause.
 */
export const env: z.infer<typeof schema> = createEnv('web/server', schema);
