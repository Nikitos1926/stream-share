import { z } from 'zod';
import { createEnv } from './createEnv';
import { httpUrl } from './fields';

/**
 * Read at build time by apps/desktop/electron.vite.config.ts and inlined into the
 * main bundle. Unlike the servers, a packaged desktop app has no runner to
 * populate its environment — there is no env file next to the installed binary
 * and nothing exports variables into it — so the address has to be baked in.
 *
 * Required rather than defaulted for the same reason NEXT_PUBLIC_PROXY_PREFIX is:
 * a default here would duplicate the value in apps/desktop/.env.development, and
 * would let a release build silently ship pointing at localhost.
 */
const schema = z.object({
  WEB_URL: httpUrl,
});

export const env = createEnv('desktop', schema);
