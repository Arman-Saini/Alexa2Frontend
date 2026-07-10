import { describe, it, expect } from 'vitest';
import { useStoryStore } from '../store/storyStore';

describe('storyStore default mode', () => {
  it('defaults to interactive, not story', () => {
    expect(useStoryStore.getState().mode).toBe('interactive');
  });

  it('restartStory still returns to story mode explicitly', () => {
    useStoryStore.getState().restartStory();
    expect(useStoryStore.getState().mode).toBe('story');
    // reset for other tests / consumers relying on module singleton state
    useStoryStore.setState({ mode: 'interactive' });
  });
});
