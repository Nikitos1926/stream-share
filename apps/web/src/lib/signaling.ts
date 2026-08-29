// stripped by Caddy before the request reaches signaling
const PROXY_PREFIX = process.env.NEXT_PUBLIC_PROXY_PREFIX;
const isDev = process.env.NODE_ENV === 'development';

/** `path` is the route as Fastify defines it, e.g. '/streams'. */
export function signalingUrl(path: string): string {
  if (typeof window === 'undefined') {
    // server-side: straight over the compose network, no proxy, no prefix
    return `${process.env.SIGNALING_INTERNAL_URL}${path}`;
  }
  return isDev ? `${process.env.NEXT_PUBLIC_SIGNALING_URL}${path}` : `${PROXY_PREFIX}${path}`;
}

export function signalingWsUrl(path: string): string {
  if (isDev) return `${process.env.NEXT_PUBLIC_SIGNALING_WS_URL}${path}`;
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${scheme}//${location.host}${PROXY_PREFIX}${path}`;
}
