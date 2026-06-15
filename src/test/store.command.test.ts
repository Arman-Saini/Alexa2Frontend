import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/store';
import { DEFAULT_PLACED_OBJECTS } from '../constants/defaults';

// Resets the singleton store to the default home before each test so commands
// don't leak state between cases.
function reset() {
  useAppStore.setState((s) => ({
    placedObjects: structuredClone(DEFAULT_PLACED_OBJECTS),
    ui: { ...s.ui, activeRoomId: null },
    recentlyChangedIds: [],
  }));
}

function device(id: string) {
  return useAppStore.getState().placedObjects.find((o) => o.id === id);
}

describe('executeVoiceCommand (store integration via processCommand)', () => {
  beforeEach(reset);

  it('turns on the bedroom fan and focuses the bedroom', () => {
    const resp = useAppStore.getState().executeVoiceCommand('turn on the fan in the bedroom');
    expect(device('mb-fan')?.alexaDeviceState.isOn).toBe(true);
    expect(useAppStore.getState().ui.activeRoomId).toBe('master-bedroom');
    expect(useAppStore.getState().recentlyChangedIds).toContain('mb-fan');
    expect(resp.toLowerCase()).toContain('fan');
  });

  it('turns off the kitchen light', () => {
    useAppStore.getState().executeVoiceCommand('turn off the kitchen light');
    expect(device('kt-bulb')?.alexaDeviceState.isOn).toBe(false);
    expect(useAppStore.getState().ui.activeRoomId).toBe('kitchen');
  });

  it('greets without changing any devices or the camera', () => {
    const before = JSON.stringify(useAppStore.getState().placedObjects);
    const resp = useAppStore.getState().executeVoiceCommand('hello alexa');
    expect(resp.length).toBeGreaterThan(0);
    expect(JSON.stringify(useAppStore.getState().placedObjects)).toBe(before);
    expect(useAppStore.getState().ui.activeRoomId).toBeNull();
  });

  it('returns a graceful fallback for unknown commands', () => {
    const resp = useAppStore.getState().executeVoiceCommand('order me a pizza');
    expect(resp.length).toBeGreaterThan(0);
  });
});
