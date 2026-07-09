import { create } from 'zustand';

export type StoryMode = 'story' | 'interactive';

export interface StoryState {
  mode: StoryMode;
  storyProgress: number; // 0 to 1
  setStoryProgress: (progress: number) => void;
  enterInteractive: () => void;
  restartStory: () => void;
}

export const useStoryStore = create<StoryState>()((set) => ({
  // Defaulting mode to 'story' so users start in story mode, but can transition to 'interactive'
  mode: 'story',
  storyProgress: 0,

  setStoryProgress: (progress) =>
    set({ storyProgress: Math.max(0, Math.min(1, progress)) }),

  enterInteractive: () =>
    set({ mode: 'interactive' }),

  restartStory: () =>
    set({ mode: 'story', storyProgress: 0 }),
}));

// Derived helper to determine the active layer based on storyProgress
export type StoryLayer = 'hook' | 't0' | 't1' | 'cache' | 't3' | 'ecosystem';

export function getActiveLayer(progress: number): StoryLayer {
  if (progress < 0.15) return 'hook';
  if (progress < 0.35) return 't0';
  if (progress < 0.55) return 't1';
  if (progress < 0.70) return 'cache';
  if (progress < 0.88) return 't3';
  return 'ecosystem';
}
