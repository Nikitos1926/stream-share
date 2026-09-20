import { startBitrateFor, videoBitrateBudget } from '@stream-share/shared';

export enum StreamQuality {
  LD = '360',
  SD = '480',
  HD = '720',
  FHD = '1080',
  QHD = '1440',
  Source = 'Source',
}

export const STREAM_FPS_OPTIONS = [5, 30, 60, 120] as const;
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
  const { quality, fps } = settings;
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

function getScaleResolutionDownBy(trackHeight: number, quality: StreamQuality): number {
  if (quality === StreamQuality.Source) return 1;
  return Math.max(trackHeight / parseInt(quality), 1);
}
