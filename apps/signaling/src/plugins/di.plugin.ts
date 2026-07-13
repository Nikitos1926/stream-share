import fp from 'fastify-plugin';
import { DiService } from '../services/di.service';

const diName = 'di';

export default fp(
  function (fastify) {
    if (diName in fastify && fastify[diName]) return;
    const diService = new DiService(fastify);
    fastify.decorate(diName, diService);
  },
  { name: 'fastify-di' },
);
