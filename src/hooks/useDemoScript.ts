// Fetches the fixed 6-step attract-mode demo script once on mount.

import { useState, useEffect } from 'react';
import { demoApi, type DemoStep } from '../api/demoApi';
import { ApiError } from '../api/client';

export interface UseDemoScript {
  steps: DemoStep[];
  loading: boolean;
  error: string | null;
}

export function useDemoScript(): UseDemoScript {
  const [steps, setSteps] = useState<DemoStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await demoApi.getScript();
        if (!cancelled) setSteps(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Failed to load demo script.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { steps, loading, error };
}
