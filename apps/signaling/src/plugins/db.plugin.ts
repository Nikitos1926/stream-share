import { createDb } from '@stream-share/db';
import fp from 'fastify-plugin';

const dbName = 'db';

export default fp(
  function (fastify) {
    if (dbName in fastify && fastify[dbName]) return;
    const db = createDb('postgresql://postgres:postgres@localhost:5432/streamshare');
    fastify.decorate(dbName, db);
  },
  { name: 'fastify-db' },
);
