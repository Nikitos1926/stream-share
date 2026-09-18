import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('focus', onStoreChange);
  window.addEventListener('blur', onStoreChange);

  return () => {
    window.removeEventListener('focus', onStoreChange);
    window.removeEventListener('blur', onStoreChange);
  };
}

/**
 * True while this window has focus.
 *
 * Reading `document.hasFocus()` for the initial state threw
 * `ReferenceError: document is not defined` during server rendering — which is
 * what made /broadcast fail on the server and fall back to client rendering,
 * i.e. the hydration error in the console.
 *
 * `useSyncExternalStore` takes a separate server snapshot, so rendering never
 * touches `document` on the server and the first client render uses the same
 * value the server used. React then re-reads the real value after hydration.
 * The server snapshot is `true` because a page the user has just opened is
 * focused, and because "not focused" pauses the preview.
 */
export function useIsWindowFocused(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.hasFocus(),
    () => true,
  );
}
