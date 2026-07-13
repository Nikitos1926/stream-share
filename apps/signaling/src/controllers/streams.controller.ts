import { WebSocket } from '@fastify/websocket';
import {
  CommonActions,
  constructErrorResponse,
  constructEvent,
  constructSuccessResponse,
  parseMessage,
  StreamerActions,
  ViewerActions,
  WsEvents,
  WsEventsValues,
  WsRequestEnvelope,
} from '@stream-share/shared';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateWsJwt } from '../auth/validators';
import { ListParams } from '../repositories/streams.repository';
import { StreamersService } from '../services/streamers.service';
import { StreamsService } from '../services/streams.service';
import { ViewersService } from '../services/viewers.service';

export class StreamsController {
  private static readonly MAX_ATTEMPTS = 5;
  constructor(
    private readonly app: FastifyInstance,
    private readonly streamsService: StreamsService,
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

        app.post('/', this.handleCreateStream);

        app.post<{ Body: ListParams }>('/search', this.handleGetStreams);
      },
      { prefix: '/streams' },
    );

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

  private handleGetStreams = async (
    req: FastifyRequest<{ Body: ListParams }>,
    res: FastifyReply,
  ) => {
    try {
      const {
        limit = 10,
        offset = 0,
        filters = {},
        sort = [['startedAt', 'desc']],
      } = req.body ?? {};
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

  private handleCreateStream = async (req: FastifyRequest, res: FastifyReply) => {
    try {
      const stream = await this.streamsService.createStream(req.context.userId as string);
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

  private handleBroadcast = (
    socket: WebSocket,
    req: FastifyRequest<{ Params: { streamId: string } }>,
  ) => {
    const streamId = req.params.streamId;
    void this.streamsService.updateStream({ id: streamId, status: 'connecting' });

    socket.on('message', (message) => {
      void this.handleStreamerMessage({
        message: message.toString(),
        socket,
        streamId,
      });
    });

    socket.on('close', () => {
      void this.handleStreamerSocketClose(streamId);
    });
  };

  private handleWatch = (
    socket: WebSocket,
    req: FastifyRequest<{ Params: { streamId: string } }>,
  ) => {
    const context = { viewerId: req.context.userId as string, streamId: req.params.streamId };
    socket.on('message', (message) => {
      void this.handleViewerMessage({
        message: message.toString(),
        socket,
        context,
      });
    });

    socket.on('close', () => {
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

    const streamContext = await this.streamsService.requireContext(streamId);

    try {
      switch (method) {
        case StreamerActions.GetRtpCapabilities:
          return socket.send(
            constructSuccessResponse(method, streamContext.router.rtpCapabilities, requestId),
          );
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
          const producer = await this.streamerService.produce(streamId, streamContext, params);
          await this.streamsService.updateStream({ id: streamId, status: 'live' });

          return socket.send(
            constructSuccessResponse(method, { producerId: producer.id }, requestId),
          );
        }
        case StreamerActions.CloseProducer: {
          this.streamerService.closeProducer();
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
    const streamContext = await this.streamsService.requireContext(streamId);
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
    const stream = await this.streamsService.getOne(streamId);
    if (stream.status === 'ended') {
      return this.streamerService.releaseResources(streamId);
    }
    const reconnectionId = setInterval(() => {
      if (reconnectingAttempts++ >= StreamsController.MAX_ATTEMPTS) {
        void this.streamsService
          .updateStream({
            id: streamId,
            status: 'ended',
            endReason: 'timeout',
          })
          .then(() => this.streamerService.releaseResources(streamId));
        this.notifyViewers(streamId, WsEvents.StreamEnd);

        return clearInterval(reconnectionId);
      }
    }, 1000);

    this.notifyViewers(streamId, WsEvents.StreamerDisconnect);
  };

  private handleViewerSocketClose = async (data: {
    viewerId: string;
    streamId: string;
  }): Promise<void> => {
    const { viewerId, streamId } = data;
    const stream = await this.streamsService.getOne(streamId);
    let reconnectingAttempts = 0;

    if (stream.status === 'ended') return;
    const reconnectionId = setInterval(() => {
      if (reconnectingAttempts++ >= StreamsController.MAX_ATTEMPTS) {
        void this.viewerService.releaseResources(viewerId, streamId);
        return clearInterval(reconnectionId);
      }
    }, 1000);
  };

  private notifyViewers(streamId: string, eventName: WsEventsValues) {
    const streamContext = this.streamsService.getContext(streamId);
    if (!streamContext) return;
    Object.values(streamContext.viewers).forEach(({ socket }) => {
      socket.send(constructEvent({ name: eventName }));
    });
  }
}
