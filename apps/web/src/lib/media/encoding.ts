import { startBitrateFor, videoBitrateBudget } from '@stream-share/shared';
import type { RtpCodecCapability } from 'mediasoup-client/types';

export const MAX_CAPTURE_WIDTH = 3840;
export const MAX_CAPTURE_HEIGHT = 2160;

export const MAX_HEIGHT_FOR_HIGH_FPS = 1440;
export const HIGH_RES_MAX_FPS: StreamFps = 30;

export const VIDEO_CODEC_PREFERENCE: readonly { mimeType: string; h264Profile?: string }[] = [
  { mimeType: 'video/H264', h264Profile: '4200' },
  { mimeType: 'video/H264', h264Profile: '42e0' },
  { mimeType: 'video/H264' },
  { mimeType: 'video/VP8' },
];

export enum StreamQuality {
  LD = '360',
  SD = '480',
  HD = '720',
  FHD = '1080',
  QHD = '1440',
  Source = 'Source',
}

export const STREAM_FPS_OPTIONS = [5, 30, 60] as const;
export type StreamFps = (typeof STREAM_FPS_OPTIONS)[number];

export type VideoSettings = {
  quality: StreamQuality;
  fps: StreamFps;
};

export type DerivedVideoEncoding = {
  encoding: RTCRtpEncodingParameters;
  degradationPreference: RTCDegradationPreference;
  contentHint: 'detail' | 'motion';
  frameRate: ConstrainDouble;
  /** kbit/s — `x-google-start-bitrate`'s unit, for mediasoup `codecOptions`. */
  startBitrateKbps: number;
};

const HIGH_FPS_THRESHOLD = 30;

export function deriveVideoEncoding(
  track: { width: number; height: number },
  settings: VideoSettings,
): DerivedVideoEncoding {
  const { quality } = settings;
  const fps = clampVideoSettings(settings, track.height).fps;
  const scaleResolutionDownBy = getScaleResolutionDownBy(track.height, quality);
  const targetWidth = track.width / scaleResolutionDownBy;
  const targetHeight = track.height / scaleResolutionDownBy;
  const maxBitrate = videoBitrateBudget(targetWidth * targetHeight, fps);
  const isHighFps = fps > HIGH_FPS_THRESHOLD;

  return {
    encoding: { scaleResolutionDownBy, maxFramerate: fps, maxBitrate },
    degradationPreference: isHighFps ? 'maintain-framerate' : 'maintain-resolution',
    contentHint: isHighFps ? 'motion' : 'detail',
    frameRate: { ideal: fps, max: fps },
    startBitrateKbps: Math.round(startBitrateFor(maxBitrate) / 1000),
  };
}

export function pickVideoCodec(
  codecs: readonly RtpCodecCapability[] | undefined,
): RtpCodecCapability | undefined {
  if (!codecs) return undefined;
  for (const { mimeType, h264Profile } of VIDEO_CODEC_PREFERENCE) {
    const codec = codecs.find(
      (c) =>
        c.mimeType.toLowerCase() === mimeType.toLowerCase() &&
        (!h264Profile || h264ProfileOf(c) === h264Profile),
    );
    if (codec) return codec;
  }
  return undefined;
}

function h264ProfileOf(codec: RtpCodecCapability): string | undefined {
  const profileLevelId = codec.parameters?.['profile-level-id'];
  return typeof profileLevelId === 'string' ? profileLevelId.slice(0, 4).toLowerCase() : undefined;
}

function getScaleResolutionDownBy(trackHeight: number, quality: StreamQuality): number {
  if (quality === StreamQuality.Source) return 1;
  return Math.max(trackHeight / parseInt(quality), 1);
}

export function getOutputHeight(quality: StreamQuality, sourceHeight: number): number {
  if (quality === StreamQuality.Source) return sourceHeight;
  return Math.min(sourceHeight || Infinity, parseInt(quality));
}

export function getMaxFps(quality: StreamQuality, sourceHeight: number): StreamFps {
  const isHighRes = getOutputHeight(quality, sourceHeight) > MAX_HEIGHT_FOR_HIGH_FPS;
  return isHighRes ? HIGH_RES_MAX_FPS : STREAM_FPS_OPTIONS[STREAM_FPS_OPTIONS.length - 1]!;
}

export function isFpsAllowed(
  fps: StreamFps,
  quality: StreamQuality,
  sourceHeight: number,
): boolean {
  return fps <= getMaxFps(quality, sourceHeight);
}

export function clampVideoSettings(settings: VideoSettings, sourceHeight: number): VideoSettings {
  const maxFps = getMaxFps(settings.quality, sourceHeight);
  return settings.fps > maxFps ? { ...settings, fps: maxFps } : settings;
}
