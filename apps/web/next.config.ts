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
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(import.meta.dirname, '../../'),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
};

export default nextConfig;
