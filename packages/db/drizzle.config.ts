import { defineConfig } from 'drizzle-kit';

/**
 * Reads process.env directly rather than going through @stream-share/env: that
 * package would have to be built before any `db:*` script could run, which breaks
 * on a fresh clone. The `db:*` scripts inject DATABASE_URL via dotenvx, and the
 * check below covers the case where one is run without it.
 */
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Run the db:* scripts from package.json (they load ' +
      'the root .env.development via dotenvx) rather than invoking drizzle-kit directly.',
  );
}

export default defineConfig({
  out: './drizzle',
  schema: './src/schemas/*.schema.ts', // explicit glob — excludes index.ts and any .js
  dialect: 'postgresql',
  dbCredentials: { url },
});
