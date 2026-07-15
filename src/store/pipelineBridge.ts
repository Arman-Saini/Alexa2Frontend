import { create } from 'zustand';
import type { Scenario } from '../components/final/pipeline/types';

// Kept as a local alias (rather than importing the whole SmartphoneWidget
// module into a store) — verified to match ChatSummary['tier'] exactly:
// 'T0·local' | 'T1·local' | 'T3·cloud' (U+00B7 MIDDLE DOT).
export type DisplayTier = 'T0·local' | 'T1·local' | 'T3·cloud';

// Single source of truth for which pipeline-demo scenario a resolved
// backend tier maps to. Consumed by both this store and (indirectly, via
// requestByTier) the future /main-v2 page.
export const TIER_TO_SCENARIO: Record<DisplayTier, Scenario['id']> = {
  'T0·local': 'khata-t0',
  'T1·local': 'lights-t1',
  'T3·cloud': 'hue-t3',
};

export interface PipelineBridgeRequest {
  scenarioId: Scenario['id'];
  token: number;
}

interface PipelineBridgeState {
  request: PipelineBridgeRequest | null;
  requestByTier: (tier: DisplayTier) => void;
  clearRequest: () => void;
}

export const usePipelineBridge = create<PipelineBridgeState>()((set, get) => ({
  request: null,

  requestByTier: (tier) => {
    const scenarioId = TIER_TO_SCENARIO[tier];
    if (!scenarioId) return;
    const prevToken = get().request?.token ?? 0;
    set({ request: { scenarioId, token: prevToken + 1 } });
  },

  clearRequest: () => set({ request: null }),
}));
