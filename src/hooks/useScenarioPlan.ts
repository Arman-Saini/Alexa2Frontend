// Requests a Bedrock-generated step-by-step scenario plan from the
// scenario-builder backend. Used for the "richer explanation" path when a
// voice command doesn't resolve locally via commandProcessor.
//
// Plan/loading/error state lives in actStore (not local useState) so every
// hook instance across the app (ActShell, useActSequencer, ...) observes
// the same plan — a component doesn't need to be the one that requested it
// to see the result.

import { useCallback } from 'react';
import { scenarioBuilderApi, type ScenarioPlan } from '../api/scenarioBuilderApi';
import { ApiError } from '../api/client';
import { useActStore } from '../store/actStore';

export interface UseScenarioPlan {
  plan: ScenarioPlan | null;
  loading: boolean;
  error: string | null;
  requestPlan: (scenarioText: string) => Promise<void>;
}

export function useScenarioPlan(): UseScenarioPlan {
  const plan = useActStore((s) => s.scenarioPlan);
  const loading = useActStore((s) => s.scenarioPlanLoading);
  const error = useActStore((s) => s.scenarioPlanError);

  const requestPlan = useCallback(async (scenarioText: string) => {
    useActStore.getState().setScenarioPlanState({ loading: true, error: null });
    try {
      const result = await scenarioBuilderApi.plan(scenarioText);
      useActStore.getState().setScenarioPlanState({ plan: result, loading: false });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to generate scenario plan.';
      useActStore.getState().setScenarioPlanState({ error: message, loading: false });
      throw err;
    }
  }, []);

  return { plan, loading, error, requestPlan };
}
