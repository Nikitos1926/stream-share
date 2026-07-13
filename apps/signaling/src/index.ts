import cookie from '@fastify/cookie';
import websocketPlugin from '@fastify/websocket';
import Fastify from 'fastify';
import { StreamsController } from './controllers/streams.controller';
import dbPlugin from './plugins/db.plugin';
import diPlugin from './plugins/di.plugin';
import { MediasoupService } from './services/mediasoup.service';
import cors from '@fastify/cors';

const startServer = async () => {
  const app = Fastify({ logger: true });
  await app.register(cookie);
  await app.register(cors, {
    origin: 'http://localhost:3000',
    credentials: true,
  });
  await app.register(websocketPlugin);
  await app.register(dbPlugin);
  await app.register(diPlugin);
  await app.di.init();

  await app.di.resolve(MediasoupService).createWorkers();
  app.di.resolve(StreamsController).initRoutes();

  await app.listen({ port: 4000 });
};

startServer().catch(console.error);
