import { useCallback, useState } from 'react';
import { Source } from '@/lib/types';

export function useDesktopMediaSources() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetched = await window.conveyor?.stream.getSources();
      setSources(fetched ?? []);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSources(null);
    setError(null);
  }, []);

  return { sources, isLoading, error, fetchSources, reset };
}
