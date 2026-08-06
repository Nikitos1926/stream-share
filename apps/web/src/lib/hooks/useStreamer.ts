import { Stream } from '@stream-share/db';
import { StreamerActions } from '@stream-share/shared';
import { Device } from 'mediasoup-client';
import { Producer, ProducerOptions, Transport } from 'mediasoup-client/types';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WsClient } from '../media/WsClient';

export function useStreamer() {
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [quality, setQuality] = useState<StreamQuality>(StreamQuality.HD);
  const [activeStream, setActiveStream] = useState<Stream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream>(null);
  const wsClientRef = useRef<WsClient>(null);
  const transportRef = useRef<Transport>(null);
  const producersRef = useRef<Producer[]>([]);
  const { data: session } = useSession();
  const userId = session?.user.id;

  const checkActiveStream = useCallback(async () => {
    if (!userId) return;
    let response;
    try {
      response = await fetch(`http://localhost:4000/streams/${userId}/active`, {
        credentials: 'include',
      });
    } catch (error) {
      console.log(error);
      // toastContext.error
      return;
    }
    if (!response.ok) {
      // toastContext.error
      return;
    }

    try {
      const { data } = (await response.json()) as { data: Stream };
      setActiveStream(data ?? null);
    } catch (error) {
      console.log(error);
      // toastContext.error
    }
  }, [userId]);

  const getVideoEncodingByQuality = useCallback(
    (quality: StreamQuality): RTCRtpEncodingParameters => {
      const videoTrack = mediaStreamRef.current!.getVideoTracks()[0];
      if (quality === StreamQuality.Source) {
        return { scaleResolutionDownBy: 1, maxBitrate: QUALITY_BITRATES[quality] };
      }
      const scaleResolutionDownBy = Math.max(
        videoTrack!.getSettings().height! / parseInt(quality),
        1,
      );
      return { scaleResolutionDownBy, maxBitrate: QUALITY_BITRATES[quality] };
    },
    [],
  );

  const applyRtpSenderParameters = useCallback(
    (producer: Producer, quality: StreamQuality) => {
      if (!producer.rtpSender) return;
      const rtpSenderParameters = producer.rtpSender.getParameters();
      producer.rtpSender.setParameters({
        ...rtpSenderParameters,
        encodings: [getVideoEncodingByQuality(quality)],
      });
    },
    [getVideoEncodingByQuality],
  );

  const createProducer = useCallback(
    async (track: MediaStreamTrack) => {
      let producerOptions: ProducerOptions = { track };
      if (track.kind === 'video') {
        producerOptions = {
          ...producerOptions,
          encodings: [getVideoEncodingByQuality(quality)],
        };
      }
      producersRef.current.push(await transportRef.current!.produce(producerOptions));
    },
    [getVideoEncodingByQuality, quality],
  );

  const replaceStream = useCallback(
    async (stream: MediaStream) => {
      return Promise.all(
        stream.getTracks().map(async (track) => {
          const producer = producersRef.current.find((p) => p.kind === track.kind);
          if (!producer) return createProducer(track);

          if (!track) return producer.pause();

          await producer.replaceTrack({ track: track });
          if (producer.kind === 'video') applyRtpSenderParameters(producer, quality);
          producer.resume();
        }),
      );
    },
    [applyRtpSenderParameters, createProducer, quality],
  );

  const changeQuality = useCallback(
    (newQuality: StreamQuality) => {
      setQuality(newQuality);
      const producer = producersRef.current.find((t) => t.kind === 'video');
      if (!producer) return;
      applyRtpSenderParameters(producer, newQuality);
    },
    [applyRtpSenderParameters],
  );

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const handleSocketClose = useCallback(() => {
    producersRef.current?.forEach((producer) => producer.close());
    transportRef.current?.close();
    producersRef.current = [];
    transportRef.current = null;
    wsClientRef.current = null;
    stopMediaTracks();
    setStatus(null);
  }, [stopMediaTracks]);

  const stopBroadcast = useCallback(async () => {
    if (wsClientRef.current) {
      await wsClientRef.current.request({
        type: 'req',
        method: StreamerActions.EndStream,
        params: null,
      });
      wsClientRef.current.close();
    }

    stopMediaTracks();
    setStatus(null);
  }, [stopMediaTracks]);

  const captureStream = useCallback(async () => {
    let controller;
    if ('CaptureController' in window) {
      controller = new CaptureController();
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 2560 },
        height: { ideal: 1440 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: true,
      controller,
    });
    const [videoTrack] = stream.getVideoTracks();
    videoTrack?.addEventListener('ended', stopBroadcast);

    const surface = videoTrack?.getSettings().displaySurface;
    if (controller && surface !== 'monitor') {
      controller?.setFocusBehavior('no-focus-change');
    }

    return stream;
  }, [stopBroadcast]);

  const changeSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks()[0]!.removeEventListener('ended', stopBroadcast);
    }
    const newStream = await captureStream();
    mediaStreamRef.current = newStream;
    await replaceStream(newStream);

    videoRef.current.srcObject = newStream;
  }, [captureStream, replaceStream, stopBroadcast]);

  const pickSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks()[0]!.removeEventListener('ended', stopBroadcast);
      stopMediaTracks();
    }
    const stream = await captureStream();

    videoRef.current.srcObject = stream;
    mediaStreamRef.current = stream;

    setStatus(StreamStatus.Preview);
  }, [captureStream, stopBroadcast, stopMediaTracks]);

  const createStream = useCallback(async () => {
    let response;
    try {
      response = await fetch('http://localhost:4000/streams', {
        method: 'post',
        credentials: 'include',
      });
    } catch (error) {
      console.log(error);
      // toastContext.error
      return;
    }
    if (!response.ok) {
      // toastContext.error
      return;
    }
    try {
      const { data } = (await response.json()) as { data: Stream };
      return data;
    } catch (error) {
      console.log(error);
      // toastContext.error
    }
  }, []);

  const connectToStream = useCallback(
    async (stream: Stream) => {
      if (!mediaStreamRef.current) {
        // toastContext.error
        return;
      }
      const isTrackByKindSent = Object.fromEntries(
        mediaStreamRef.current.getTracks().map((t) => [t.kind, false]),
      );

      wsClientRef.current = new WsClient(`ws://localhost:4000/ws/streams/${stream.id}/broadcast`);
      wsClientRef.current.ws.addEventListener('close', handleSocketClose);

      const { result: rtpCapabilities } = await wsClientRef.current.request({
        type: 'req',
        method: StreamerActions.GetRtpCapabilities,
        params: null,
      });

      const device = new Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });

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
        wsClientRef
          .current!.request({
            type: 'req',
            method: StreamerActions.Produce,
            params: {
              rtpParameters,
              kind,
              last: Object.values(isTrackByKindSent).every((e) => e === true),
            },
          })
          .then((res) => callback({ id: res.result.producerId }))
          .catch(errorCallback);
      });

      await Promise.all(mediaStreamRef.current.getTracks().map(createProducer));
      setStatus(StreamStatus.Live);

      return stream;
    },
    [createProducer, handleSocketClose],
  );

  const broadcast = useCallback(async () => {
    const stream = await createStream();
    if (!stream) return;
    connectToStream(stream);
  }, [connectToStream, createStream]);

  const reconnect = useCallback(async () => {
    if (!activeStream || !videoRef.current) return;
    await pickSource();

    if (!mediaStreamRef.current) return;
    await connectToStream(activeStream);
    setActiveStream(null);
  }, [activeStream, connectToStream, pickSource]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkActiveStream();
  }, [checkActiveStream]);

  return {
    videoRef,
    status,
    quality,
    changeQuality,
    pickSource,
    changeSource,
    broadcast,
    stopBroadcast,
    activeStream,
    reconnect,
  };
}

export enum StreamStatus {
  Preview = 'preview',
  Connecting = 'connecting',
  Live = 'live',
  Ended = 'ended',
  Unavailable = 'unavailable',
}

export enum StreamQuality {
  LD = '360',
  SD = '480',
  HD = '720',
  FHD = '1080',
  QHD = '1440',
  Source = 'Source',
}

const QUALITY_BITRATES = {
  [StreamQuality.LD]: 500_000,
  [StreamQuality.SD]: 700_000,
  [StreamQuality.HD]: 2_000_000,
  [StreamQuality.FHD]: 4_000_000,
  [StreamQuality.QHD]: 7_000_000,
  [StreamQuality.Source]: 7_000_000,
} as const;
