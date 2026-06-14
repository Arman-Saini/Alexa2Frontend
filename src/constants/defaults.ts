import type { PlacedObject, AssetType, AlexaDeviceState } from '../types';
import { ASSET_MAP } from './assets';

function obj(
  id: string,
  type: AssetType,
  x: number,
  z: number,
  rotY: number,
  roomId: string,
  stateOverrides: Partial<AlexaDeviceState> = {}
): PlacedObject {
  const def = ASSET_MAP.get(type)!;
  return {
    id,
    type,
    position:          { x, y: 0, z },
    rotation:          { x: 0, y: rotY, z: 0 },
    description:       def.defaultDescription,
    deviceName:        def.label,
    parentRoomId:      roomId,
    isAlexaDevice:     def.isAlexaDevice,
    alexaDeviceState:  { ...def.defaultState, ...stateOverrides },
    color:             def.color,
  };
}

const PI  = Math.PI;
const HPI = Math.PI / 2;

// Room bounds (centered on world origin, 24 × 16 total):
//   living-room:    x[-12, 4]  z[-8, 0]   centre (-4, -4)
//   kitchen:        x[4,  12]  z[-8, 0]   centre (8, -4)
//   master-bedroom: x[-12, -4] z[0,   8]  centre (-8, 4)
//   bathroom:       x[-4,   4] z[0,   8]  centre (0, 4)
//   office:         x[4,  12]  z[0,   8]  centre (8, 4)

export const DEFAULT_PLACED_OBJECTS: PlacedObject[] = [

  // ── Living Room ──────────────────────────────────────────────────────────────
  // Sofa + 2 arm chairs around the central table
  obj('lr-sofa',     'sofa',          -4.0,  -2.5, PI,    'living-room'),
  obj('lr-chair1',   'chair',         -6.8,  -4.8,  HPI,  'living-room'),
  obj('lr-chair2',   'chair',         -1.2,  -4.8, -HPI,  'living-room'),
  obj('lr-table',    'table',         -4.0,  -4.8,  0,    'living-room'),

  // TV + stand against the back wall (z = -7.5 ~ wall)
  obj('lr-tvstand',  'tv-stand',      -4.0,  -7.2,  0,    'living-room'),
  obj('lr-tv',       'smart-tv',      -4.0,  -7.0,  0,    'living-room', { isOn: false, volume: 30, channel: 3 }),

  // Bookshelf in corner
  obj('lr-shelf',    'bookshelf',     -11.0, -7.2,  HPI,  'living-room'),

  // Echo on the tv-stand side table
  obj('lr-echo',     'echo-dot',      -9.5,  -7.2,  0,    'living-room', { isOn: true, volume: 55 }),

  // Ceiling bulb (height handled by HEIGHTS constant = 2.7, so position y=0 here)
  obj('lr-bulb',     'smart-bulb',    -4.0,  -4.0,  0,    'living-room', { isOn: true, brightness: 80, colorTemp: 3000 }),

  // Motion sensor up on wall
  obj('lr-motion',   'motion-sensor', -11.5, -1.5,  0,    'living-room', { isOn: true, motionDetected: false }),

  // Decorative plants in corners
  obj('lr-plant1',   'plant',          2.5,  -7.2,  0,    'living-room'),
  obj('lr-plant2',   'plant',         -11.5, -1.2,  0,    'living-room'),

  // ── Kitchen ──────────────────────────────────────────────────────────────────
  // Dining table centred in kitchen, chairs closer to table
  obj('kt-table',    'table',          8.0,  -4.5,  0,    'kitchen'),
  obj('kt-chair1',   'chair',          6.5,  -4.5,  HPI,  'kitchen'),
  obj('kt-chair2',   'chair',          9.5,  -4.5, -HPI,  'kitchen'),

  obj('kt-thermo',   'thermostat',    11.5,  -4.0,  HPI,  'kitchen', { isOn: true, temperature: 21.5, humidity: 44 }),
  obj('kt-plug',     'smart-plug',    11.5,  -7.5,  0,    'kitchen', { isOn: true, powerConsumption: 65 }),
  obj('kt-bulb',     'smart-bulb',     8.0,  -4.0,  0,    'kitchen', { isOn: true, brightness: 90, colorTemp: 5000 }),
  obj('kt-echo',     'echo-dot',       5.2,  -7.2,  0,    'kitchen', { isOn: true, volume: 45 }),
  obj('kt-plant',    'plant',          5.2,  -1.2,  0,    'kitchen'),

  // ── Master Bedroom ────────────────────────────────────────────────────────────
  obj('mb-bed',      'bed',           -8.0,   3.8,  0,    'master-bedroom'),
  obj('mb-wardrobe', 'wardrobe',     -11.2,   6.2,  HPI,  'master-bedroom'),
  obj('mb-show',     'echo-show',    -10.8,   0.6,  0,    'master-bedroom', { isOn: true, brightness: 60, volume: 30 }),
  obj('mb-bulb',     'smart-bulb',    -8.0,   1.0,  0,    'master-bedroom', { isOn: false, brightness: 40, colorTemp: 2700 }),
  obj('mb-lock',     'smart-lock',    -9.5,   0.3,  0,    'master-bedroom', { isOn: true, isLocked: true }),
  obj('mb-plant',    'plant',         -5.2,   7.2,  0,    'master-bedroom'),

  // ── Bathroom ─────────────────────────────────────────────────────────────────
  obj('ba-tub',      'bathtub',        0.0,   5.8,  0,    'bathroom'),
  obj('ba-bulb',     'smart-bulb',     0.0,   1.0,  0,    'bathroom', { isOn: true, brightness: 100, colorTemp: 5500 }),
  obj('ba-smoke',    'smoke-detector', 0.0,   0.6,  0,    'bathroom', { isOn: true, batteryLevel: 95 }),
  obj('ba-echo',     'echo-dot',       3.2,   0.6,  PI,   'bathroom', { isOn: true, volume: 25 }),

  // ── Office ───────────────────────────────────────────────────────────────────
  obj('of-desk',     'desk',           8.0,   1.5,  0,    'office'),
  obj('of-chair',    'chair',          8.0,   3.0,  0,    'office'),
  obj('of-shelf',    'bookshelf',     11.2,   4.5,  HPI,  'office'),
  obj('of-echo',     'echo-dot',       5.5,   0.6,  0,    'office', { isOn: true, volume: 35 }),
  obj('of-air',      'air-purifier',   5.5,   7.2,  0,    'office', { isOn: true, speed: 2, airQuality: 28 }),
  obj('of-plug',     'smart-plug',    11.5,   1.0,  0,    'office', { isOn: false }),
  obj('of-plant',    'plant',         11.5,   7.2,  0,    'office'),
  obj('of-bulb',     'smart-bulb',     8.0,   4.0,  0,    'office', { isOn: true, brightness: 70, colorTemp: 4000 }),
];
