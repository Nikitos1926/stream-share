import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import path from 'node:path';
import type { NextConfig } from 'next';

const isProduction = process.env.NODE_ENV === 'production';
const rootEnvPath = path.join(import.meta.dirname, '../../');
const envFileName = isProduction ? '.env.production' : '.env.development';

dotenvExpand.expand(
  dotenv.config({
    path: path.join(rootEnvPath, envFileName),
  }),
);
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'lh3.googleusercontent.com' }],
  },
};

export default nextConfig;
