import { useEffect } from 'react';

export function useBeforeUnload(isListenerEnabled: boolean, onBeforeUnload: () => unknown) {
  useEffect(() => {
    if (!isListenerEnabled) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = true;
      void onBeforeUnload();
    };
    const onNavigate = (e: NavigateEvent) => {
      if (e.hashChange || e.downloadRequest !== null) return;
      if (e.navigationType === 'reload') return;
      if (!e.cancelable) return;
      if (!window.confirm(MESSAGE)) return e.preventDefault();
      void onBeforeUnload();
      window.navigation.removeEventListener('navigate', onNavigate);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.navigation.addEventListener('navigate', onNavigate);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.navigation.removeEventListener?.('navigate', onNavigate);
    };
  }, [isListenerEnabled, onBeforeUnload]);
}

const MESSAGE = 'Leaving site? Your stream will be ended.';
