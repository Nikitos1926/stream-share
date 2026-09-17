import { Stream } from '@stream-share/db';
import { StreamerActions } from '@stream-share/shared';
import { Device } from 'mediasoup-client';
import { Producer, ProducerOptions, Transport } from 'mediasoup-client/types';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WsClient } from '../media/WsClient';
import { createStream, getActiveStream } from '@/app/api/streams/client';
import toast from 'react-hot-toast';
import { useThumbnailCapture } from './useThumbnailCapture';
import { signalingWsUrl } from '../signaling';
import { useBeforeUnload } from './useBeforeUnload';
import { ensureAudioCapture, teardownAudioCapture } from '../media/audio.bridge';
import { useIsDesktop } from './useIsDesktop';
import { deriveVideoEncoding, StreamFps, StreamQuality, VideoSettings } from '../media/encoding';

export { StreamQuality, STREAM_FPS_OPTIONS, type StreamFps } from '../media/encoding';

const DEFAULT_VIDEO_SETTINGS: VideoSettings = { quality: StreamQuality.HD, fps: 30 };

export function useStreamer() {
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMuteToggleEnabled, setIsMuteToggleEnabled] = useState<boolean>(false);
  const [hasActiveStream, setHasActiveStream] = useState<boolean>(false);
  const [isCheckingActiveStream, setIsCheckingActiveStream] = useState<boolean>(false);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  // Mirrors videoSettings so callbacks that fire between renders see the latest pick.
  const videoSettingsRef = useRef<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream>(null);
  const wsClientRef = useRef<WsClient>(null);
  const transportRef = useRef<Transport>(null);
  const producersRef = useRef<Producer[]>([]);
  const stopCapturingThumbnailRef = useRef<() => void>(null);
  const { data: session } = useSession();
  const userId = session?.user.id;
  const startCapturingThumbnail = useThumbnailCapture(videoRef);
  const isDesktop = useIsDesktop();

  const toggleMute = useCallback(() => {
    setIsMuted((prevIsMuted) => {
      const audioProducer = producersRef.current.find((p) => p.kind === 'audio');
      if (!audioProducer) return !prevIsMuted;
      if (prevIsMuted) audioProducer.resume();
      else audioProducer.pause();
      return !prevIsMuted;
    });
  }, []);

  const checkActiveStream = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await getActiveStream(userId);
      setHasActiveStream(response.data ? true : false);
      setCurrentStream(response.data);
    } catch (error) {
      console.log(error);
      toast.error('Something went wrong');
      setIsCheckingActiveStream(false);
      return;
    }
  }, [userId]);

  const deriveEncodingForTrack = useCallback((track: MediaStreamTrack) => {
    const { width, height } = track.getSettings();
    return deriveVideoEncoding({ width: width!, height: height! }, videoSettingsRef.current);
  }, []);

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
        producerOptions = {
          ...producerOptions,
          encodings: [deriveEncodingForTrack(track).encoding],
        };
      }
      const producer = await transportRef.current!.produce(producerOptions);
      if (track.kind === 'audio' && isMuted) {
        producer.pause();
      }
      // produce() does not accept degradationPreference, so set it afterwards.
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

  const changeVideoSettings = useCallback(
    (patch: Partial<VideoSettings>) => {
      const next = { ...videoSettingsRef.current, ...patch };
      videoSettingsRef.current = next;
      setVideoSettings(next);

      const track = mediaStreamRef.current?.getVideoTracks()[0];
      if (!track) return;
      const producer = producersRef.current.find((p) => p.kind === 'video');
      void applyVideoSettings(track, producer);
    },
    [applyVideoSettings],
  );

  const changeQuality = useCallback(
    (quality: StreamQuality) => changeVideoSettings({ quality }),
    [changeVideoSettings],
  );

  const changeFps = useCallback(
    (fps: StreamFps) => changeVideoSettings({ fps }),
    [changeVideoSettings],
  );

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    if (isDesktop) teardownAudioCapture();
  }, [isDesktop]);

  const handleSocketClose = useCallback(() => {
    producersRef.current?.forEach((producer) => producer.close());
    transportRef.current?.close();
    producersRef.current = [];
    transportRef.current = null;
    wsClientRef.current = null;
    stopCapturingThumbnailRef.current?.();

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

    stopCapturingThumbnailRef.current?.();
    stopMediaTracks();
    setStatus(null);
  }, [stopMediaTracks]);

  const captureStream = useCallback(async () => {
    let controller;
    if ('CaptureController' in window) {
      controller = new CaptureController();
    }

    const { fps } = videoSettingsRef.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 2560 },
          height: { ideal: 1440 },
          frameRate: { ideal: fps, max: fps },
        },
        audio: !isDesktop,
        controller,
      });
    } catch (e) {
      console.error('[captureStream] getDisplayMedia failed:', e);
      throw e;
    }

    if (isDesktop) {
      try {
        stream.addTrack(await ensureAudioCapture());
      } catch (e) {
        console.error('[captureStream] desktop audio capture failed:', e);
        toast.error('System audio is unavailable, streaming video only');
      }
    }

    const [videoTrack] = stream.getVideoTracks();
    const [audioTrack] = stream.getAudioTracks();
    setIsMuteToggleEnabled(!!audioTrack);

    videoTrack?.addEventListener('ended', stopBroadcast);
    // Set the content hint before the first frame reaches the encoder.
    if (videoTrack) videoTrack.contentHint = deriveEncodingForTrack(videoTrack).contentHint;

    const surface = videoTrack?.getSettings().displaySurface;
    if (controller && surface !== 'monitor' && !isDesktop) {
      controller?.setFocusBehavior('no-focus-change');
    }

    return stream;
  }, [deriveEncodingForTrack, isDesktop, stopBroadcast]);

  const changeSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks()[0]!.removeEventListener('ended', stopBroadcast);
      stopMediaTracks();
    }
    const newStream = await captureStream();
    mediaStreamRef.current = newStream;
    await replaceStream(newStream);

    videoRef.current.srcObject = newStream;
  }, [captureStream, replaceStream, stopBroadcast, stopMediaTracks]);

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
    const stream = await createStream(isPrivate);
    if (!stream) return;
    await connectToStream(stream);
    setCurrentStream(stream);
    stopCapturingThumbnailRef.current = startCapturingThumbnail(stream.id);
  }, [connectToStream, isPrivate, startCapturingThumbnail]);

  const pickSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getVideoTracks()[0]!.removeEventListener('ended', stopBroadcast);
      stopMediaTracks();
    }

    let forcedTabSwitch = false;
    const handleVisibilityChange = () => {
      if (document.hidden) forcedTabSwitch = true;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const stream = await captureStream();

    // Wait one event-loop tick so a visibilitychange dispatched
    // asynchronously right after the promise resolves still gets caught
    await new Promise((r) => setTimeout(r, 0));

    videoRef.current.srcObject = stream;
    mediaStreamRef.current = stream;
    setStatus(StreamStatus.Preview);

    if (forcedTabSwitch) {
      broadcast();
    }
  }, [broadcast, captureStream, stopBroadcast, stopMediaTracks]);

  const selectSource = useCallback(async () => {
    if (status === StreamStatus.Live) {
      await changeSource();
    } else {
      await pickSource();
    }
  }, [status, changeSource, pickSource]);

  const reconnect = useCallback(async () => {
    if (!currentStream || !hasActiveStream || !videoRef.current) return;
    await pickSource();

    if (!mediaStreamRef.current) return;
    await connectToStream(currentStream);
    setHasActiveStream(false);
    stopCapturingThumbnailRef.current = startCapturingThumbnail(currentStream.id);
  }, [currentStream, hasActiveStream, pickSource, connectToStream, startCapturingThumbnail]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkActiveStream();
  }, [checkActiveStream]);

  useBeforeUnload(status === StreamStatus.Live, stopBroadcast);

  return {
    videoRef,
    isPrivate,
    isMuted,
    isMuteToggleEnabled,
    hasActiveStream,
    isCheckingActiveStream,
    currentStream,
    status,
    quality: videoSettings.quality,
    fps: videoSettings.fps,
    setIsPrivate,
    toggleMute,
    changeQuality,
    changeFps,
    selectSource,
    broadcast,
    stopBroadcast,
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
