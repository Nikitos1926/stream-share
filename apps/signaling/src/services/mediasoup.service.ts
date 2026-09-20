import { env } from '@stream-share/env/signaling';
import {
  MAX_VIDEO_BITRATE,
  MIN_SERVER_INCOMING_BITRATE,
  startBitrateFor,
} from '@stream-share/shared';
import mediasoup from 'mediasoup';
import type { Router, WebRtcTransport, Worker } from 'mediasoup/types';

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
