import { ViewerActions, WsEvent, WsEventsType } from '@stream-share/shared';
import { Device } from 'mediasoup-client';
import { Consumer, RtpCapabilities, Transport } from 'mediasoup-client/types';
import { useCallback, useRef, useState } from 'react';
import { WsClient } from '../media/WsClient';
import { StreamStatus } from './useStreamer';
import toast from 'react-hot-toast';

export function useViewer() {
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [isPlayVisible, setIsPlayVisible] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsClientRef = useRef<WsClient>(null);
  const transportRef = useRef<Transport>(null);
  const consumersRef = useRef<Consumer[]>([]);
  const streamRef = useRef<MediaStream>(null);
  const deviceRef = useRef<Device>(null);
  const intervalRef = useRef<NodeJS.Timeout>(null);
  const streamerReconnectedDisposerRef = useRef<() => void>(null);
  const streamerEndDisposerRef = useRef<() => void>(null);

  const playVideo = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current
      .play()
      .then(() => setIsPlayVisible(false))
      .catch(() => toast.error('Cannot play video'));
  }, []);

  const setMediaStreamToVideo = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => setIsPlayVisible(true));
  }, []);

  const releaseResources = useCallback(() => {
    consumersRef.current.forEach((c) => c.close());
    transportRef.current?.close();
    consumersRef.current = [];
    transportRef.current = null;
    wsClientRef.current = null;
    streamRef.current = null;
  }, []);

  const onTrack = useCallback(
    (track: MediaStreamTrack) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (!streamRef.current) streamRef.current = new MediaStream();

      streamRef.current.addTrack(track);
      if (videoRef.current) {
        setMediaStreamToVideo();
      } else {
        intervalRef.current = setInterval(() => {
          if (videoRef.current) {
            setMediaStreamToVideo();
            clearInterval(intervalRef.current!);
          }
        }, 100);
      }
      setStatus(StreamStatus.Live);
    },
    [setMediaStreamToVideo],
  );

  const createConsumer = useCallback(
    async (producerId: string, rtpCapabilities: RtpCapabilities) => {
      if (!wsClientRef.current || !transportRef.current) return;

      const { result: consumed } = await wsClientRef.current!.request({
        type: 'req',
        method: ViewerActions.Consume,
        params: { rtpCapabilities, producerId },
      });

      if (!transportRef.current) return;

      const consumer = await transportRef.current!.consume({
        id: consumed.consumerId,
        producerId,
        kind: consumed.kind,
        rtpParameters: consumed.rtpParameters,
      });

      consumersRef.current.push(consumer);
      onTrack(consumer.track);
    },
    [onTrack],
  );

  const handleSocketClose = useCallback(() => {
    releaseResources();
    setStatus(StreamStatus.Unavailable);
  }, [releaseResources]);

  const handleStreamerReconnected = useCallback(
    (event: Extract<WsEvent, { name: WsEventsType['StreamerReconnected'] }>) => {
      if (!deviceRef.current) return;

      consumersRef.current.forEach((c) => c.close());
      consumersRef.current = [];

      streamRef.current?.getTracks().forEach((t) => streamRef.current?.removeTrack(t));

      createConsumer(event.data.producerId, deviceRef.current.recvRtpCapabilities).catch(
        (error) => {
          console.error('Failed to recreate consumer after streamer reconnect', error);
          setStatus(StreamStatus.Unavailable);
        },
      );
    },
    [createConsumer],
  );

  const handleStreamEnd = useCallback(() => {
    setStatus(StreamStatus.Ended);
    if (!wsClientRef.current) return;

    streamerReconnectedDisposerRef.current?.();
    streamerEndDisposerRef.current?.();
    wsClientRef.current.ws.removeEventListener('close', handleSocketClose);
    wsClientRef.current.close();
    releaseResources();
  }, [handleSocketClose, releaseResources]);

  const watch = useCallback(
    async (streamId: string) => {
      setStatus(StreamStatus.Connecting);
      wsClientRef.current = new WsClient(`ws://localhost:4000/ws/streams/${streamId}/watch`);
      wsClientRef.current.ws.addEventListener('close', handleSocketClose);
      streamerReconnectedDisposerRef.current = wsClientRef.current.on(
        'streamerReconnected',
        handleStreamerReconnected,
      );
      streamerEndDisposerRef.current = wsClientRef.current.on('streamEnd', handleStreamEnd);

      const { result: joined } = await wsClientRef.current.request({
        type: 'req',
        method: ViewerActions.JoinStream,
        params: null,
      });

      const device = new Device();
      deviceRef.current = device;
      await device.load({ routerRtpCapabilities: joined.rtpCapabilities });

      const { result: transportInfo } = await wsClientRef.current.request({
        type: 'req',
        method: ViewerActions.CreateTransport,
        params: { direction: 'recv' },
      });

      transportRef.current = device.createRecvTransport(transportInfo);

      transportRef.current.on('connect', ({ dtlsParameters }, callback, errorCallback) => {
        wsClientRef
          .current!.request({
            type: 'req',
            method: ViewerActions.ConnectTransport,
            params: { dtlsParameters },
          })
          .then(() => callback())
          .catch(errorCallback);
      });

      try {
        await Promise.all(
          joined.producerIds.map(async (producerId: string) =>
            createConsumer(producerId, device.recvRtpCapabilities),
          ),
        );
      } catch (error) {
        consumersRef.current.forEach((c) => c.close());
        transportRef.current?.close();
        wsClientRef.current.ws.removeEventListener('close', handleSocketClose);
        wsClientRef.current.ws.close();

        consumersRef.current = [];
        transportRef.current = null;
        wsClientRef.current = null;
        deviceRef.current = null;
        setStatus(StreamStatus.Unavailable);
        toast.error('Something went wrong');
        throw error;
      }
    },
    [createConsumer, handleSocketClose, handleStreamEnd, handleStreamerReconnected],
  );

  return { videoRef, status, isPlayVisible, playVideo, watch };
}
