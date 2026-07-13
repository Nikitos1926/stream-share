import mediasoup from 'mediasoup';
import type { Router, WebRtcTransport, Worker } from 'mediasoup/types';
import os from 'os';

export type TransportRole = 'send' | 'recv';

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
    for (let i = 0; i < os.cpus().length; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: 'warn',
        rtcMinPort: 40000,
        rtcMaxPort: 49999,
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
            'x-google-start-bitrate': 1000,
          },
        },
      ],
    });

    return router;
  }

  async createTransport(router: Router, direction: TransportRole): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenIps: [{ ip: '0.0.0.0', announcedIp: '127.0.0.1' }],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      appData: { direction },
    });

    return transport;
  }
}
