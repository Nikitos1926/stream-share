export const API = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'http://localhost:4000';

const isServer = typeof window === 'undefined';

export function signalingUrl(path: string): string {
  const base = isServer ? (process.env.SIGNALING_INTERNAL_URL ?? API) : API;
  return `${base}${path}`;
}
