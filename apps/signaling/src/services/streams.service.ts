import { WebSocket } from '@fastify/websocket';
import {
  NewStream,
  Stream,
  StreamEndReason,
  StreamStatus,
  StreamWithRelations,
} from '@stream-share/db';
import { ListParams, StreamErrors, TransportErrors } from '@stream-share/shared';
import { Consumer, Producer, Router, WebRtcTransport } from 'mediasoup/types';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';
import { StreamsRepository } from '../repositories/streams.repository';
import { MediasoupService } from './mediasoup.service';

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

  async getLiveByUserId(userId: string): Promise<Stream> {
    let stream;
    try {
      stream = await this.streamsRepository.getLiveByUserId(userId);
    } catch (error) {
      throw new Error(StreamErrors.SELECTION_ERROR, { cause: error });
    }
    if (!stream) throw new EntityNotFoundError('stream');
    return stream;
  }

  async getList(
    params: ListParams<Stream>,
  ): Promise<{ streams: StreamWithRelations[]; count: number }> {
    try {
      return this.streamsRepository.getList(params);
    } catch (error) {
      throw new Error(StreamErrors.LIST_SELECTION_ERROR, { cause: error });
    }
  }

  async create(streamerId: string, isPrivate = false): Promise<Stream> {
    let stream;
    try {
      stream = await this.streamsRepository.insert({ userId: streamerId, isPrivate });
    } catch (error) {
      throw new Error(StreamErrors.CREATION_ERROR, { cause: error });
    }
    if (!stream) throw new EntityNotFoundError('stream');
    return stream;
  }

  async update(stream: Partial<Omit<NewStream, 'id'>> & { id: string }): Promise<Stream> {
    let updatedStream;
    if (stream.status === StreamStatus.Ended && !stream.endReason)
      throw new Error(StreamErrors.UPDATE_ERROR);
    try {
      updatedStream = await this.streamsRepository.update(stream);
    } catch (error) {
      throw new Error(StreamErrors.UPDATE_ERROR, { cause: error });
    }
    if (!updatedStream) throw new EntityNotFoundError('stream');
    return updatedStream;
  }

  async stopUnfinishedStreams(): Promise<Stream[]> {
    const result = await this.streamsRepository.updateUnfinishedStreams({
      status: StreamStatus.Ended,
      endedAt: new Date(),
      endReason: StreamEndReason.ServerForce,
    });
    await this.streamsRepository.removeViewersByStreams(result.map((stream) => stream.id));
    return result;
  }

  async requireStream(streamId: string): Promise<Stream> {
    const stream = await this.streamsRepository.getOne(streamId);
    if (!stream) throw new EntityNotFoundError('stream');

    return stream;
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
}

export type StreamViewerContext = {
  consumers?: Consumer[];
  transport: WebRtcTransport | null;
  socket: WebSocket;
};

export type StreamContext = {
  reconnectionId?: NodeJS.Timeout | null;
  router: Router;
  transport?: WebRtcTransport;
  producers?: Producer[];
  viewers: Record<string, StreamViewerContext>;
};
