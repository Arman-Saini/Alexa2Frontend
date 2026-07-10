import { describe, it, expect, vi } from 'vitest';
import { onInteraction, emitInteraction } from '../store/interactionEvents';

describe('interactionEvents', () => {
  it('delivers emitted events to a subscribed handler', () => {
    const handler = vi.fn();
    const unsubscribe = onInteraction(handler);

    emitInteraction({ type: 'easter-egg:dance-party' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ type: 'easter-egg:dance-party' });
    unsubscribe();
  });

  it('stops delivering events after unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = onInteraction(handler);
    unsubscribe();

    emitInteraction({ type: 'room:focus', roomId: 'kitchen' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('delivers to multiple independent subscribers', () => {
    const a = vi.fn();
    const b = vi.fn();
    onInteraction(a);
    onInteraction(b);

    emitInteraction({ type: 'object:toggle', objectId: 'lr-bulb', objectType: 'smart-bulb', isOn: true });

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('emitting with no subscribers does not throw', () => {
    expect(() => emitInteraction({ type: 'easter-egg:avatar-tickle' })).not.toThrow();
  });
});
