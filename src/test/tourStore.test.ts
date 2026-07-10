import { describe, it, expect, beforeEach } from 'vitest';
import { useTourStore } from '../store/tourStore';

function reset() {
  useTourStore.setState({
    isSpeaking: false,
    isListening: false,
    lastReply: '',
    lastReplyAt: null,
    isDockExpanded: false,
  });
}

describe('tourStore', () => {
  beforeEach(reset);

  it('starts idle', () => {
    const s = useTourStore.getState();
    expect(s.isSpeaking).toBe(false);
    expect(s.isListening).toBe(false);
    expect(s.lastReply).toBe('');
    expect(s.lastReplyAt).toBeNull();
    expect(s.isDockExpanded).toBe(false);
  });

  it('setSpeaking toggles isSpeaking', () => {
    useTourStore.getState().setSpeaking(true);
    expect(useTourStore.getState().isSpeaking).toBe(true);
    useTourStore.getState().setSpeaking(false);
    expect(useTourStore.getState().isSpeaking).toBe(false);
  });

  it('setListening toggles isListening', () => {
    useTourStore.getState().setListening(true);
    expect(useTourStore.getState().isListening).toBe(true);
  });

  it('setReply sets lastReply and stamps lastReplyAt', () => {
    const before = Date.now();
    useTourStore.getState().setReply('Kitchen light is off.');
    const s = useTourStore.getState();
    expect(s.lastReply).toBe('Kitchen light is off.');
    expect(s.lastReplyAt).not.toBeNull();
    expect(s.lastReplyAt as number).toBeGreaterThanOrEqual(before);
  });

  it('setDockExpanded toggles isDockExpanded', () => {
    useTourStore.getState().setDockExpanded(true);
    expect(useTourStore.getState().isDockExpanded).toBe(true);
  });
});
