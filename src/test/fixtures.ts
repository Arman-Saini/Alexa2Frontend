// Minimal PlacedObject fixtures used across unit tests.
import type { PlacedObject } from '../types';

function device(id: string, type: PlacedObject['type'], room: string, extra: Partial<PlacedObject['alexaDeviceState']> = {}): PlacedObject {
  return {
    id,
    type,
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    description: type,
    deviceName: id,
    parentRoomId: room,
    isAlexaDevice: true,
    alexaDeviceState: { isOn: false, ...extra },
  };
}

export const LIVING_ROOM_BULB   = device('lr-bulb',   'smart-bulb',   'living-room',     { brightness: 80, colorTemp: 4000 });
export const BEDROOM_BULB       = device('br-bulb',   'smart-bulb',   'master-bedroom',  { brightness: 60 });
export const KITCHEN_BULB       = device('kt-bulb',   'smart-bulb',   'kitchen',         { brightness: 80 });
export const LIVING_ROOM_FAN    = device('lr-fan',    'ceiling-fan',  'living-room',     { speed: 3 });
export const BEDROOM_FAN        = device('br-fan',    'ceiling-fan',  'master-bedroom',  { speed: 2 });
export const LIVING_ROOM_TV     = device('lr-tv',     'smart-tv',     'living-room',     { volume: 30, channel: 5 });
export const THERMOSTAT         = device('th-1',      'thermostat',   'living-room',     { temperature: 22 });
export const SMART_LOCK         = device('lock-1',    'smart-lock',   'living-room',     { isLocked: true });
export const KITCHEN_PLUG       = device('kt-plug',   'smart-plug',   'kitchen');
export const AIR_PURIFIER       = device('ap-1',      'air-purifier', 'living-room',     { speed: 2 });
export const CAMERA             = device('cam-1',     'camera',       'living-room',     { isOn: true });
export const SMOKE_DETECTOR     = device('sd-1',      'smoke-detector','living-room',    { isOn: true });

// Standard test set used by most command tests
export const ALL_DEVICES: PlacedObject[] = [
  LIVING_ROOM_BULB, BEDROOM_BULB, KITCHEN_BULB,
  LIVING_ROOM_FAN, BEDROOM_FAN,
  LIVING_ROOM_TV, THERMOSTAT, SMART_LOCK,
  KITCHEN_PLUG, AIR_PURIFIER,
  CAMERA, SMOKE_DETECTOR,
];
