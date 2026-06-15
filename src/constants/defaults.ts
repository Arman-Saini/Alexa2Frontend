import type { PlacedObject, AssetType, AlexaDeviceState } from '../types';
import { ASSET_MAP } from './assets';
import { ROOM_BOUNDS } from './roomBounds';
import { resolveAnchor } from '../utils/anchorResolver';
import type { AnchorDef } from '../utils/anchorResolver';
import anchorLayout from './anchorLayout.json';

// Map anchorLayout.json room keys → ROOM_BOUNDS keys (both camelCase, same shape)
const BOUNDS_KEY: Record<string, string> = {
  livingRoom:    'livingRoom',
  masterBedroom: 'masterBedroom',
  bathroom:      'bathroom',
  homeOffice:    'homeOffice',
  kitchenDining: 'kitchenDining',
  hallway:       'hallway',
};

// Map anchorLayout.json room keys → store parentRoomId (hyphenated)
const STORE_ROOM_ID: Record<string, string> = {
  livingRoom:    'living-room',
  masterBedroom: 'master-bedroom',
  bathroom:      'bathroom',
  homeOffice:    'office',
  kitchenDining: 'kitchen',
  hallway:       'hallway',
};

// Alexa device state per device id
const STATE_OVERRIDES: Record<string, Partial<AlexaDeviceState>> = {
  'lr-tv':      { isOn: false, volume: 30, channel: 3 },
  'lr-bulb':    { isOn: true,  brightness: 80, colorTemp: 3000 },
  'lr-fan':     { isOn: true,  speed: 2 },
  'lr-echo':    { isOn: true,  volume: 55 },
  'lr-ac':      { isOn: true,  temperature: 23, humidity: 45 },
  'lr-motion':  { isOn: true,  motionDetected: false },
  'lr-camera2': { isOn: true,  motionDetected: false },

  'mb-bulb': { isOn: false, brightness: 40, colorTemp: 2700 },
  'mb-fan':  { isOn: false, speed: 1 },
  'mb-show': { isOn: true,  brightness: 60, volume: 30 },
  'mb-lock': { isOn: true,  isLocked: true },

  'ba-bulb':  { isOn: true,  brightness: 100, colorTemp: 5500 },
  'ba-fan':   { isOn: false, speed: 1 },
  'ba-smoke': { isOn: true,  batteryLevel: 95 },

  'of-bulb': { isOn: true,  brightness: 70, colorTemp: 4000 },
  'of-tv':   { isOn: false, volume: 20, channel: 1 },
  'of-echo': { isOn: true,  volume: 35 },
  'of-air':  { isOn: true,  speed: 2, airQuality: 28 },

  'kt-bulb':   { isOn: true,  brightness: 90, colorTemp: 5000 },
  'kt-fan':    { isOn: false, speed: 1 },
  'kt-echo':   { isOn: true,  volume: 45 },
  'kt-thermo': { isOn: true,  temperature: 22, humidity: 44 },
  'kt-plug':   { isOn: true,  powerConsumption: 65 },

  'hw-doorbell': { isOn: true, batteryLevel: 90 },
  'hw-camera':   { isOn: true, motionDetected: false },
};

function makeDevice(
  id: string, type: AssetType, x: number, z: number,
  rotY: number, roomId: string,
  stateOverrides: Partial<AlexaDeviceState>,
  desc: string,
): PlacedObject {
  const def = ASSET_MAP.get(type)!;
  return {
    id, type,
    position: { x, y: 0, z },
    rotation: { x: 0, y: rotY, z: 0 },
    description: desc,
    deviceName: def.label,
    parentRoomId: roomId,
    isAlexaDevice: def.isAlexaDevice,
    alexaDeviceState: { ...def.defaultState, ...stateOverrides },
    color: def.color,
  };
}

export const DEFAULT_PLACED_OBJECTS: PlacedObject[] = (
  Object.entries(anchorLayout.rooms) as [string, { devices?: unknown[] }][]
).flatMap(([roomKey, roomData]) => {
  const devices = (roomData.devices ?? []) as Array<{
    id: string;
    deviceType: string;
    anchor: AnchorDef;
    distFromWall?: number;
    rotY?: number;
    desc?: string;
  }>;
  const bounds = ROOM_BOUNDS[BOUNDS_KEY[roomKey]];
  const roomId = STORE_ROOM_ID[roomKey];
  if (!bounds || !roomId) return [];

  return devices.map((d) => {
    const [x, , z] = resolveAnchor(d.anchor, bounds, { distFromWall: d.distFromWall ?? 0.3 });
    return makeDevice(
      d.id, d.deviceType as AssetType, x, z,
      d.rotY ?? 0, roomId,
      STATE_OVERRIDES[d.id] ?? {},
      d.desc ?? d.id,
    );
  });
});
