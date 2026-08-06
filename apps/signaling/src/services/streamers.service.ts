import { ProducerErrors, TransportErrors } from '@stream-share/shared';
import {
  DtlsParameters,
  MediaKind,
  Producer,
  RtpParameters,
  WebRtcTransport,
} from 'mediasoup/types';
import { StreamsRepository } from '../repositories/streams.repository';
import { MediasoupService } from './mediasoup.service';
import { StreamContext, StreamsService } from './streams.service';
import { UsersRepository } from '../repositories/users.repository';

export class StreamersService {
  constructor(
    private readonly streamsRepository: StreamsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly streamsService: StreamsService,
    private readonly mediasoupService: MediasoupService,
  ) {}

  async createTransport(streamId: string, streamContext: StreamContext): Promise<WebRtcTransport> {
    try {
      const transport = await this.mediasoupService.createTransport(streamContext.router, 'send');
      let producers = streamContext.producers;
      if (producers?.length) {
        producers.forEach((p) => p.close());
        producers = [];
      }
      if (streamContext.transport) {
        streamContext.transport.close();
      }
      this.streamsService.setContext(streamId, { ...streamContext, transport, producers });
      return transport;
    } catch (error) {
      throw new Error(TransportErrors.CREATION_ERROR, { cause: error });
    }
  }

  async connectTransport(
    streamContext: StreamContext,
    dtlsParameters: DtlsParameters,
  ): Promise<void> {
    try {
      await streamContext.transport!.connect({ dtlsParameters });
    } catch (error) {
      throw new Error(TransportErrors.CONNECT_ERROR, { cause: error });
    }
  }

  async produce(
    streamId: string,
    streamContext: StreamContext,
    params: { kind: MediaKind; rtpParameters: RtpParameters },
  ): Promise<Producer> {
    try {
      const producer = await streamContext.transport!.produce(params);
      const producers = streamContext.producers?.slice() ?? [];
      producers.push(producer);

      this.streamsService.setContext(streamId, { ...streamContext, producers });
      return producer;
    } catch (error) {
      throw new Error(ProducerErrors.CREATION_ERROR, { cause: error });
    }
  }

  async releaseResources(streamId: string): Promise<void> {
    const streamContext = this.streamsService.getContext(streamId);
    if (!streamContext) return;

    await this.streamsRepository.removeViewersByStream(streamId);
    Object.values(streamContext.viewers).forEach(({ consumers, transport, socket }) => {
      consumers?.forEach((c) => c.close());
      transport?.close();
      socket.close();
    });
    streamContext.producers?.forEach((producer) => {
      producer.close();
    });
    streamContext.transport?.close();
    streamContext.router.close();

    this.streamsService.removeContext(streamId);
  }
}
