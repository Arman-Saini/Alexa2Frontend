import { create } from 'zustand';

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
  setSpeaking: (v: boolean) => void;
  setListening: (v: boolean) => void;
  setReply: (text: string, source?: ReplySource) => void;
  setDockExpanded: (v: boolean) => void;
}

export const useTourStore = create<TourState>()((set) => ({
  isSpeaking: false,
  isListening: false,
  lastReply: '',
  lastReplyAt: null,
  lastReplySource: 'guide',
  isDockExpanded: false,

  setSpeaking: (v) => set({ isSpeaking: v }),
  setListening: (v) => set({ isListening: v }),
  setReply: (text, source = 'guide') => set({ lastReply: text, lastReplyAt: Date.now(), lastReplySource: source }),
  setDockExpanded: (v) => set({ isDockExpanded: v }),
}));
