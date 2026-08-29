import { createDb } from '@stream-share/db';
import { env } from '@stream-share/env/signaling';
import fp from 'fastify-plugin';

const dbName = 'db';

export default fp(
  function (fastify) {
    if (dbName in fastify && fastify[dbName]) return;
    const db = createDb(env.DATABASE_URL);
    fastify.decorate(dbName, db);
  },
  { name: 'fastify-db' },
);
