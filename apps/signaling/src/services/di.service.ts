import type { FastifyInstance } from 'fastify';
import { Container } from '../di/container.di';
import { Class } from '../types/utils';
import { StreamsController } from '../controllers/streams.controller';
import { StreamsRepository } from '../repositories/streams.repository';
import { StreamsService } from './streams.service';
import { MediasoupService } from './mediasoup.service';
import { StreamersService } from './streamers.service';
import { ViewersService } from './viewers.service';
import { UsersRepository } from '../repositories/users.repository';
import { UsersService } from './users.service';
import { UsersController } from '../controllers/users.controller';

export class DiService {
  private readonly container = new Container();
  constructor(private readonly app: FastifyInstance) {}

  async init() {
    const streamsRepository = new StreamsRepository(this.app);
    this.register(StreamsRepository, streamsRepository);

    const usersRepository = new UsersRepository(this.app);
    this.register(UsersRepository, usersRepository);

    const mediasoupService = new MediasoupService();
    this.register(MediasoupService, mediasoupService);

    const streamsService = new StreamsService(streamsRepository, mediasoupService);
    this.register(StreamsService, streamsService);

    const usersService = new UsersService(this.app, usersRepository);
    this.register(UsersService, usersService);

    const streamerService = new StreamersService(
      streamsRepository,
      usersRepository,
      streamsService,
      mediasoupService,
    );
    this.register(StreamersService, streamerService);

    const viewerService = new ViewersService(
      streamsRepository,
      usersRepository,
      streamsService,
      mediasoupService,
    );
    this.register(ViewersService, viewerService);

    this.register(
      StreamsController,
      new StreamsController(this.app, streamsService, usersService, streamerService, viewerService),
    );

    this.register(UsersController, new UsersController(this.app, usersService));
  }

  resolve<T>(token: Class<T>): T {
    return this.container.resolve(token);
  }

  register<C extends Class<unknown>>(token: C, instance: InstanceType<C>): void {
    this.container.register(token, instance);
  }
}
