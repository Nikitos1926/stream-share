import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True when the page runs inside the Electron shell, which exposes
 * `window.conveyor` from its preload script.
 *
 * Safe under server rendering: the server snapshot is `false`, so rendering
 * never touches `window`, and React re-renders once with the client value
 * after hydration instead of reporting a mismatch.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!window.conveyor,
    () => false,
  );
}
