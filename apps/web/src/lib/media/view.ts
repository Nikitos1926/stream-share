'use client';
import { ViewerActions } from '@stream-share/shared';
import { Device } from 'mediasoup-client';
import { WsClient } from './WsClient';

export type ViewSession = {
  stop: () => void;
};

export async function startView(
  streamId: string,
  onTrack: (track: MediaStreamTrack) => void,
): Promise<void> {
  const ws = new WsClient(`ws://localhost:4000/ws/streams/${streamId}/watch`);

  const { result: joined } = await ws.request({
    type: 'req',
    method: ViewerActions.JoinStream,
    params: null,
  });

  const device = new Device();
  await device.load({ routerRtpCapabilities: joined.rtpCapabilities });

  const { result: transportInfo } = await ws.request({
    type: 'req',
    method: ViewerActions.CreateTransport,
    params: { direction: 'recv' },
  });

  const recvTransport = device.createRecvTransport(transportInfo);

  recvTransport.on('connect', ({ dtlsParameters }, callback, errorCallback) => {
    ws.request({ type: 'req', method: ViewerActions.ConnectTransport, params: { dtlsParameters } })
      .then(() => callback())
      .catch(errorCallback);
  });

  for (const producerId of joined.producerIds) {
    const { result: consumed } = await ws.request({
      type: 'req',
      method: ViewerActions.Consume,
      params: { rtpCapabilities: device.recvRtpCapabilities, producerId },
    });

    const consumer = await recvTransport.consume({
      id: consumed.consumerId,
      producerId,
      kind: consumed.kind,
      rtpParameters: consumed.rtpParameters,
    });

    onTrack(consumer.track);
  }
}
