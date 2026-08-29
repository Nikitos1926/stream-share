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

export const env = createEnv('web/server', schema);
