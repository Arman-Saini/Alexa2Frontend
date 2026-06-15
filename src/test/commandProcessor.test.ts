import { describe, it, expect } from 'vitest';
import { processCommand } from '../store/commandProcessor';
import {
  ALL_DEVICES, LIVING_ROOM_BULB, BEDROOM_BULB, KITCHEN_BULB,
  LIVING_ROOM_FAN, BEDROOM_FAN, LIVING_ROOM_TV,
  THERMOSTAT, SMART_LOCK, KITCHEN_PLUG, AIR_PURIFIER,
} from './fixtures';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns the isOn value from updates for a specific device id */
function updatedIsOn(result: ReturnType<typeof processCommand>, id: string): boolean | undefined {
  return result.updates.find(u => u.id === id)?.changes.isOn;
}

function updatedField<K extends keyof ReturnType<typeof processCommand>['updates'][number]['changes']>(
  result: ReturnType<typeof processCommand>,
  id: string,
  field: K
) {
  return result.updates.find(u => u.id === id)?.changes[field];
}

// ── Greeting commands (T0_LOCAL) ───────────────────────────────────────────────

describe('greetings', () => {
  it('responds to hello', () => {
    const r = processCommand('hello', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(r.updates).toHaveLength(0);
  });

  it('responds to hi', () => {
    const r = processCommand('hi', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
  });

  it('strips wake word: hey alexa hello', () => {
    const r = processCommand('hey alexa hello', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
  });

  it('responds to how are you', () => {
    const r = processCommand('how are you', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
  });

  it('responds to thank you', () => {
    const r = processCommand('thank you', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
  });

  it('responds to what can you do', () => {
    const r = processCommand('what can you do', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(r.response).toContain('light');
  });
});

// ── Scene commands (T0_LOCAL) ──────────────────────────────────────────────────

describe('scenes', () => {
  it('good morning , turns on bulbs and thermostat', () => {
    const r = processCommand('good morning', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    // Living room bulb should be ON at full brightness
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(100);
    // Thermostat ON at 22°C
    expect(updatedIsOn(r, THERMOSTAT.id)).toBe(true);
    expect(updatedField(r, THERMOSTAT.id, 'temperature')).toBe(22);
    // Fans OFF
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
  });

  it('good night , turns off all controllable devices and locks door', () => {
    const r = processCommand('good night', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(false);
    // Lock should be locked
    expect(updatedField(r, SMART_LOCK.id, 'isLocked')).toBe(true);
  });

  it('sleep mode triggers good night behavior', () => {
    const r = processCommand('sleep mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
  });

  it('movie mode , dims lights, turns on TV', () => {
    const r = processCommand('movie mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(20);
  });

  it('leaving home , away mode locks door, cameras stay on', () => {
    const r = processCommand("I'm leaving", ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
    expect(updatedField(r, SMART_LOCK.id, 'isLocked')).toBe(true);
    // Camera should stay ON (away mode keeps security devices active)
    expect(updatedIsOn(r, 'cam-1')).toBe(true);
  });

  it('party mode , all lights full brightness', () => {
    const r = processCommand('party mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(100);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(true);
    expect(updatedField(r, LIVING_ROOM_FAN.id, 'speed')).toBe(5);
  });

  it('relax mode , warm dim lights', () => {
    const r = processCommand('relax mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'colorTemp')).toBe(2700);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(30);
  });

  it('power saving mode , fans and TVs off, lights dimmed', () => {
    const r = processCommand('power saving mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(false);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(40);
  });

  it('focus mode (study) , office lights full, others off', () => {
    const r = processCommand('study mode', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false); // other room lights off
  });
});

// ── All lights (T0_LOCAL) ──────────────────────────────────────────────────────

describe('all lights', () => {
  it('turns all lights on', () => {
    const r = processCommand('turn on all lights', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
    expect(updatedIsOn(r, BEDROOM_BULB.id)).toBe(true);
    expect(updatedIsOn(r, KITCHEN_BULB.id)).toBe(true);
  });

  it('lights off', () => {
    const r = processCommand('lights off', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
    expect(updatedIsOn(r, BEDROOM_BULB.id)).toBe(false);
  });

  it('lights out', () => {
    const r = processCommand('lights out', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
  });

  it('dims all lights', () => {
    const r = processCommand('dim the lights', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(20);
  });

  it('sets all lights to 50%', () => {
    const r = processCommand('brightness 50', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(50);
    expect(updatedField(r, BEDROOM_BULB.id, 'brightness')).toBe(50);
  });

  it('sets warm white', () => {
    const r = processCommand('warm light', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'colorTemp')).toBe(2700);
  });

  it('sets cool white', () => {
    const r = processCommand('cool white light', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'colorTemp')).toBe(5500);
  });
});

// ── Room + lights (T1_LOCAL) ───────────────────────────────────────────────────

describe('room lights', () => {
  it('bedroom light on', () => {
    const r = processCommand('turn on bedroom light', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(updatedIsOn(r, BEDROOM_BULB.id)).toBe(true);
    // Other rooms unaffected
    expect(r.updates.find(u => u.id === LIVING_ROOM_BULB.id)).toBeUndefined();
  });

  it('kitchen light off', () => {
    const r = processCommand('kitchen light off', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, KITCHEN_BULB.id)).toBe(false);
    expect(r.updates.find(u => u.id === BEDROOM_BULB.id)).toBeUndefined();
  });

  it('living room brightness 30%', () => {
    const r = processCommand('living room brightness 30', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(30);
  });

  it('dim bedroom lights', () => {
    const r = processCommand('dim bedroom lights', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, BEDROOM_BULB.id, 'brightness')).toBe(20);
    expect(updatedField(r, BEDROOM_BULB.id, 'colorTemp')).toBe(2700);
  });

  it('brighten living room lights', () => {
    const r = processCommand('brighten living room lights', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_BULB.id, 'brightness')).toBe(100);
  });

  it('bathroom alias (washroom) maps correctly', () => {
    const r = processCommand('washroom light on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    // No bathroom bulb in fixtures, but should still match bathroom room
    expect(r.roomFocus).toBe('bathroom');
  });
});

// ── All fans (T0_LOCAL) ────────────────────────────────────────────────────────

describe('all fans', () => {
  it('fans on', () => {
    const r = processCommand('fans on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(true);
    expect(updatedIsOn(r, BEDROOM_FAN.id)).toBe(true);
  });

  it('fans off', () => {
    const r = processCommand('turn off all fans', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
    expect(updatedIsOn(r, BEDROOM_FAN.id)).toBe(false);
  });
});

// ── Room + fan (T1_LOCAL) ──────────────────────────────────────────────────────

describe('room fans', () => {
  it('bedroom fan on', () => {
    const r = processCommand('bedroom fan on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(updatedIsOn(r, BEDROOM_FAN.id)).toBe(true);
    expect(r.updates.find(u => u.id === LIVING_ROOM_FAN.id)).toBeUndefined();
  });

  it('living room fan off', () => {
    const r = processCommand('turn off living room fan', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
  });

  it('fan speed 3', () => {
    const r = processCommand('fan speed 3', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_FAN.id, 'speed')).toBe(3);
  });

  it('bedroom fan speed 5', () => {
    const r = processCommand('bedroom fan speed 5', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, BEDROOM_FAN.id, 'speed')).toBe(5);
    expect(r.updates.find(u => u.id === LIVING_ROOM_FAN.id)).toBeUndefined();
  });

  it('fan max speed', () => {
    const r = processCommand('fan max', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_FAN.id, 'speed')).toBe(5);
  });

  it('fan low speed', () => {
    const r = processCommand('fan on low', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_FAN.id, 'speed')).toBe(1);
  });

  it('fan medium', () => {
    const r = processCommand('fan medium', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_FAN.id, 'speed')).toBe(3);
  });
});

// ── Room lights + fan combo (T1_LOCAL) ────────────────────────────────────────

describe('room lights + fan combo', () => {
  it('bedroom lights and fan on', () => {
    const r = processCommand('bedroom lights and fan on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(updatedIsOn(r, BEDROOM_BULB.id)).toBe(true);
    expect(updatedIsOn(r, BEDROOM_FAN.id)).toBe(true);
  });
});

// ── TV commands ────────────────────────────────────────────────────────────────

describe('TV', () => {
  it('TV on', () => {
    const r = processCommand('turn on TV', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(true);
  });

  it('TV off', () => {
    const r = processCommand('TV off', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(false);
  });

  it('TV volume 50', () => {
    const r = processCommand('TV volume 50', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_TV.id, 'volume')).toBe(50);
  });

  it('TV volume up', () => {
    const r = processCommand('volume up', ALL_DEVICES);
    expect(r.matched).toBe(true);
    // Volume should increase from initial 30 to 40
    expect(updatedField(r, LIVING_ROOM_TV.id, 'volume')).toBe(40);
  });

  it('TV mute', () => {
    const r = processCommand('mute the TV', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_TV.id, 'volume')).toBe(0);
    expect(r.tier).toBe('T0_LOCAL');
  });

  it('TV channel 7', () => {
    const r = processCommand('channel 7', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, LIVING_ROOM_TV.id, 'channel')).toBe(7);
  });
});

// ── Geyser (T0_LOCAL) ─────────────────────────────────────────────────────────

describe('geyser', () => {
  it('geyser on', () => {
    const r = processCommand('geyser on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedIsOn(r, KITCHEN_PLUG.id)).toBe(true);
  });

  it('turn off geyser', () => {
    const r = processCommand('turn off geyser', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, KITCHEN_PLUG.id)).toBe(false);
  });

  it('water heater off', () => {
    const r = processCommand('turn off water heater', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, KITCHEN_PLUG.id)).toBe(false);
  });

  it('geyser without action does not match as geyser', () => {
    // "geyser" alone has no on/off action → falls through to BACKEND_NEEDED
    const r = processCommand('geyser', ALL_DEVICES);
    expect(r.tier).toBe('BACKEND_NEEDED');
  });
});

// ── Smart lock (T0_LOCAL) ─────────────────────────────────────────────────────

describe('smart lock', () => {
  it('lock the door', () => {
    const r = processCommand('lock the door', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(updatedField(r, SMART_LOCK.id, 'isLocked')).toBe(true);
  });

  it('unlock the door', () => {
    const r = processCommand('unlock the door', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, SMART_LOCK.id, 'isLocked')).toBe(false);
  });
});

// ── Thermostat / AC (T1_LOCAL) ────────────────────────────────────────────────

describe('thermostat', () => {
  it('set temperature to 24 degrees', () => {
    const r = processCommand('set temperature to 24 degrees', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(updatedField(r, THERMOSTAT.id, 'temperature')).toBe(24);
  });

  it('clamps temperature to max 30', () => {
    const r = processCommand('set thermostat to 35', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, THERMOSTAT.id, 'temperature')).toBe(30);
  });

  it('temperature up', () => {
    const r = processCommand('temperature up', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, THERMOSTAT.id, 'temperature')).toBe(23); // 22+1
  });

  it('temperature down', () => {
    const r = processCommand('temperature down', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, THERMOSTAT.id, 'temperature')).toBe(21); // 22-1
  });

  it('AC on', () => {
    const r = processCommand('AC on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, THERMOSTAT.id)).toBe(true);
  });
});

// ── Air purifier (T0/T1) ──────────────────────────────────────────────────────

describe('air purifier', () => {
  it('air purifier on', () => {
    const r = processCommand('air purifier on', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, AIR_PURIFIER.id)).toBe(true);
  });

  it('purifier speed 4', () => {
    const r = processCommand('purifier speed 4', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedField(r, AIR_PURIFIER.id, 'speed')).toBe(4);
  });
});

// ── Everything on/off (T0_LOCAL) ──────────────────────────────────────────────

describe('everything on/off', () => {
  it('turn off everything', () => {
    const r = processCommand('turn off everything', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    // Controllable devices should be off; cameras excluded
    const bulbUpdate = r.updates.find(u => u.id === LIVING_ROOM_BULB.id);
    expect(bulbUpdate?.changes.isOn).toBe(false);
    // Camera not in controllable list , should not appear in updates or if it does, its value is irrelevant
    const cameraUpdate = r.updates.find(u => u.id === 'cam-1');
    if (cameraUpdate) expect(cameraUpdate.changes.isOn).toBeUndefined(); // camera not toggled
  });

  it('all off', () => {
    const r = processCommand('all off', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(false);
  });

  it('turn on everything', () => {
    const r = processCommand('turn on everything', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
  });
});

// ── Room all-devices (T1_LOCAL) ───────────────────────────────────────────────

describe('room all devices', () => {
  it('turn off everything in bedroom', () => {
    const r = processCommand('turn off everything in bedroom', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(updatedIsOn(r, BEDROOM_BULB.id)).toBe(false);
    expect(updatedIsOn(r, BEDROOM_FAN.id)).toBe(false);
    // Living room unaffected
    expect(r.updates.find(u => u.id === LIVING_ROOM_BULB.id)).toBeUndefined();
  });
});

// ── Status queries (T1_LOCAL) ──────────────────────────────────────────────────

describe('status queries', () => {
  it("what's on , returns count of on devices", () => {
    const devicesWithSomeOn = ALL_DEVICES.map(d =>
      d.id === LIVING_ROOM_BULB.id ? { ...d, alexaDeviceState: { ...d.alexaDeviceState, isOn: true } } : d
    );
    const r = processCommand("what's on", devicesWithSomeOn);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(r.response).toContain('1');
  });

  it('all off , status query with nothing on', () => {
    const r = processCommand("what's on", ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.response.toLowerCase()).toContain('off');
  });

  it('bedroom status', () => {
    const r = processCommand('bedroom status', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T1_LOCAL');
    expect(r.response).toContain('bedroom');
  });
});

// ── Room navigation (T0_LOCAL) ────────────────────────────────────────────────

describe('room navigation', () => {
  it('show bedroom', () => {
    const r = processCommand('show bedroom', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.tier).toBe('T0_LOCAL');
    expect(r.roomFocus).toBe('master-bedroom');
    expect(r.updates).toHaveLength(0);
  });

  it('show full home', () => {
    const r = processCommand('show all rooms', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.roomFocus).toBeNull();
  });

  it('go to kitchen', () => {
    const r = processCommand('go to kitchen', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(r.roomFocus).toBe('kitchen');
  });
});

// ── Wake word stripping ────────────────────────────────────────────────────────

describe('wake word stripping', () => {
  const variants = [
    'Alexa turn on lights',
    'Hey Alexa turn on lights',
    'Okay Alexa turn on lights',
    'Ok Alexa turn on lights',
    'Please turn on lights',
  ];
  it.each(variants)('strips wake words: %s', (cmd) => {
    const r = processCommand(cmd, ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
  });
});

// ── Hinglish / regional variants ──────────────────────────────────────────────

describe('Hinglish variants', () => {
  it('lights chalao (turn on)', () => {
    const r = processCommand('lights chalao', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_BULB.id)).toBe(true);
  });

  it('fan band kar (turn off)', () => {
    const r = processCommand('fan band kar', ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_FAN.id)).toBe(false);
  });
});

// ── Unmatched → BACKEND_NEEDED ────────────────────────────────────────────────

describe('unmatched commands', () => {
  it('complex query escalates to BACKEND_NEEDED', () => {
    const r = processCommand('what will the weather be like tomorrow', ALL_DEVICES);
    expect(r.matched).toBe(false);
    expect(r.tier).toBe('BACKEND_NEEDED');
    expect(r.updates).toHaveLength(0);
  });

  it('empty string returns BACKEND_NEEDED', () => {
    const r = processCommand('', ALL_DEVICES);
    expect(r.matched).toBe(false);
    expect(r.tier).toBe('BACKEND_NEEDED');
  });

  it('unknown device name returns BACKEND_NEEDED when no match', () => {
    const r = processCommand('turn on the plasma cannon', ALL_DEVICES);
    expect(r.matched).toBe(false);
    expect(r.tier).toBe('BACKEND_NEEDED');
  });
});

// ── Individual device name matching ───────────────────────────────────────────

describe('device name matching', () => {
  it('matches device by exact name', () => {
    const r = processCommand(`turn on ${LIVING_ROOM_TV.deviceName}`, ALL_DEVICES);
    expect(r.matched).toBe(true);
    expect(updatedIsOn(r, LIVING_ROOM_TV.id)).toBe(true);
  });
});
