import { createDb } from '@stream-share/db';

export const db = createDb(
  process.env.DATABASE_URL ?? 'postgresql://build:build@127.0.0.1:5432/build',
);
