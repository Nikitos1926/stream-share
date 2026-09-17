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
};

const BITS_PER_PIXEL_PER_FRAME = 0.07;
const BASE_FPS = 30;
const FPS_BITRATE_EXPONENT = Math.log2(1.5);
const MIN_BITRATE = 300_000;
const MAX_BITRATE = 17_000_000;

export function deriveVideoEncoding(
  track: { width: number; height: number },
  settings: VideoSettings,
): DerivedVideoEncoding {
  const { quality, fps } = settings;
  const scaleResolutionDownBy = getScaleResolutionDownBy(track.height, quality);
  const targetWidth = track.width / scaleResolutionDownBy;
  const targetHeight = track.height / scaleResolutionDownBy;
  const maxBitrate = getMaxBitrate(targetWidth * targetHeight, fps);
  const isHighFps = fps > BASE_FPS;

  return {
    encoding: { scaleResolutionDownBy, maxFramerate: fps, maxBitrate },
    degradationPreference: isHighFps ? 'maintain-framerate' : 'maintain-resolution',
    contentHint: isHighFps ? 'motion' : 'detail',
    frameRate: { ideal: fps, max: fps },
  };
}

function getScaleResolutionDownBy(trackHeight: number, quality: StreamQuality): number {
  if (quality === StreamQuality.Source) return 1;
  return Math.max(trackHeight / parseInt(quality), 1);
}

function getMaxBitrate(pixels: number, fps: StreamFps): number {
  const baseBitrate = pixels * BASE_FPS * BITS_PER_PIXEL_PER_FRAME;
  const multiplier = Math.pow(fps / BASE_FPS, FPS_BITRATE_EXPONENT);
  return Math.round(Math.min(Math.max(baseBitrate * multiplier, MIN_BITRATE), MAX_BITRATE));
}
