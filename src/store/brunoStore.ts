import { create } from 'zustand';

export type BrunoMomentPhase = 'idle' | 'conversation';

interface BrunoMomentState {
  phase: BrunoMomentPhase;
  openConversation: () => void;
  dismiss: () => void;
}

/** Ephemeral frontend-only state for Bruno's living-room demo. */
export const useBrunoStore = create<BrunoMomentState>()((set) => ({
  phase: 'idle',
  openConversation: () => set({ phase: 'conversation' }),
  dismiss: () => set({ phase: 'idle' }),
}));
