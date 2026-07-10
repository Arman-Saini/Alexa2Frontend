import { describe, it, expect, beforeEach } from 'vitest';
import { useActStore } from '../store/actStore';

describe('actStore freeplay', () => {
  beforeEach(() => useActStore.getState().resetToRest());

  it('defaults to act 0', () => {
    expect(useActStore.getState().currentAct).toBe(0);
  });

  it('goToAct("freeplay") sets currentAct to freeplay', () => {
    useActStore.getState().goToAct('freeplay');
    expect(useActStore.getState().currentAct).toBe('freeplay');
  });

  it('resetToRest returns to act 0 from freeplay', () => {
    useActStore.getState().goToAct('freeplay');
    useActStore.getState().resetToRest();
    expect(useActStore.getState().currentAct).toBe(0);
  });
});
