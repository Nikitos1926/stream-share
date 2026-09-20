/** Budget model: pixels x fps x bits-per-pixel, with a sublinear fps term. */
export const BITS_PER_PIXEL_PER_FRAME = 0.07;
export const BITRATE_BASE_FPS = 30;
/** Doubling the frame rate costs 1.5x the bitrate, not 2x — frames correlate. */
export const FPS_BITRATE_EXPONENT = Math.log2(1.5);

export const MIN_VIDEO_BITRATE = 300_000;
export const MAX_VIDEO_BITRATE = 18_000_000;

/**
 * Share of the budget the encoder opens at, instead of libwebrtc's ~300 kbit/s
 * default. Half keeps the first seconds watchable without overshooting the link
 * before congestion control has measured it. It is also what a viewer transport
 * starts bandwidth estimation at, so a 4K stream does not start at a 1080p
 * start bitrate.
 */
export const START_BITRATE_FRACTION = 0.5;

/**
 * What the server's incoming cap must add on top of the video ceiling: Opus,
 * RTX retransmissions and RTP/UDP/IP headers all ride the same transport.
 */
export const SERVER_BITRATE_HEADROOM = 1.2;

/**
 * Invariant: the server's cap on what the broadcaster may send us must never
 * be below the sender's own ceiling plus overhead, or the SFU silently clamps
 * a mode the sender is allowed to produce. This is the floor for
 * `MEDIASOUP_MAX_INCOMING_BITRATE` (42 Mbit/s).
 */
export const MIN_SERVER_INCOMING_BITRATE = Math.round(MAX_VIDEO_BITRATE * SERVER_BITRATE_HEADROOM);

/** Video budget for `pixels` at `fps`, in bit/s, clamped to the model's range. */
export function videoBitrateBudget(pixels: number, fps: number): number {
  const baseBitrate = pixels * BITRATE_BASE_FPS * BITS_PER_PIXEL_PER_FRAME;
  const multiplier = Math.pow(fps / BITRATE_BASE_FPS, FPS_BITRATE_EXPONENT);
  const budget = baseBitrate * multiplier;
  return Math.round(Math.min(Math.max(budget, MIN_VIDEO_BITRATE), MAX_VIDEO_BITRATE));
}

/** Where encoding / bandwidth estimation starts for a given budget, in bit/s. */
export function startBitrateFor(maxBitrate: number): number {
  return Math.round(maxBitrate * START_BITRATE_FRACTION);
}
