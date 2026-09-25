import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { onSourceSwitched, runSourceSwitch } from '../media/sourceSwitch';
import { useIsDesktop } from './useIsDesktop';
import { StreamStatus } from './useStreamer';

type Params = {
  status: StreamStatus | null;
  changeSource: () => Promise<void>;
  stopBroadcast: () => Promise<void>;
};

const INITIAL_STATE: DesktopFollowState = {
  enabled: true,
  following: false,
  activeName: null,
  lastError: null,
};

export function useSourceFollower({ status, changeSource, stopBroadcast }: Params) {
  const isDesktop = useIsDesktop();
  const [state, setState] = useState<DesktopFollowState>(INITIAL_STATE);
  const shownErrorRef = useRef<string | null>(null);
  const isCapturing = status === StreamStatus.Preview || status === StreamStatus.Live;

  const refresh = useCallback(async () => {
    const next = await window.conveyor?.stream.getFollowState();
    if (!next) return;
    setState(next);
    if (next.lastError && next.lastError !== shownErrorRef.current) {
      toast.error(`Follow app turned off: ${next.lastError}`, { id: 'follow-app' });
    }
    shownErrorRef.current = next.lastError;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isDesktop) void refresh();
  }, [isDesktop, isCapturing, refresh]);

  useEffect(() => {
    if (!isDesktop || !isCapturing || !window.conveyor) return;

    const unsubscribe = window.conveyor.stream.onSourceChanged((payload) => {
      switch (payload.reason) {
        case 'follow':
        case 'return': {
          const label = payload.reason === 'follow' ? 'Switched to' : 'Back to';
          runSourceSwitch(changeSource)
            .then(() => toast.success(`${label} ${payload.name}`, { id: 'follow-app' }))
            .catch((e: unknown) => {
              console.error('[useSourceFollower] switch failed:', e);
              toast.error('Could not switch to the new window', { id: 'follow-app' });
            });
          break;
        }
        case 'lost':
          toast.error('The captured app closed', { id: 'follow-app' });
          void stopBroadcast();
          break;
        case 'error':
        case 'noop':
          break;
      }
      void refresh();
    });

    return unsubscribe;
  }, [changeSource, isCapturing, isDesktop, refresh, stopBroadcast]);

  useEffect(() => {
    if (!isDesktop) return;
    return onSourceSwitched(() => void refresh());
  }, [isDesktop, refresh]);

  useEffect(() => {
    if (isDesktop && !isCapturing) void window.conveyor?.stream.releaseSource();
  }, [isCapturing, isDesktop]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      await window.conveyor?.stream.setFollowApp(enabled);
      await refresh();
    },
    [refresh],
  );

  return { ...state, setEnabled };
}
