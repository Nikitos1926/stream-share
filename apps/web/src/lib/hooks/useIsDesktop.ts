import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * True when the page runs inside the Electron shell, which exposes
 * `window.conveyor` from its preload script.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !!window.conveyor,
    () => false,
  );
}
