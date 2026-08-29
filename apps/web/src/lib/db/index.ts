import { createDb, type Database } from '@stream-share/db';
import { env } from '../env/server';

/**
 * Constructed on first query rather than at import time.
 *
 * `next build` imports this module while collecting page data for the auth route,
 * long before any database exists — eagerly calling `createDb` there is what
 * previously forced a fake `postgresql://build:build@…` fallback into the runtime
 * path, where it silently absorbed a genuinely missing DATABASE_URL.
 *
 * Deferring instead means the build needs no database configuration at all, and a
 * missing DATABASE_URL in production fails validation at startup as intended.
 * `DrizzleAdapter` only ever touches `db` inside its async methods, so nothing
 * observes the difference.
 */
let instance: Database | undefined;

function resolve(): Database {
  instance ??= createDb(env.DATABASE_URL);
  return instance;
}

export const db: Database = new Proxy({} as Database, {
  get: (_target, property, receiver) => Reflect.get(resolve(), property, receiver),
  has: (_target, property) => Reflect.has(resolve(), property),
});
