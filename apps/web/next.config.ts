import path from 'node:path';
import type { NextConfig } from 'next';

/**
 * No dotenv loading here on purpose. Next loads `.env`, `.env.development` and
 * `.env.production` from this directory itself, for `next dev`, `next build` and
 * the standalone runtime alike.
 *
 * This file, by contrast, is never executed by `node server.js`: the standalone
 * output embeds a serialised copy of the config instead. Anything loaded here
 * would therefore be silently absent in production.
 */
/**
 * No `images.remotePatterns` either: nothing remote goes through `next/image`.
 * The only remote images are avatars and stream thumbnails, both already sized by
 * whoever serves them, and both plain `<img>` — an allowlist that a user's avatar
 * host happens to fall outside of turns into a render-time throw or a 400 (see
 * components/ui/Avatar.tsx).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
};

export default nextConfig;
