import { WebSocket } from '@fastify/websocket';
import { Stream, StreamEndReason, StreamStatus } from '@stream-share/db';
import { env } from '@stream-share/env/signaling';
import {
  CommonActions,
  constructErrorResponse,
  constructEvent,
  constructSuccessResponse,
  ListParams,
  parseMessage,
  StreamerActions,
  ViewerActions,
  WsEvent,
  WsEvents,
  WsRequestEnvelope,
} from '@stream-share/shared';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { writeFile } from 'fs/promises';
import path from 'path';
import { validateWsJwt } from '../auth/validators';
import { EntityNotFoundError } from '../errors/EntityNotFound.error';
import { StreamersService } from '../services/streamers.service';
import { StreamsService } from '../services/streams.service';
import { UsersService } from '../services/users.service';
import { ViewersService } from '../services/viewers.service';
import { existsSync } from 'fs';

export class StreamsController {
  static readonly THUMBNAILS_DIR = env.THUMBNAILS_DIR;
  private static readonly MAX_ATTEMPTS = 5;

  constructor(
    private readonly app: FastifyInstance,
    private readonly streamsService: StreamsService,
    private readonly usersService: UsersService,
    private readonly streamerService: StreamersService,
    private readonly viewerService: ViewersService,
  ) {}

  initRoutes() {
    this.app.register(
      (app) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        app.decorateRequest('context', null as any);
        app.addHook('onRequest', async (req) => {
          req.context = {};
        });
        app.addHook('preValidation', validateWsJwt);

        app.post<{ Body: { isPrivate: boolean } }>('/', this.handleCreate);

        app.post<{ Body: ListParams<Stream> }>('/search', this.handleGetList);

        app.get<{ Params: { userId: string } }>('/:userId/active', this.handleGetActive);

        app.get<{ Params: { streamId: string } }>('/:streamId/thumbnail', this.handleGetThumbnail);
        app.post<{ Params: { streamId: string } }>(
          '/:streamId/thumbnail',
          this.handleChangeThumbnail,
        );
      },
      { prefix: '/streams' },
    );

    this.app.get<{ Params: { streamId: string } }>('/streams/:streamId', this.handleGetOne);

    this.app.register(
      (app) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        app.decorateRequest('context', null as any);
        app.addHook('onRequest', async (req) => {
          req.context = {};
        });

        app.get<{ Params: { streamId: string } }>(
          '/broadcast',
          {
            websocket: true,
            preValidation: validateWsJwt,
          },
          this.handleBroadcast,
        );
        app.get<{ Params: { streamId: string } }>(
          '/watch',
          {
            websocket: true,
            preValidation: async (req, reply) => {
              await validateWsJwt(req, reply);
              req.context.userId ??= crypto.randomUUID();
            },
          },
          this.handleWatch,
        );
      },
      { prefix: '/ws/streams/:streamId' },
    );
  }

  private handleGetOne = async (
    req: FastifyRequest<{ Params: { streamId: string } }>,
    res: FastifyReply,
  ) => {
    try {
      const stream = await this.streamsService.getOne(req.params.streamId);
      res.status(200).send({ data: stream });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        res.status(404).send({
          error: {
            message: error.message,
          },
        });
      } else if (error instanceof Error) {
        res.status(500).send({
          error: {
            message: error.message,
          },
        });
      }
      this.app.log.error(error);
    }
  };

  private handleGetActive = async (
    req: FastifyRequest<{ Params: { userId: string } }>,
    res: FastifyReply,
  ) => {
    try {
      const stream = await this.streamsService.getLiveByUserId(req.params.userId);
      res.status(200).send({ data: stream });
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        res.status(404).send({
          error: {
            message: error.message,
          },
        });
      } else if (error instanceof Error) {
        res.status(400).send({
          error: {
            message: error.message,
          },
        });
        this.app.log.error(error);
      }
    }
  };

  private handleGetList = async (
    req: FastifyRequest<{ Body: ListParams<Stream> }>,
    res: FastifyReply,
  ) => {
    try {
      const {
        limit = 10,
        offset = 0,
        filters = {},
        sort = [['startedAt', 'desc']],
      } = req.body ?? {};
      filters.isPrivate = false;
      //TODO: sanitize filter params
      const { streams, count } = await this.streamsService.getList({
        limit,
        offset,
        filters,
        sort,
      });

      res.status(200).send({ data: streams, meta: { limit, offset, count } });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({
          error: {
            message: error.message,
          },
        });
        this.app.log.error(error);
      }
    }
  };

  private handleGetThumbnail = async (
    req: FastifyRequest<{ Params: { streamId: string } }>,
    res: FastifyReply,
  ) => {
    const { streamId } = req.params;
    const filePath = path.join(StreamsController.THUMBNAILS_DIR, `${streamId}.jpg`);

    if (!existsSync(filePath)) {
      return res.header('content-type', 'image/jpg').sendFile('_placeholder.jpg');
    }

    return res.header('content-type', 'image/jpg').sendFile(`${streamId}.jpg`);
  };

  private handleCreate = async (
    req: FastifyRequest<{ Body?: { isPrivate?: boolean } }>,
    res: FastifyReply,
  ) => {
    try {
      const stream = await this.streamsService.create(
        req.context.userId as string,
        req.body?.isPrivate,
      );
      res.status(201).send({ data: stream });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).send({
          error: {
            message: error.message,
          },
        });
        this.app.log.error(error);
      }
    }
  };

  private handleChangeThumbnail = async (
    req: FastifyRequest<{ Params: { streamId: string } }>,
    res: FastifyReply,
  ) => {
    const { streamId } = req.params;
    const userId = req.context.userId;
    const stream = await this.streamsService.getOne(streamId);

    if (!stream || stream.userId !== userId) {
      return res.code(403).send({ error: { message: 'forbidden' } });
    }

    await this.streamsService.update({ id: streamId, thumbnailUpdatedAt: new Date() });
    const filename = `${streamId}.jpg`;
    const filePath = path.join(StreamsController.THUMBNAILS_DIR, filename);

    await writeFile(filePath, req.body as Buffer);

    return res.send({ ok: true });
  };

  private handleBroadcast = (
    socket: WebSocket,
    req: FastifyRequest<{ Params: { streamId: string } }>,
  ) => {
    const streamId = req.params.streamId;
    let status: StreamStatus.Connecting | StreamStatus.Reconnecting = StreamStatus.Connecting;
    const streamContext = this.streamsService.getContext(streamId);
    if (streamContext?.reconnectionId) {
      status = StreamStatus.Reconnecting;
      clearInterval(streamContext.reconnectionId);
      this.streamsService.setContext(streamId, { ...streamContext, reconnectionId: null });
    }
    void this.streamsService.update({ id: streamId, status });

    socket.on('message', (message) => {
      this.app.log.info(message.toString());
      void this.handleStreamerMessage({
        message: message.toString(),
        socket,
        streamId,
      });
    });

    socket.on('close', () => {
      this.app.log.info(`Streamer socket of 'stream:${streamId}' closed`);
      void this.handleStreamerSocketClose(streamId);
    });
  };

  private handleWatch = (
    socket: WebSocket,
    req: FastifyRequest<{ Params: { streamId: string } }>,
  ) => {
    const userId = req.context.userId as string;
    const streamId = req.params.streamId;
    const context = { viewerId: userId, streamId };

    socket.on('message', (message) => {
      this.app.log.info(message.toString());
      void this.handleViewerMessage({
        message: message.toString(),
        socket,
        context,
      });
    });

    socket.on('close', () => {
      this.app.log.info(
        `Viewer 'user:${context.viewerId}' socket of 'stream:${context.streamId}' closed`,
      );
      void this.handleViewerSocketClose(context);
    });
  };

  private handleStreamerMessage = async (data: {
    message: string;
    socket: WebSocket;
    streamId: string;
  }) => {
    const { message, socket, streamId } = data;
    const { method, params, requestId } = parseMessage(message) as WsRequestEnvelope;

    let streamContext;
    let stream;
    try {
      stream = await this.streamsService.requireStream(streamId);
      streamContext = await this.streamsService.requireContext(streamId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        socket.send(constructErrorResponse(method, { code: 404, msg: error.message }, requestId));
      } else if (error instanceof Error) {
        socket.send(constructErrorResponse(method, { code: 404, msg: error.message }, requestId));
      }
      this.app.log.error(error);
      return;
    }

    try {
      switch (method) {
        case StreamerActions.GetRtpCapabilities: {
          return socket.send(
            constructSuccessResponse(method, streamContext.router.rtpCapabilities, requestId),
          );
        }
        case CommonActions.CreateTransport: {
          const transport = await this.streamerService.createTransport(streamId, streamContext);
          return socket.send(
            constructSuccessResponse(
              method,
              {
                id: transport.id,
                iceParameters: transport.iceParameters,
                dtlsParameters: transport.dtlsParameters,
                iceCandidates: transport.iceCandidates,
              },
              requestId,
            ),
          );
        }
        case CommonActions.ConnectTransport: {
          await this.streamerService.connectTransport(streamContext, params.dtlsParameters);
          return socket.send(constructSuccessResponse(method, null, requestId));
        }
        case StreamerActions.Produce: {
          const { last, ...restParams } = params;
          const producer = await this.streamerService.produce(streamId, streamContext, restParams);
          if (last) {
            await this.streamsService.update({ id: streamId, status: StreamStatus.Live });
          }

          if (stream.status === 'reconnecting') {
            this.notifyViewers(streamId, {
              type: 'event',
              name: WsEvents.StreamerReconnected,
              data: { producerId: producer.id },
            });
          }

          return socket.send(
            constructSuccessResponse(method, { producerId: producer.id }, requestId),
          );
        }
        case StreamerActions.EndStream: {
          await this.streamsService.update({
            id: streamId,
            status: StreamStatus.Ended,
            endReason: StreamEndReason.StreamerStop,
            endedAt: new Date(),
          });
          return socket.send(constructSuccessResponse(method, null, requestId));
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        socket.send(
          constructErrorResponse(method, { code: 'unknown', msg: error.message }, requestId),
        );
        this.app.log.error(error);
      }
    }
  };

  private handleViewerMessage = async (data: {
    message: string;
    socket: WebSocket;
    context: { viewerId: string; streamId: string };
  }) => {
    const {
      message,
      socket,
      context: { viewerId, streamId },
    } = data;
    const { method, params, requestId } = parseMessage(message) as WsRequestEnvelope;
    let streamContext;
    try {
      await this.streamsService.requireStream(streamId);
      await this.usersService.requireUser(viewerId);
      streamContext = await this.streamsService.requireContext(streamId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        socket.send(constructErrorResponse(method, { code: 404, msg: error.message }, requestId));
      } else if (error instanceof Error) {
        socket.send(constructErrorResponse(method, { code: 500, msg: error.message }, requestId));
      }
      this.app.log.error(error);
      return;
    }

    const actionData = { viewerId, streamId, streamContext, socket };

    try {
      switch (method) {
        case ViewerActions.JoinStream: {
          await this.viewerService.joinStream(actionData);
          return socket.send(
            constructSuccessResponse(
              method,
              {
                producerIds: streamContext.producers!.map((producer) => producer.id),
                rtpCapabilities: streamContext.router.rtpCapabilities,
              },
              requestId,
            ),
          );
        }
        case ViewerActions.CreateTransport: {
          const transport = await this.viewerService.createTransport(actionData, params);
          return socket.send(
            constructSuccessResponse(
              method,
              {
                id: transport.id,
                iceParameters: transport.iceParameters,
                dtlsParameters: transport.dtlsParameters,
                iceCandidates: transport.iceCandidates,
              },
              requestId,
            ),
          );
        }
        case ViewerActions.ConnectTransport: {
          await this.viewerService.connectTransport(actionData, params);
          return socket.send(constructSuccessResponse(method, null, requestId));
        }
        case ViewerActions.Consume: {
          const { consumer, kind } = await this.viewerService.consume(actionData, params);
          return socket.send(
            constructSuccessResponse(
              method,
              {
                consumerId: consumer.id,
                rtpParameters: consumer.rtpParameters,
                kind,
              },
              requestId,
            ),
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        socket.send(
          constructErrorResponse(method, { code: 'unknown', msg: error.message }, requestId),
        );
        this.app.log.error(error);
      }
    }
  };

  private handleStreamerSocketClose = async (streamId: string): Promise<void> => {
    let reconnectingAttempts = 0;
    let stream;
    try {
      stream = await this.streamsService.getOne(streamId);
    } catch {
      return this.streamerService.releaseResources(streamId);
    }
    if (stream.status === StreamStatus.Ended) {
      this.notifyViewers(streamId, { type: 'event', name: WsEvents.StreamEnd, data: null });
      return this.streamerService.releaseResources(streamId);
    }

    const reconnectionId = setInterval(() => {
      if (reconnectingAttempts++ >= StreamsController.MAX_ATTEMPTS) {
        void this.streamsService
          .update({
            id: streamId,
            status: StreamStatus.Ended,
            endReason: StreamEndReason.Timeout,
            endedAt: new Date(),
          })
          .then(() => this.streamerService.releaseResources(streamId));
        this.notifyViewers(streamId, { type: 'event', name: WsEvents.StreamEnd, data: null });

        return clearInterval(reconnectionId);
      }
    }, 6000);
    const streamContext = this.streamsService.getContext(streamId);
    if (streamContext) {
      this.streamsService.setContext(streamId, { ...streamContext, reconnectionId });
    }

    this.notifyViewers(streamId, { type: 'event', name: WsEvents.StreamerDisconnect, data: null });
  };

  private handleViewerSocketClose = async (data: {
    viewerId: string;
    streamId: string;
  }): Promise<void> => {
    const { viewerId, streamId } = data;
    return this.viewerService.releaseResources(viewerId, streamId);
  };

  private notifyViewers(streamId: string, event: WsEvent) {
    const streamContext = this.streamsService.getContext(streamId);
    if (!streamContext) return;
    Object.values(streamContext.viewers).forEach(({ socket }) => {
      socket.send(constructEvent(event));
    });
  }
}
