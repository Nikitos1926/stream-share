import { WebSocket } from '@fastify/websocket';
import {
  ConsumerErrors,
  RegistryErrors,
  RtpCapabilitiesErrors,
  SignalingApi,
  StreamErrors,
  TransportErrors,
  ViewerActionsType,
} from '@stream-share/shared';
import { Consumer, MediaKind, WebRtcTransport } from 'mediasoup/types';
import { StreamsRepository } from '../repositories/streams.repository';
import { MediasoupService } from './mediasoup.service';
import { StreamContext, StreamsService, StreamViewerContext } from './streams.service';
import { UsersRepository } from '../repositories/users.repository';

export class ViewersService {
  constructor(
    private readonly streamsRepository: StreamsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly streamsService: StreamsService,
    private readonly mediasoupService: MediasoupService,
  ) {}

  async joinStream(data: {
    viewerId: string;
    streamId: string;
    streamContext: StreamContext;
    socket: WebSocket;
  }): Promise<void> {
    const { viewerId, streamId, streamContext, socket } = data;
    if (!streamContext.producers?.length) {
      const errorMessage = StreamErrors.CREATION_IN_PROGRESS_ERROR;
      throw new Error(errorMessage);
    }

    try {
      void this.streamsRepository.addViewer({ userId: viewerId, streamId });
    } catch (error) {
      throw new Error(StreamErrors.ADD_VIEWER_ERROR, { cause: error });
    }

    this.streamsService.setContext(streamId, {
      ...streamContext,
      viewers: {
        ...streamContext.viewers,
        [viewerId]: { transport: null, socket },
      },
    });

    return;
  }

  async createTransport(
    data: {
      viewerId: string;
      streamId: string;
      streamContext: StreamContext;
    },
    params: SignalingApi[ViewerActionsType['CreateTransport']]['params'],
  ): Promise<WebRtcTransport> {
    const { viewerId, streamId, streamContext } = data;
    const { direction } = params;
    const viewer = this.requireViewer(streamContext, viewerId);

    try {
      const transport = await this.mediasoupService.createTransport(
        streamContext.router,
        direction,
      );
      this.streamsService.setContext(streamId, {
        ...streamContext,
        viewers: {
          ...streamContext.viewers,
          [viewerId]: { ...viewer, transport },
        },
      });

      return transport;
    } catch (error) {
      throw new Error(TransportErrors.CREATION_ERROR, { cause: error });
    }
  }

  async connectTransport(
    data: {
      viewerId: string;
      streamId: string;
      streamContext: StreamContext;
    },
    params: SignalingApi[ViewerActionsType['ConnectTransport']]['params'],
  ): Promise<void> {
    const { viewerId, streamContext } = data;
    const { dtlsParameters } = params;
    const viewer = this.requireViewer(streamContext, viewerId);

    // if (!streamContext.viewers[viewerId])
    if (!viewer.transport) {
      throw new Error(TransportErrors.NOT_CREATED_ERROR);
    }

    try {
      await viewer.transport.connect({ dtlsParameters });
    } catch (error) {
      throw new Error(TransportErrors.CONNECT_ERROR, { cause: error });
    }
  }

  async consume(
    data: {
      viewerId: string;
      streamId: string;
      streamContext: StreamContext;
    },
    params: SignalingApi[ViewerActionsType['Consume']]['params'],
  ): Promise<{ consumer: Consumer; kind: MediaKind }> {
    const { viewerId, streamId, streamContext } = data;
    const { producerId, rtpCapabilities } = params;
    const viewer = this.requireViewer(streamContext, viewerId);

    const producer = streamContext.producers!.find((producer) => producer.id === producerId);

    if (!streamContext.transport || !streamContext.producers?.length || !producer) {
      throw new Error(StreamErrors.CREATION_IN_PROGRESS_ERROR);
    }

    if (
      !streamContext.router.canConsume({
        producerId,
        rtpCapabilities,
      })
    ) {
      throw new Error(RtpCapabilitiesErrors.UNSUPPORTED_RTP_CAPABILITIES_ERROR);
    }

    if (!viewer.transport) {
      throw new Error(TransportErrors.NOT_CREATED_ERROR);
    }

    try {
      const consumer = await viewer.transport.consume({
        producerId,
        rtpCapabilities,
      });
      const consumers = viewer.consumers?.slice() ?? [];
      if (viewer.consumers?.length) {
        const prevConsumer = viewer.consumers.find((c) => c.kind === consumer.kind);
        if (prevConsumer) {
          prevConsumer.close();
          consumers.splice(consumers.indexOf(prevConsumer), 1);
        }
      }
      consumers.push(consumer);

      this.streamsService.setContext(streamId, {
        ...streamContext,
        viewers: {
          ...streamContext.viewers,
          [viewerId]: { ...viewer, consumers },
        },
      });
      return { consumer, kind: producer.kind };
    } catch (error) {
      throw new Error(ConsumerErrors.CREATION_ERROR, { cause: error });
    }
  }

  async releaseResources(userId: string, streamId: string): Promise<void> {
    await this.streamsRepository.removeViewer({ userId, streamId });

    const streamContext = this.streamsService.getContext(streamId);
    if (!streamContext) return;

    const { [userId]: viewer, ...otherViewers } = streamContext.viewers;
    if (!viewer) return;

    const { consumers, transport } = viewer;
    consumers?.forEach((c) => c.close());
    transport?.close();

    this.streamsService.setContext(streamId, { ...streamContext, viewers: otherViewers });
  }

  private requireViewer(streamContext: StreamContext, viewerId: string): StreamViewerContext {
    if (!streamContext.viewers[viewerId]) throw new Error(RegistryErrors.USER_NOT_FOUND_ERROR);
    return streamContext.viewers[viewerId];
  }
}
