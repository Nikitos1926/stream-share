# ДОДАТОК А Лістинг програми

<!-- Generated from commit 7c2f481 by the appendix script in the thesis tools directory. Do not edit by hand. -->

У додатку наведено вихідний код ключових модулів програмної системи stream-share у версії від
25.09.2026. Пропущені фрагменти (імпорти, допоміжний код, а також код, уже наведений в основній
частині роботи) позначено рядком коментаря з трикрапкою. Вихідні тексти всіх діаграм PlantUML,
наведених у роботі, зберігаються в репозиторії проєкту поруч із відповідними зображеннями.

Далі наведено клас слідування за вікнами застосунку в настільному застосунку (лістинг @lst:a-source-follower).

```{#lst:a-source-follower .ts caption="Клас SourceFollower настільного застосунку"}
// ...
export const POLL_INTERVAL_MS = 1500;
export const RETURN_GRACE_MS = 4000;
export const RETURN_WAIT_MS = 20_000;

export type WindowSource = { id: string; name: string };

export type FollowerDeps = {
  listWindows: () => Promise<WindowSource[]>;
  listProcesses: () => Promise<ProcessTable>;
  resolvePid: (sourceId: string) => number;
  setSelectedSourceId: (sourceId: string) => void;
  emit: (payload: SourceChanged) => void;
};

type Anchor = {
  sourceId: string;
  pid: number;
  exe: string;
  familyRoot: number;
  startedAt: Date;
};
type Active = { sourceId: string; pid: number; name: string };
type PidWindow = WindowSource & { pid: number };

export class SourceFollower {
  private enabled = true;
  private anchor: Anchor | null = null;
  private active: Active | null = null;
  private knownWindowIds = new Set<string>();
  private needsReseed = false;
  private pendingReturnSince: number | null = null;
  private lastReturnAt = 0;
  private lastError: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private ticking = false;
  private generation = 0;

  constructor(private readonly deps: FollowerDeps) {}

  getState(): FollowState {
    return {
      enabled: this.enabled,
      following: this.active !== null,
      activeName: this.active?.name ?? null,
      lastError: this.lastError,
    };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopPolling();
      this.active = null;
      this.pendingReturnSince = null;
      return;
    }
    this.lastError = null;
    if (this.anchor) {
      this.needsReseed = true;
      this.startPolling();
    }
  }

  async onSourcePicked(sourceId: string): Promise<void> {
    this.stop();
    const gen = this.generation;
    if (!sourceId.startsWith('window:')) return;

    const pid = this.deps.resolvePid(sourceId);
    if (!pid) {
      log.warn('[follower] could not resolve a pid for', sourceId);
      return;
    }

    try {
      const table = await this.deps.listProcesses();
      if (gen !== this.generation) return;
      if (isShellProcess(table, pid)) {
        log.info('[follower] not following a shell process window', table.get(pid)?.name);
        return;
      }
      const familyRoot = findFamilyRoot(table, pid);
      if (familyRoot === null) {
        log.warn('[follower] pid not in process table', pid);
        return;
      }
      const windows = await this.deps.listWindows();
      if (gen !== this.generation) return;
      this.knownWindowIds = new Set(windows.map((w) => w.id));
      this.anchor = {
        sourceId,
        pid,
        exe: table.get(pid)?.name ?? '',
        familyRoot,
        startedAt: new Date(),
      };
      log.info('[follower] anchored', { sourceId, pid, familyRoot: table.get(familyRoot)?.name });
      if (this.enabled) this.startPolling();
    } catch (err) {
      if (gen === this.generation) this.fail(err);
    }
  }

  async resolveEnded(): Promise<SourceChanged> {
    const anchor = this.anchor;
    if (!this.enabled || !anchor) return { reason: 'lost' };
    const gen = this.generation;
    let windows: WindowSource[] = [];
    try {
      windows = await this.deps.listWindows();
    } catch (err) {
      log.warn('[follower] listWindows failed in resolveEnded', err);
    }
    if (gen !== this.generation) return { reason: 'noop' };
    this.knownWindowIds = new Set(windows.map((w) => w.id));

    if (this.active) return this.beginReturn(windows);
    if (this.pendingReturnSince !== null) return { reason: 'noop' };
    const anchorListed = windows.some((w) => w.id === anchor.sourceId);
    if (anchorListed && Date.now() - this.lastReturnAt < RETURN_GRACE_MS) return { reason: 'noop' };

    log.info('[follower] captured window closed, stopping');
    this.stop();
    return { reason: 'lost' };
  }

  stop(): void {
    this.generation += 1;
    this.stopPolling();
    this.anchor = null;
    this.active = null;
    this.pendingReturnSince = null;
    this.knownWindowIds.clear();
  }

  private startPolling(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), POLL_INTERVAL_MS);
  }

  private stopPolling(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.ticking || !this.anchor) return;
    this.ticking = true;
    const gen = this.generation;
    try {
      const windows = await this.deps.listWindows();
      if (gen !== this.generation) return;
      const ids = new Set(windows.map((w) => w.id));
      if (this.needsReseed) {
        this.knownWindowIds = ids;
        this.needsReseed = false;
        return;
      }
      const appeared = windows.filter((w) => !this.knownWindowIds.has(w.id));
      const gone = [...this.knownWindowIds].filter((id) => !ids.has(id));
      this.knownWindowIds = ids;

      if (this.active && gone.includes(this.active.sourceId)) {
        const result = this.beginReturn(windows);
        if (result.reason === 'return') this.deps.emit(result);
      }

      if (appeared.length > 0) await this.considerNewWindows(appeared, gen);
      if (gen !== this.generation) return;

      if (
        this.pendingReturnSince !== null &&
        Date.now() - this.pendingReturnSince > RETURN_WAIT_MS
      ) {
        log.info('[follower] anchor did not come back, giving up');
        this.stop();
        this.deps.emit({ reason: 'lost' });
      }
    } catch (err) {
      if (gen === this.generation) this.fail(err);
    } finally {
      this.ticking = false;
    }
  }

  private beginReturn(windows: WindowSource[]): SourceChanged {
    this.active = null;
    const target = this.findReturnTarget(windows);
    if (target) return this.completeReturn(target);
    if (this.pendingReturnSince === null) {
      this.pendingReturnSince = Date.now();
      log.info('[follower] anchor not visible, waiting for it to come back');
    }
    return { reason: 'noop' };
  }

  private findReturnTarget(windows: WindowSource[]): WindowSource | undefined {
    const anchor = this.anchor;
    if (!anchor) return undefined;
    return (
      windows.find((w) => w.id === anchor.sourceId) ??
      windows.find((w) => this.deps.resolvePid(w.id) === anchor.pid)
    );
  }

  private completeReturn(target: WindowSource): SourceChanged {
    this.pendingReturnSince = null;
    this.active = null;
    this.deps.setSelectedSourceId(target.id);
    if (this.anchor) this.anchor = { ...this.anchor, sourceId: target.id };
    this.lastReturnAt = Date.now();
    log.info('[follower] returned to', target.name, target.id);
    return { reason: 'return', sourceId: target.id, name: target.name };
  }

  private async considerNewWindows(appeared: WindowSource[], gen: number): Promise<void> {
    const anchor = this.anchor;
    if (!anchor) return;

    const withPid: PidWindow[] = appeared
      .map((w) => ({ ...w, pid: this.deps.resolvePid(w.id) }))
      .filter((w) => w.pid !== 0);

    const ownWindow = withPid.find((w) => w.pid === anchor.pid);
    if (ownWindow && this.pendingReturnSince !== null) {
      this.deps.emit(this.completeReturn(ownWindow));
      return;
    }

    const others = withPid.filter((w) => w.pid !== anchor.pid);
    if (others.length === 0) return;

    const table = await this.deps.listProcesses();
    if (gen !== this.generation) return;
    const anchorAlive = table.has(anchor.pid);

    const candidates: (PidWindow & { createdAt: Date })[] = [];
    for (const w of others) {
      const info = table.get(w.pid);
      if (!info) continue;
      if (!isInFamily(table, w.pid, anchor.familyRoot)) continue;
      if (info.createdAt <= anchor.startedAt) continue;

      const sameExe = info.name.toLowerCase() === anchor.exe.toLowerCase();
      if (sameExe && !anchorAlive) {
        // The anchor process was replaced (League's "close client during game").
        this.anchor = { ...anchor, sourceId: w.id, pid: w.pid };
        log.info('[follower] anchor relaunched as', w.name, w.id);
        if (this.pendingReturnSince !== null) this.deps.emit(this.completeReturn(w));
        return;
      }
      if (sameExe) continue;
      candidates.push({ ...w, createdAt: info.createdAt });
    }
    if (candidates.length === 0) return;

    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const winner = candidates[0]!;
    if (this.active?.sourceId === winner.id) return;

    this.pendingReturnSince = null;
    this.active = { sourceId: winner.id, pid: winner.pid, name: winner.name };
    this.deps.setSelectedSourceId(winner.id);
    log.info('[follower] following', winner.name, winner.id);
    this.deps.emit({ reason: 'follow', sourceId: winner.id, name: winner.name });
  }

  private fail(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    log.error('[follower] disabled after error:', message);
    this.stop();
    this.enabled = false;
    this.lastError = message;
    this.deps.emit({ reason: 'error', message });
  }
}
```

Далі наведено сервіс сервера сигналізації, що створює процеси-обробники, маршрутизатори й транспорти mediasoup та обмежує їхній бітрейт (лістинг @lst:a-mediasoup).

```{#lst:a-mediasoup .ts caption="Клас MediasoupService сервера сигналізації (скорочено)"}
// ...
export type TransportRole = 'send' | 'recv';

const RTC_MIN_PORT = env.MEDIASOUP_RTC_MIN_PORT;
const RTC_MAX_PORT = env.MEDIASOUP_RTC_MAX_PORT;
const NUM_WORKERS = env.MEDIASOUP_NUM_WORKERS;
const ANNOUNCED_IP = env.MEDIASOUP_ANNOUNCED_IP;
const INITIAL_OUTGOING_BITRATE = env.MEDIASOUP_INITIAL_OUTGOING_BITRATE;
const MAX_INCOMING_BITRATE = env.MEDIASOUP_MAX_INCOMING_BITRATE;
/** `x-google-start-bitrate` is kbit/s, so the same start as BWE expressed in its unit. */
const START_BITRATE_KBPS = Math.round(INITIAL_OUTGOING_BITRATE / 1000);

export class MediasoupService {
  private readonly workers: Worker[] = [];
  constructor() {}

  async pickLeastLoadedWorker(): Promise<Worker> {
    if (!this.workers.length) {
      throw new Error('Workers is empty');
    }

    const usages = await Promise.all(
      this.workers.map(async (w) => ({
        entry: w,
        usage: await w.getResourceUsage(),
      })),
    );
    usages.sort((a, b) => a.usage.ru_utime - b.usage.ru_utime);

    return usages[0]!.entry;
  }

  async createWorkers(): Promise<Worker[]> {
    for (let i = 0; i < NUM_WORKERS; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: RTC_MIN_PORT,
        rtcMaxPort: RTC_MAX_PORT,
      });
      this.workers.push(worker);
    }

    return this.workers;
  }

  async createRouter(): Promise<Router> {
    const worker = await this.pickLeastLoadedWorker();

    const router = await worker.createRouter({
      mediaCodecs: [
        {
          kind: 'audio',
          mimeType: 'audio/opus',
          clockRate: 48000,
          channels: 2,
        },
        /**
         * H.264 first: it is the only codec every browser and Electron encode
         * in hardware, and hardware encoding is what makes 1080p60, 1440p60
         * and 4K source streams sustainable. Chrome's software VP8 (libvpx)
         * cannot hold those modes and silently degrades them.
         *
         * Baseline (42001f) before Constrained Baseline (42e01f), deliberately:
         * Chromium's hardware encoder factory only advertises Baseline, Main
         * and High, while Constrained Baseline comes solely from its OpenH264
         * software encoder. Offering 42e01f first therefore forces software
         * encoding in Chrome, Edge and Electron (verified against Chrome 152
         * with NVENC). Baseline is still decodable by the Chromium family and
         * Firefox; 42e01f stays as the fallback for endpoints without it.
         *
         * `level-asymmetry-allowed` lets endpoints encode above level 3.1
         * (1440p60 is level 5.1) without renegotiation.
         */
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42001f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': START_BITRATE_KBPS,
          },
        },
        {
          kind: 'video',
          mimeType: 'video/H264',
          clockRate: 90000,
          parameters: {
            'packetization-mode': 1,
            'profile-level-id': '42e01f',
            'level-asymmetry-allowed': 1,
            'x-google-start-bitrate': START_BITRATE_KBPS,
          },
        },
        /** Software fallback for endpoints without H.264. */
        {
          kind: 'video',
          mimeType: 'video/VP8',
          clockRate: 90000,
          parameters: {
            'x-google-start-bitrate': START_BITRATE_KBPS,
          },
        },
      ],
    });

    return router;
  }

  async createTransport(
    router: Router,
    direction: TransportRole,
    videoMaxBitrate?: number,
  ): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: ANNOUNCED_IP }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: this.initialOutgoingBitrate(videoMaxBitrate),
      appData: { direction },
    });

    return transport;
  }

  /**
   * Where bandwidth estimation starts on a transport (bit/s). When the stream's
   * video budget is known — viewer transports, created after the broadcaster
   * produced — it is the same fraction of that budget the sender's encoder opens
   * at, so a 4K stream does not start a viewer at a 1080p estimate. Never below
   * the configured floor, never above what we accept from the broadcaster.
   */
  private initialOutgoingBitrate(videoMaxBitrate?: number): number {
    if (!videoMaxBitrate || !Number.isFinite(videoMaxBitrate) || videoMaxBitrate <= 0) {
      return INITIAL_OUTGOING_BITRATE;
    }
    const proportional = startBitrateFor(Math.min(videoMaxBitrate, MAX_VIDEO_BITRATE));
    return Math.max(proportional, INITIAL_OUTGOING_BITRATE);
  }

  /**
   * Caps what the remote endpoint is told it may send us (REMB / transport-cc).
   * Only meaningful once the transport is connected, so callers apply it there.
   */
  async limitIncomingBitrate(transport: WebRtcTransport): Promise<void> {
    await transport.setMaxIncomingBitrate(MAX_INCOMING_BITRATE);
  }

  /**
   * The invariant of ADR 0001: the cap we advertise to the broadcaster must stay
   * at or above the sender's own ceiling plus overhead, or we silently clamp a
   * mode the app lets people pick. Lowering it is a legitimate operator choice on
   * a thin uplink, so this warns instead of refusing to start.
   */
  static bitrateConfigWarning(): string | null {
    if (MAX_INCOMING_BITRATE >= MIN_SERVER_INCOMING_BITRATE) return null;
    return (
      `MEDIASOUP_MAX_INCOMING_BITRATE=${MAX_INCOMING_BITRATE} is below ` +
      `${MIN_SERVER_INCOMING_BITRATE} (the ${MAX_VIDEO_BITRATE} bit/s sender ceiling plus ` +
      'overhead): the SFU will clamp broadcasters in the highest quality modes.'
    );
  }
}
```

Далі наведено фрагмент контролера трансляцій сервера сигналізації з маршрутами та обробниками повідомлень WebSocket стримера й глядача (лістинг @lst:a-streams-ws).

```{#lst:a-streams-ws .ts caption="Маршрути та обробники WebSocket класу StreamsController (фрагмент)"}
// ...

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
// ...
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

// ...
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
```

Далі наведено хук сторінки трансляції вебзастосунку, що керує захопленням і публікацією медіапотоків стримера (лістинг @lst:a-use-streamer).

```{#lst:a-use-streamer .ts caption="Хук useStreamer сторінки трансляції (скорочено)"}
// ...
const DEFAULT_VIDEO_SETTINGS: VideoSettings = { quality: StreamQuality.HD, fps: 30 };

export function useStreamer() {
// ...
  const applyVideoSettings = useCallback(
    async (track: MediaStreamTrack, producer?: Producer) => {
      const derived = deriveEncodingForTrack(track);
      track.contentHint = derived.contentHint;
      try {
        await track.applyConstraints({ frameRate: derived.frameRate });
      } catch (e) {
        console.warn('[applyVideoSettings] applyConstraints failed:', e);
      }

      if (!producer?.rtpSender) return;
      const parameters = producer.rtpSender.getParameters();
      await producer.rtpSender.setParameters({
        ...parameters,
        degradationPreference: derived.degradationPreference,
        encodings: [{ ...parameters.encodings[0], ...derived.encoding }],
      });
    },
    [deriveEncodingForTrack],
  );

  const createProducer = useCallback(
    async (track: MediaStreamTrack) => {
      let producerOptions: ProducerOptions = { track };
      if (track.kind === 'video') {
        const derived = deriveEncodingForTrack(track);
        producerOptions = {
          ...producerOptions,
          codec: pickVideoCodec(deviceRef.current?.rtpCapabilities.codecs),
          encodings: [derived.encoding],
          codecOptions: { videoGoogleStartBitrate: derived.startBitrateKbps },
        };
      }
      const producer = await transportRef.current!.produce(producerOptions);
      if (track.kind === 'audio' && isMuted) {
        producer.pause();
      }
      if (track.kind === 'video') await applyVideoSettings(track, producer);
      producersRef.current.push(producer);
    },
    [applyVideoSettings, deriveEncodingForTrack, isMuted],
  );

  const replaceStream = useCallback(
    async (stream: MediaStream) => {
      return Promise.all(
        stream.getTracks().map(async (track) => {
          const producer = producersRef.current.find((p) => p.kind === track.kind);
          if (!producer) return createProducer(track);

          if (!track) return producer.pause();

          await producer.replaceTrack({ track: track });
          if (producer.kind === 'video') await applyVideoSettings(track, producer);
          if (producer.kind !== 'audio' || !isMuted) {
            producer.resume();
          }
        }),
      );
    },
    [applyVideoSettings, createProducer, isMuted],
  );
// ...
  const connectToStream = useCallback(
    async (stream: Stream) => {
      if (!mediaStreamRef.current) {
        toast.error('Stream is not created yet');
        return;
      }
      const isTrackByKindSent = Object.fromEntries(
        mediaStreamRef.current.getTracks().map((t) => [t.kind, false]),
      );

      wsClientRef.current = new WsClient(signalingWsUrl(`/ws/streams/${stream.id}/broadcast`));
      wsClientRef.current.ws.addEventListener('close', handleSocketClose);

      const { result: rtpCapabilities } = await wsClientRef.current.request({
        type: 'req',
        method: StreamerActions.GetRtpCapabilities,
        params: null,
      });

      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      const { result: transport } = await wsClientRef.current.request({
        type: 'req',
        method: StreamerActions.CreateTransport,
        params: { direction: 'send' },
      });

      transportRef.current = device.createSendTransport(transport);

      transportRef.current.on('connect', ({ dtlsParameters }, callback, errorCallback) => {
        wsClientRef
          .current!.request({
            type: 'req',
            method: StreamerActions.ConnectTransport,
            params: { dtlsParameters },
          })
          .then(() => callback())
          .catch(errorCallback);
      });

      transportRef.current.on('produce', ({ kind, rtpParameters }, callback, errorCallback) => {
        isTrackByKindSent[kind] = true;
        const videoTrack = kind === 'video' ? mediaStreamRef.current?.getVideoTracks()[0] : null;
        wsClientRef
          .current!.request({
            type: 'req',
            method: StreamerActions.Produce,
            params: {
              rtpParameters,
              kind,
              last: Object.values(isTrackByKindSent).every((e) => e === true),
              maxBitrate: videoTrack
                ? deriveEncodingForTrack(videoTrack).encoding.maxBitrate
                : undefined,
            },
          })
          .then((res) => callback({ id: res.result.producerId }))
          .catch(errorCallback);
      });

      await Promise.all(mediaStreamRef.current.getTracks().map(createProducer));
      setStatus(StreamStatus.Live);

      return stream;
    },
    [createProducer, deriveEncodingForTrack, handleSocketClose],
  );

  const broadcast = useCallback(async () => {
    const stream = await createStream(isPrivate);
    if (!stream) return;
    await connectToStream(stream);
    setCurrentStream(stream);
    stopCapturingThumbnailRef.current = startCapturingThumbnail(stream.id);
  }, [connectToStream, isPrivate, startCapturingThumbnail]);
// ...
```

Далі наведено модуль входу через Google у системному браузері головного процесу настільного застосунку (лістинг @lst:a-google-auth).

```{#lst:a-google-auth .ts caption="Вхід через Google у системному браузері в настільному застосунку (скорочено)"}
// ...
const SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;

export type GoogleSignInResult =
  | { status: 'success'; code: string; verifier: string }
  | { status: 'cancelled' }
  | { status: 'timeout' }
  | { status: 'error'; message: string };

type Pending = {
  server: Server;
  settle: (result: GoogleSignInResult) => void;
  /** Handed to any later caller that arrives while this attempt is running. */
  result: Promise<GoogleSignInResult>;
};

let pending: Pending | null = null;

const base64url = (bytes: Buffer) => bytes.toString('base64url');
// ...
export function startGoogleSignIn(window: BrowserWindow): Promise<GoogleSignInResult> {
  if (pending) return pending.result;

  const verifier = base64url(randomBytes(32));
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = base64url(randomBytes(16));

  const server = createServer();

  let settleAttempt: (result: GoogleSignInResult) => void = () => {};

  const attempt = new Promise<GoogleSignInResult>((resolve) => {
    let done = false;
    const settle = (result: GoogleSignInResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (pending?.server === server) pending = null;
      server.close();
      server.closeAllConnections();
      resolve(result);
    };

    const timer = setTimeout(() => settle({ status: 'timeout' }), SIGN_IN_TIMEOUT_MS);

    server.on('error', (error) =>
      settle({ status: 'error', message: error.message || 'The sign-in listener failed' }),
    );

    server.on('request', (req, res) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (url.pathname !== '/callback') {
        respond(res, 404, 'Not found.');
        return;
      }

      if (url.searchParams.get('state') !== state) {
        respond(res, 400, 'This sign-in link does not belong to this app.');
        return;
      }

      const error = url.searchParams.get('error');
      const code = url.searchParams.get('code');
      if (error || !code) {
        respond(res, 200, 'Sign-in was not completed. You can close this tab and try again.', () =>
          settle({
            status: 'error',
            message:
              error === 'access_denied'
                ? 'The browser did not finish signing in to a Stream Share account.'
                : 'The browser could not complete the sign-in.',
          }),
        );
        return;
      }

      bringWindowToFront(window);

      respond(res, 200, 'Signed in. You can close this tab and return to Stream Share.', () =>
        settle({ status: 'success', code, verifier }),
      );
    });

    settleAttempt = settle;

    void (async () => {
      try {
        const port = await listen(server);

        if (done) {
          server.close();
          return;
        }

        const url = new URL('/api/desktop-auth/start', __WEB_URL__);
        url.searchParams.set('port', String(port));
        url.searchParams.set('state', state);
        url.searchParams.set('challenge', challenge);

        await shell.openExternal(url.toString());
      } catch (error) {
        settle({
          status: 'error',
          message: error instanceof Error ? error.message : 'Could not open the browser',
        });
      }
    })();
  });

  pending = { server, settle: settleAttempt, result: attempt };

  return attempt;
}

export function cancelGoogleSignIn(): void {
  pending?.settle({ status: 'cancelled' });
  pending = null;
}
```
