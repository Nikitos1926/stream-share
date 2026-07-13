import { WebSocket } from '@fastify/websocket';
import { NewStream, Stream, StreamsWithRelations } from '@stream-share/db';
import { StreamErrors, TransportErrors } from '@stream-share/shared';
import { Consumer, Producer, Router, WebRtcTransport } from 'mediasoup/types';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';
import { ListParams, StreamsRepository } from '../repositories/streams.repository';
import { MediasoupService } from './mediasoup.service';
export type StreamViewerContext = {
  consumer: Consumer | null;
  transport: WebRtcTransport | null;
  socket: WebSocket;
};

export type StreamContext = {
  router: Router;
  transport?: WebRtcTransport;
  producers?: Producer[];
  viewers: Record<string, StreamViewerContext>;
};

export class StreamsService {
  private readonly registry = new Map<string, StreamContext>();

  constructor(
    private readonly streamsRepository: StreamsRepository,
    private readonly mediasoupService: MediasoupService,
  ) {}

  async getOne(streamId: string): Promise<Stream> {
    let stream;
    try {
      stream = await this.streamsRepository.getOne(streamId);
    } catch (error) {
      throw new Error(StreamErrors.SELECTION_ERROR, { cause: error });
    }
    if (!stream) throw new EntityNotFoundError('stream');
    return stream;
  }

  async getList(params: ListParams): Promise<{ streams: StreamsWithRelations[]; count: number }> {
    try {
      return this.streamsRepository.getList(params);
    } catch (error) {
      throw new Error(StreamErrors.LIST_SELECTION_ERROR, { cause: error });
    }
  }

  async createStream(streamerId: string): Promise<Stream> {
    let stream;
    try {
      stream = await this.streamsRepository.insertStream({ userId: streamerId });
    } catch (error) {
      throw new Error(StreamErrors.CREATION_ERROR, { cause: error });
    }
    if (!stream) throw new EntityNotFoundError('stream');
    return stream;
  }

  async updateStream(stream: Partial<Omit<NewStream, 'id'>> & { id: string }): Promise<Stream> {
    let updatedStream;
    if (stream.status === 'ended' && !stream.endReason) throw new Error(StreamErrors.UPDATE_ERROR);
    try {
      updatedStream = await this.streamsRepository.updateStream(stream);
    } catch (error) {
      throw new Error(StreamErrors.UPDATE_ERROR, { cause: error });
    }
    if (!updatedStream) throw new EntityNotFoundError('stream');
    return updatedStream;
  }

  async requireContext(streamId: string): Promise<StreamContext> {
    const context = this.getContext(streamId);
    if (context) return context;
    try {
      const r = await this.mediasoupService.createRouter();
      this.setContext(streamId, { router: r, viewers: {} });
    } catch (error) {
      throw new Error(TransportErrors.CREATION_ERROR, { cause: error });
    }

    return this.getContext(streamId)!;
  }

  getContext(streamId: string): StreamContext | undefined {
    return this.registry.get(streamId);
  }

  setContext(streamId: string, context: StreamContext): void {
    this.registry.set(streamId, context);
  }

  removeContext(streamId: string): void {
    this.registry.delete(streamId);
  }
}
