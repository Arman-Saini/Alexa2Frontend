import type { PlacedObject, AssetType, AlexaDeviceState } from '../types';
import { ASSET_MAP } from './assets';

// Interactive smart DEVICES only (lights, fans, TV, echo, thermostat, lock, etc.).
// Static furniture is rendered separately by RoomFurniture.tsx (Quaternius pack).
// Coordinates are in metres on the 26×20 floor plan (2× scale, see layout.ts).
function obj(
  id: string, type: AssetType, x: number, z: number, rotY: number, roomId: string,
  stateOverrides: Partial<AlexaDeviceState> = {}, desc?: string,
): PlacedObject {
  const def = ASSET_MAP.get(type)!;
  return {
    id, type,
    position: { x, y: 0, z },
    rotation: { x: 0, y: rotY, z: 0 },
    description: desc ?? def.defaultDescription,
    deviceName: def.label,
    parentRoomId: roomId,
    isAlexaDevice: def.isAlexaDevice,
    alexaDeviceState: { ...def.defaultState, ...stateOverrides },
    color: def.color,
  };
}

export const DEFAULT_PLACED_OBJECTS: PlacedObject[] = [
  // ── Living Room  x[-3,13] z[-10,2] ─────────────────────────────────
  obj('lr-tv',     'smart-tv',      5.0,  -9.2, 0,  'living-room', { isOn: false, volume: 30, channel: 3 }, 'Living Room · 85" Smart TV on the north wall'),
  obj('lr-bulb',   'smart-bulb',    5.0,  -4.0, 0,  'living-room', { isOn: true, brightness: 80, colorTemp: 3000 }, 'Living Room · ceiling light'),
  obj('lr-fan',    'ceiling-fan',   5.0,  -4.0, 0,  'living-room', { isOn: true, speed: 2 }, 'Living Room · ceiling fan'),
  obj('lr-echo',   'echo-dot',      0.4,  -8.6, 0,  'living-room', { isOn: true, volume: 55 }, 'Living Room · Alexa hub on the console'),
  obj('lr-ac',     'thermostat',   12.4,  -4.0, -Math.PI / 2, 'living-room', { isOn: true, temperature: 23, humidity: 45 }, 'Living Room · smart AC / thermostat'),
  obj('lr-motion', 'motion-sensor',12.4,  -9.2, 0,  'living-room', { isOn: true, motionDetected: false }, 'Living Room · motion sensor'),

  // ── Master Bedroom  x[-13,-3] z[-10,0] ─────────────────────────────
  obj('mb-bulb',  'smart-bulb',   -8.0,  -5.0, 0,  'master-bedroom', { isOn: false, brightness: 40, colorTemp: 2700 }, 'Master Bedroom · ceiling light'),
  obj('mb-fan',   'ceiling-fan',  -8.0,  -5.0, 0,  'master-bedroom', { isOn: false, speed: 1 }, 'Master Bedroom · smart ceiling fan'),
  obj('mb-show',  'echo-show',    -4.6,  -8.6, 0,  'master-bedroom', { isOn: true, brightness: 60, volume: 30 }, 'Master Bedroom · Echo Show on the nightstand'),
  obj('mb-lock',  'smart-lock',   -3.4,  -5.0, -Math.PI / 2, 'master-bedroom', { isOn: true, isLocked: true }, 'Master Bedroom · smart lock'),

  // ── Bathroom  x[-13,-3] z[0,4] ────────────────────────────────────
  obj('ba-bulb',  'smart-bulb',     -8.0, 2.0, 0, 'bathroom', { isOn: true, brightness: 100, colorTemp: 5500 }, 'Bathroom · ceiling light'),
  obj('ba-fan',   'ceiling-fan',    -8.0, 2.0, 0, 'bathroom', { isOn: false, speed: 1 }, 'Bathroom · exhaust fan'),
  obj('ba-smoke', 'smoke-detector', -8.0, 3.4, 0, 'bathroom', { isOn: true, batteryLevel: 95 }, 'Bathroom · smoke & humidity detector'),

  // ── Home Office  x[-13,-3] z[4,10] ─────────────────────────────────
  obj('of-bulb', 'smart-bulb',    -8.0, 7.0, 0,  'office', { isOn: true, brightness: 70, colorTemp: 4000 }, 'Office · ceiling light'),
  obj('of-tv',   'smart-tv',     -12.0, 7.0, Math.PI / 2, 'office', { isOn: false, volume: 20, channel: 1 }, 'Office · dual monitors / screen'),
  obj('of-echo', 'echo-dot',     -10.8, 5.6, 0,  'office', { isOn: true, volume: 35 }, 'Office · Echo Dot on the desk'),
  obj('of-air',  'air-purifier',  -4.4, 5.0, 0,  'office', { isOn: true, speed: 2, airQuality: 28 }, 'Office · air purifier'),

  // ── Kitchen + Dining  x[3,13] z[2,10] ──────────────────────────────
  obj('kt-bulb',   'smart-bulb',   8.0, 6.0, 0, 'kitchen', { isOn: true, brightness: 90, colorTemp: 5000 }, 'Kitchen · ceiling light'),
  obj('kt-fan',    'ceiling-fan',  8.0, 6.0, 0, 'kitchen', { isOn: false, speed: 1 }, 'Kitchen · ceiling fan'),
  obj('kt-echo',   'echo-dot',    11.8, 3.2, 0, 'kitchen', { isOn: true, volume: 45 }, 'Kitchen · Echo Dot'),
  obj('kt-thermo', 'thermostat',  12.4, 6.0, -Math.PI / 2, 'kitchen', { isOn: true, temperature: 22, humidity: 44 }, 'Kitchen · thermostat'),
  obj('kt-plug',   'smart-plug',   4.0, 2.8, 0, 'kitchen', { isOn: true, powerConsumption: 65 }, 'Kitchen · smart plug (water purifier)'),

  // ── Hallway x[-3,3] z[2,10] ───────────────────────────────────────────────
  obj('hw-doorbell', 'doorbell', 0.0, 2.5, 0, 'hallway', { isOn: true, batteryLevel: 90 }, 'Hallway · video doorbell at main entrance'),
  obj('hw-camera',   'camera',   0.0, 9.2, 0, 'hallway', { isOn: true, motionDetected: false }, 'Hallway · security camera facing entrance'),
  obj('lr-camera2',  'camera',  -2.5, -2.5, Math.PI/2, 'living-room', { isOn: true, motionDetected: false }, 'Living Room · indoor security camera'),
];
