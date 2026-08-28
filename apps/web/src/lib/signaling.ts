const DEV_ORIGIN = 'http://localhost:4000';
const DEV_WS_ORIGIN = 'ws://localhost:4000';
// stripped by Caddy before the request reaches signaling
const PROXY_PREFIX = '/sfu';
const isDev = process.env.NODE_ENV === 'development';

/** `path` is the route as Fastify defines it, e.g. '/streams'. */
export function signalingUrl(path: string): string {
  if (typeof window === 'undefined') {
    // server-side: straight over the compose network, no proxy, no prefix
    return `${process.env.SIGNALING_INTERNAL_URL ?? DEV_ORIGIN}${path}`;
  }
  return isDev ? `${DEV_ORIGIN}${path}` : `${PROXY_PREFIX}${path}`;
}

export function signalingWsUrl(path: string): string {
  if (isDev) return `${DEV_WS_ORIGIN}${path}`;
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${PROXY_PREFIX}${path}`;
}
