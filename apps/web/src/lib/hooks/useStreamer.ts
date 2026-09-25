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
import { runSourceSwitch } from '../media/sourceSwitch';
import {
  clampVideoSettings,
  deriveVideoEncoding,
  MAX_CAPTURE_HEIGHT,
  MAX_CAPTURE_WIDTH,
  pickVideoCodec,
  StreamFps,
  StreamQuality,
  VideoSettings,
} from '../media/encoding';

export { StreamQuality, STREAM_FPS_OPTIONS, type StreamFps } from '../media/encoding';

const DEFAULT_VIDEO_SETTINGS: VideoSettings = { quality: StreamQuality.HD, fps: 30 };

export function useStreamer() {
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMuteToggleEnabled, setIsMuteToggleEnabled] = useState<boolean>(false);
  const [hasActiveStream, setHasActiveStream] = useState<boolean>(false);
  const [isCheckingActiveStream, setIsCheckingActiveStream] = useState<boolean>(false);
  const [sourceHeight, setSourceHeight] = useState<number>(0);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [status, setStatus] = useState<StreamStatus | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const sourceHeightRef = useRef<number>(0);
  const videoSettingsRef = useRef<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream>(null);
  const wsClientRef = useRef<WsClient>(null);
  const deviceRef = useRef<Device>(null);
  const transportRef = useRef<Transport>(null);
  const producersRef = useRef<Producer[]>([]);
  const stopCapturingThumbnailRef = useRef<() => void>(null);
  const endedListenerRef = useRef<(() => void) | null>(null);
  const trackEndedHandlerRef = useRef<() => void>(() => {});
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

  const changeVideoSettings = useCallback(
    (patch: Partial<VideoSettings>) => {
      const next = clampVideoSettings(
        { ...videoSettingsRef.current, ...patch },
        sourceHeightRef.current,
      );
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

  const clearPreview = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.srcObject = null;
  }, []);

  const stopMediaTracks = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    sourceHeightRef.current = 0;
    setSourceHeight(0);
    if (isDesktop) teardownAudioCapture();
  }, [isDesktop]);

  const detachEndedListener = useCallback(() => {
    const track = mediaStreamRef.current?.getVideoTracks()[0];
    const listener = endedListenerRef.current;
    if (track && listener) track.removeEventListener('ended', listener);
    endedListenerRef.current = null;
  }, []);

  const handleSocketClose = useCallback(() => {
    producersRef.current?.forEach((producer) => producer.close());
    transportRef.current?.close();
    producersRef.current = [];
    transportRef.current = null;
    deviceRef.current = null;
    wsClientRef.current = null;
    stopCapturingThumbnailRef.current?.();

    stopMediaTracks();
    clearPreview();
    setStatus(null);
  }, [clearPreview, stopMediaTracks]);

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
    clearPreview();
    setStatus(null);
  }, [clearPreview, stopMediaTracks]);

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
          width: { ideal: MAX_CAPTURE_WIDTH },
          height: { ideal: MAX_CAPTURE_HEIGHT },
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
    const height = videoTrack?.getSettings().height ?? 0;
    sourceHeightRef.current = height;
    setSourceHeight(height);

    const clamped = clampVideoSettings(videoSettingsRef.current, height);
    videoSettingsRef.current = clamped;
    setVideoSettings(clamped);

    const [audioTrack] = stream.getAudioTracks();
    setIsMuteToggleEnabled(!!audioTrack);

    const onEnded = () => trackEndedHandlerRef.current();
    videoTrack?.addEventListener('ended', onEnded);
    endedListenerRef.current = onEnded;
    // Set the content hint before the first frame reaches the encoder.
    if (videoTrack) videoTrack.contentHint = deriveEncodingForTrack(videoTrack).contentHint;

    const surface = videoTrack?.getSettings().displaySurface;
    if (controller && surface !== 'monitor' && !isDesktop) {
      controller?.setFocusBehavior('no-focus-change');
    }

    return stream;
  }, [deriveEncodingForTrack, isDesktop]);

  const changeSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      detachEndedListener();
      stopMediaTracks();
    }
    const newStream = await captureStream();
    mediaStreamRef.current = newStream;
    videoRef.current.srcObject = newStream;
    // In Preview there is no transport yet; the new stream is produced when going live.
    if (transportRef.current) await replaceStream(newStream);
  }, [captureStream, detachEndedListener, replaceStream, stopMediaTracks]);

  /**
   * Browser: a closed window ends the stream, as before.
   * Desktop: ask main whether the follower can point at a fallback window
   * (the League client after the game closes). Only stop when it cannot.
   */
  const handleTrackEnded = useCallback(async () => {
    if (!isDesktop || !window.conveyor) return stopBroadcast();
    let result: DesktopSourceChanged;
    try {
      result = await window.conveyor.stream.resolveEndedSource();
    } catch (e) {
      console.error('[handleTrackEnded] resolveEndedSource failed:', e);
      result = { reason: 'lost' };
    }
    // 'noop': main already switched back and the renderer's recapture is in flight.
    if (result.reason === 'noop') return;
    if (result.reason !== 'return') return stopBroadcast();
    const name = result.name;
    try {
      await runSourceSwitch(changeSource);
      toast.success(`Back to ${name}`, { id: 'follow-app' });
    } catch (e) {
      console.error('[handleTrackEnded] switching back failed:', e);
      toast.error(`Could not switch back to ${name}`, { id: 'follow-app' });
      await stopBroadcast();
    }
  }, [changeSource, isDesktop, stopBroadcast]);

  useEffect(() => {
    trackEndedHandlerRef.current = () => void handleTrackEnded();
  }, [handleTrackEnded]);

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

  const pickSource = useCallback(async () => {
    if (!videoRef.current) return;
    if (mediaStreamRef.current) {
      detachEndedListener();
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
  }, [broadcast, captureStream, detachEndedListener, stopMediaTracks]);

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
    sourceHeight,
    setIsPrivate,
    toggleMute,
    changeQuality,
    changeFps,
    selectSource,
    changeSource,
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
