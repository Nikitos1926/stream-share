import cookie from '@fastify/cookie';
import websocketPlugin from '@fastify/websocket';
import schedulePlugin from '@fastify/schedule';
import Fastify from 'fastify';
import { StreamsController } from './controllers/streams.controller';
import dbPlugin from './plugins/db.plugin';
import diPlugin from './plugins/di.plugin';
import { MediasoupService } from './services/mediasoup.service';
import cors from '@fastify/cors';
import { StreamsService } from './services/streams.service';
import { UsersController } from './controllers/users.controller';
import staticPlugin from '@fastify/static';
import { mkdir } from 'fs/promises';
import { UsersService } from './services/users.service';

const startServer = async () => {
  await mkdir(StreamsController.THUMBNAILS_DIR, { recursive: true });

  const app = Fastify({ logger: true });

  app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (req, body, done) =>
    done(null, body),
  );

  await app.register(cookie);
  await app.register(cors, {
    origin: 'http://localhost:3000',
    credentials: true,
  });
  await app.register(websocketPlugin);
  await app.register(schedulePlugin);
  await app.register(dbPlugin);
  await app.register(diPlugin);
  await app.register(staticPlugin, {
    root: StreamsController.THUMBNAILS_DIR,
  });

  await app.di.init();
  app.di.resolve(UsersService).registerCronJobs();

  await app.di.resolve(StreamsService).stopUnfinishedStreams();
  await app.di.resolve(MediasoupService).createWorkers();

  app.di.resolve(StreamsController).initRoutes();
  app.di.resolve(UsersController).initRoutes();

  await app.listen({ port: 4000 });
};

startServer().catch(console.error);
