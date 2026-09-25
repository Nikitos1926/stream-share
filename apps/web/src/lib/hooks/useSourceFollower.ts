import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { onSourceSwitched, runSourceSwitch } from '../media/sourceSwitch';
import { useIsDesktop } from './useIsDesktop';
import { StreamStatus } from './useStreamer';

type Params = {
  status: StreamStatus | null;
  changeSource: () => Promise<void>;
  stopBroadcast: () => Promise<void>;
};

const INITIAL_STATE: DesktopFollowState = { enabled: true, following: false, activeName: null };

/**
 * Renderer side of follow-app. Main decides which window to show and pushes
 * `stream:sourceChanged`; this hook recaptures through the existing
 * changeSource path, announces switches, and exposes the toggle state.
 */
export function useSourceFollower({ status, changeSource, stopBroadcast }: Params) {
  const isDesktop = useIsDesktop();
  const [state, setState] = useState<DesktopFollowState>(INITIAL_STATE);
  const isCapturing = status === StreamStatus.Preview || status === StreamStatus.Live;

  const refresh = useCallback(async () => {
    const next = await window.conveyor?.stream.getFollowState();
    if (next) setState(next);
  }, []);

  useEffect(() => {
    // refresh() sets state after an await, not synchronously; the rule cannot tell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isDesktop) void refresh();
  }, [isDesktop, refresh]);

  // Subscribe only while something is captured; the follower is idle otherwise.
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
          toast.error(`Follow app turned off: ${payload.message}`, { id: 'follow-app' });
          break;
        case 'noop':
          break;
      }
      void refresh();
    });

    return unsubscribe;
  }, [changeSource, isCapturing, isDesktop, refresh, stopBroadcast]);

  // The track-ended path in useStreamer switches without an event; pick up its result too.
  useEffect(() => {
    if (!isDesktop) return;
    return onSourceSwitched(() => void refresh());
  }, [isDesktop, refresh]);

  // Nothing captured -> nothing to follow. Stops the poller after stop/failed pick.
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
