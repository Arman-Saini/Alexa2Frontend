import { create } from 'zustand';
import type { ScenarioPlan } from '../api/scenarioBuilderApi';

// Ephemeral UI-sequence state for the "Act" choreography layer (rest → voice
// command → X-ray scan → lens hand-off → richer scenario explanation).
// This is a separate zustand slice from the 3D twin's store (store.ts) , it
// must never be merged into that store's contract, and it carries no
// persistence middleware since none of this state should survive a reload.
//
// NOTE: this supersedes an earlier minimal stand-in that only exposed
// `xray` / `openLens` / `triggerXray`. Those members keep the same shape
// here so any consumer built against the stub keeps compiling; the gsap
// timeline that actually drives the X-ray → lens hand-off is a separate,
// not-yet-built ticket , this file only exposes the actions it will call.

export type ActId = 0 | 1 | 2 | 3;
export type LensVariant = 'brain' | 'scenario' | 'module' | 'phone';

export interface TriggerContext {
  deviceId?: string;
  roomId?: string;
  scenarioText?: string;
  traceId?: string;
  phoneTrace?: {
    tier_label: string;
    latency_ms: number;
    cost_usd: number;
    path: string[];
  };
  phoneExplanation?: string;
  module?: any;
}

export interface XRayState {
  active: boolean;
  targetId: string | null;
  lensVariant?: LensVariant;
}

export interface LensPanelState {
  open: boolean;
  variant: LensVariant | null;
  originPoint: { x: number; y: number } | null;
}

export interface ActState {
  currentAct: ActId;
  triggerContext: TriggerContext | null;
  xray: XRayState;
  lensPanel: LensPanelState;

  // Single shared source of truth for the latest Bedrock scenario plan.
  // useScenarioPlan() reads/writes these fields instead of local useState so
  // every hook instance (ActShell, useActSequencer, ...) sees the same plan.
  scenarioPlan: ScenarioPlan | null;
  scenarioPlanLoading: boolean;
  scenarioPlanError: string | null;

  goToAct: (id: ActId, ctx?: TriggerContext) => void;
  triggerXray: (targetId: string, lensVariant?: LensVariant) => void;
  openLens: (variant: LensVariant, originPoint?: { x: number; y: number }) => void;
  closeLens: () => void;
  resetToRest: () => void;
  setScenarioPlanState: (state: { plan?: ScenarioPlan | null; loading?: boolean; error?: string | null }) => void;
}

const INITIAL_XRAY: XRayState = { active: false, targetId: null };
const INITIAL_LENS_PANEL: LensPanelState = { open: false, variant: null, originPoint: null };

export const useActStore = create<ActState>()((set) => ({
  currentAct: 0,
  triggerContext: null,
  xray: INITIAL_XRAY,
  lensPanel: INITIAL_LENS_PANEL,
  scenarioPlan: null,
  scenarioPlanLoading: false,
  scenarioPlanError: null,

  setScenarioPlanState: (state) =>
    set((s) => ({
      scenarioPlan: state.plan !== undefined ? state.plan : s.scenarioPlan,
      scenarioPlanLoading: state.loading !== undefined ? state.loading : s.scenarioPlanLoading,
      scenarioPlanError: state.error !== undefined ? state.error : s.scenarioPlanError,
    })),

  goToAct: (id, ctx) =>
    set({
      currentAct: id,
      triggerContext: ctx ?? null,
    }),

  triggerXray: (targetId, lensVariant) =>
    set({ xray: { active: true, targetId, lensVariant } }),

  openLens: (variant, originPoint) =>
    set({
      lensPanel: {
        open: true,
        variant,
        originPoint: originPoint ?? null,
      },
    }),

  closeLens: () =>
    set({ lensPanel: INITIAL_LENS_PANEL }),

  resetToRest: () =>
    set({
      currentAct: 0,
      triggerContext: null,
      xray: INITIAL_XRAY,
      lensPanel: INITIAL_LENS_PANEL,
    }),
}));
