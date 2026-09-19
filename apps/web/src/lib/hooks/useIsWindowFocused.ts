import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener('focus', onStoreChange);
  window.addEventListener('blur', onStoreChange);

  return () => {
    window.removeEventListener('focus', onStoreChange);
    window.removeEventListener('blur', onStoreChange);
  };
}

export function useIsWindowFocused(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.hasFocus(),
    () => true,
  );
}
