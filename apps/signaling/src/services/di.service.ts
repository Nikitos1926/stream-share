import type { FastifyInstance } from 'fastify';
import { Container } from '../di/container.di';
import { Class } from '../types/utils';
import { StreamsController } from '../controllers/streams.controller';
import { StreamsRepository } from '../repositories/streams.repository';
import { StreamsService } from './streams.service';
import { MediasoupService } from './mediasoup.service';
import { StreamersService } from './streamers.service';
import { ViewersService } from './viewers.service';

export class DiService {
  private readonly container = new Container();
  constructor(private readonly app: FastifyInstance) {}

  async init() {
    const streamsRepository = new StreamsRepository(this.app);
    this.register(StreamsRepository, streamsRepository);

    const mediasoupService = new MediasoupService();
    this.register(MediasoupService, mediasoupService);

    const streamsService = new StreamsService(streamsRepository, mediasoupService);
    this.register(StreamsService, streamsService);

    const streamerService = new StreamersService(
      streamsRepository,
      streamsService,
      mediasoupService,
    );
    this.register(StreamersService, streamerService);

    const viewerService = new ViewersService(streamsRepository, streamsService, mediasoupService);
    this.register(ViewersService, viewerService);

    this.register(
      StreamsController,
      new StreamsController(this.app, streamsService, streamerService, viewerService),
    );
  }

  resolve<T>(token: Class<T>): T {
    return this.container.resolve(token);
  }

  register<C extends Class<unknown>>(token: C, instance: InstanceType<C>): void {
    this.container.register(token, instance);
  }
}
