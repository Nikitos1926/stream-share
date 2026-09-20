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
