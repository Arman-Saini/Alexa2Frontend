import { create } from 'zustand';
import type { ExpressionType } from '../components/final/pipeline/types';

// Live, event-driven state for the cartoon HUD avatar and the tour beats.
// Deliberately separate from actStore: actStore.currentAct owns *which beat*
// is active, this store owns *what's happening right now* (is the avatar
// speaking, what did it last say, is the dock forced open) — driven by real
// WS voice events, not the tour's own script.
export type ReplySource = 'guide' | 'phone';

export interface TourState {
  isSpeaking: boolean;
  isListening: boolean;
  lastReply: string;
  lastReplyAt: number | null;
  lastReplySource: ReplySource;
  isDockExpanded: boolean;
  /** When set, the cartoon HUD avatar uses these values instead of its own
   * speaking/listening-derived expression — driven by the /main-v2 pipeline
   * demo. Null (default) preserves today's Home-page behavior exactly. */
  avatarOverride: { expression: ExpressionType; ledColor: string; ledMode: 'solid' | 'pulse' | 'wave' | 'off' } | null;
  setSpeaking: (v: boolean) => void;
  setListening: (v: boolean) => void;
  setReply: (text: string, source?: ReplySource) => void;
  setDockExpanded: (v: boolean) => void;
  setAvatarOverride: (v: TourState['avatarOverride']) => void;
}

export const useTourStore = create<TourState>()((set) => ({
  isSpeaking: false,
  isListening: false,
  lastReply: '',
  lastReplyAt: null,
  lastReplySource: 'guide',
  isDockExpanded: false,
  avatarOverride: null,

  setSpeaking: (v) => set({ isSpeaking: v }),
  setListening: (v) => set({ isListening: v }),
  setReply: (text, source = 'guide') => set({ lastReply: text, lastReplyAt: Date.now(), lastReplySource: source }),
  setDockExpanded: (v) => set({ isDockExpanded: v }),
  setAvatarOverride: (v) => set({ avatarOverride: v }),
}));
