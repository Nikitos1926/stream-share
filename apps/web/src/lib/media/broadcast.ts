import { StreamerActions } from '@stream-share/shared';
import { Device } from 'mediasoup-client';
import { WsClient } from './WsClient';
import { Stream } from '@stream-share/db';

export type BroadcastSession = {
  streamId: string;
  stream: MediaStream;
  stop: () => Promise<void>;
};

export async function startBroadcast(): Promise<MediaStream> {
  const response = await fetch('http://localhost:4000/streams', {
    method: 'post',
    credentials: 'include',
  });
  const { data } = (await response.json()) as { data: Stream };
  console.log(data);

  const ws = new WsClient(`ws://localhost:4000/ws/streams/${data.id}/broadcast`);
  const { result: rtpCapabilities } = await ws.request({
    type: 'req',
    method: StreamerActions.GetRtpCapabilities,
    params: null,
  });

  const device = new Device();
  device.load({ routerRtpCapabilities: rtpCapabilities });

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: 1920, height: 1080, frameRate: 30 },
    audio: true,
  });

  const { result: createTransportResult } = await ws.request({
    type: 'req',
    method: StreamerActions.CreateTransport,
    params: { direction: 'send' },
  });

  const transport = device.createSendTransport(createTransportResult);

  transport.on('connect', ({ dtlsParameters }, callback, errorCallback) => {
    ws.request({
      type: 'req',
      method: StreamerActions.ConnectTransport,
      params: { dtlsParameters },
    })
      .then(() => callback())
      .catch(errorCallback);
  });

  transport.on('produce', ({ kind, rtpParameters }, callback, errorCallback) => {
    ws.request({
      type: 'req',
      method: StreamerActions.Produce,
      params: { rtpParameters, kind },
    })
      .then((res) => callback({ id: res.result.producerId }))
      .catch(errorCallback);
  });

  await Promise.all(
    stream.getTracks().map(async (track) => {
      const producer = await transport!.produce({ track });
    }),
  );

  return stream;
}
