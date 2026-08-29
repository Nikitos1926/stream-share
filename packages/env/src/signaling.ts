import os from 'node:os';
import { z } from 'zod';
import { createEnv } from './createEnv';
import { absolutePath, authSecret, httpUrl, ipv4, nonEmpty, port, postgresUrl } from './fields';

const isProduction = process.env.NODE_ENV === 'production';

const schema = z
  .object({
    PORT: port.default(4000),
    HOST: nonEmpty.default('0.0.0.0'),

    /** Unset in production: Caddy serves web and signaling from one origin. */
    CORS_ORIGIN: httpUrl.optional(),

    DATABASE_URL: postgresUrl,
    AUTH_SECRET: authSecret,

    /**
     * Must be the public IPv4 of the host — it is what ends up in the ICE
     * candidates the browser dials back on. A wrong value means transports
     * connect nowhere, so production requires it explicitly.
     */
    MEDIASOUP_ANNOUNCED_IP: isProduction ? ipv4 : ipv4.default('127.0.0.1'),

    MEDIASOUP_RTC_MIN_PORT: port.default(40000),
    MEDIASOUP_RTC_MAX_PORT: port.default(49999),
    MEDIASOUP_NUM_WORKERS: z.coerce.number().int().positive().default(os.cpus().length),

    THUMBNAILS_DIR: absolutePath.default('/data/thumbnails'),
    ASSETS_DIR: absolutePath.optional(),
  })
  .refine((value) => value.MEDIASOUP_RTC_MIN_PORT < value.MEDIASOUP_RTC_MAX_PORT, {
    message: 'must be lower than MEDIASOUP_RTC_MAX_PORT',
    path: ['MEDIASOUP_RTC_MIN_PORT'],
  });

export const env = createEnv('signaling', schema);
