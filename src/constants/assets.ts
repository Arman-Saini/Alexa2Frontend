import type { AssetType, AlexaDeviceState } from '../types';

export interface AssetDefinition {
  type: AssetType;
  label: string;
  emoji: string;
  isAlexaDevice: boolean;
  color: string;
  defaultState: AlexaDeviceState;
  defaultDescription: string;
}

export const ASSET_DEFINITIONS: AssetDefinition[] = [
  // Alexa / IoT Devices
  {
    type: 'smart-bulb',
    label: 'Smart Bulb',
    emoji: '💡',
    isAlexaDevice: true,
    color: '#FFD700',
    defaultState: { isOn: true, brightness: 80, powerConsumption: 9 },
    defaultDescription: 'Alexa-controlled smart light bulb with adjustable brightness.',
  },
  {
    type: 'echo-dot',
    label: 'Echo Dot',
    emoji: '🔊',
    isAlexaDevice: true,
    color: '#1a1a2e',
    defaultState: { isOn: true },
    defaultDescription: 'Amazon Echo Dot smart speaker with Alexa voice assistant.',
  },
  {
    type: 'echo-show',
    label: 'Echo Show',
    emoji: '📺',
    isAlexaDevice: true,
    color: '#16213e',
    defaultState: { isOn: true },
    defaultDescription: 'Amazon Echo Show with screen for visual responses and video calls.',
  },
  {
    type: 'smart-plug',
    label: 'Smart Plug',
    emoji: '🔌',
    isAlexaDevice: true,
    color: '#4CAF50',
    defaultState: { isOn: false, powerConsumption: 0 },
    defaultDescription: 'Alexa-compatible smart plug for controlling any appliance remotely.',
  },
  {
    type: 'motion-sensor',
    label: 'Motion Sensor',
    emoji: '👁️',
    isAlexaDevice: true,
    color: '#FF9800',
    defaultState: { isOn: true, motionDetected: false, batteryLevel: 87 },
    defaultDescription: 'Passive infrared motion sensor integrated with Alexa routines.',
  },
  {
    type: 'thermostat',
    label: 'Thermostat',
    emoji: '🌡️',
    isAlexaDevice: true,
    color: '#2196F3',
    defaultState: { isOn: true, temperature: 22, humidity: 45 },
    defaultDescription: 'Smart thermostat controllable via Alexa for climate management.',
  },
  {
    type: 'smart-lock',
    label: 'Smart Lock',
    emoji: '🔒',
    isAlexaDevice: true,
    color: '#9C27B0',
    defaultState: { isOn: true, isLocked: true, batteryLevel: 72 },
    defaultDescription: 'Alexa-enabled smart lock for keyless entry and remote access.',
  },
  {
    type: 'camera',
    label: 'Security Camera',
    emoji: '📷',
    isAlexaDevice: true,
    color: '#607D8B',
    defaultState: { isOn: true, motionDetected: false },
    defaultDescription: 'Indoor security camera viewable through Alexa Show devices.',
  },
  {
    type: 'smoke-detector',
    label: 'Smoke Detector',
    emoji: '🚨',
    isAlexaDevice: true,
    color: '#F44336',
    defaultState: { isOn: true, batteryLevel: 95 },
    defaultDescription: 'Smart smoke detector that sends Alexa alerts when triggered.',
  },
  // Furniture
  {
    type: 'sofa',
    label: 'Sofa',
    emoji: '🛋️',
    isAlexaDevice: false,
    color: '#795548',
    defaultState: { isOn: false },
    defaultDescription: 'Living room sofa.',
  },
  {
    type: 'bed',
    label: 'Bed',
    emoji: '🛏️',
    isAlexaDevice: false,
    color: '#ECEFF1',
    defaultState: { isOn: false },
    defaultDescription: 'Bedroom bed.',
  },
  {
    type: 'table',
    label: 'Table',
    emoji: '🪵',
    isAlexaDevice: false,
    color: '#A1887F',
    defaultState: { isOn: false },
    defaultDescription: 'Dining or coffee table.',
  },
  {
    type: 'chair',
    label: 'Chair',
    emoji: '🪑',
    isAlexaDevice: false,
    color: '#8D6E63',
    defaultState: { isOn: false },
    defaultDescription: 'Chair.',
  },
  {
    type: 'tv-stand',
    label: 'TV Stand',
    emoji: '📺',
    isAlexaDevice: false,
    color: '#546E7A',
    defaultState: { isOn: false },
    defaultDescription: 'Television stand unit.',
  },
  {
    type: 'bookshelf',
    label: 'Bookshelf',
    emoji: '📚',
    isAlexaDevice: false,
    color: '#6D4C41',
    defaultState: { isOn: false },
    defaultDescription: 'Bookshelf for storage.',
  },
  {
    type: 'bathtub',
    label: 'Bathtub',
    emoji: '🛁',
    isAlexaDevice: false,
    color: '#E0F7FA',
    defaultState: { isOn: false },
    defaultDescription: 'Bathroom bathtub.',
  },
  {
    type: 'desk',
    label: 'Desk',
    emoji: '🖥️',
    isAlexaDevice: false,
    color: '#BCAAA4',
    defaultState: { isOn: false },
    defaultDescription: 'Work or study desk.',
  },
];

export const ASSET_MAP = new Map<AssetType, AssetDefinition>(
  ASSET_DEFINITIONS.map((a) => [a.type, a])
);

export const DEFAULT_ROOMS = [
  {
    id: 'living-room',
    name: 'Living Room',
    width: 8,
    depth: 7,
    height: 3,
    position: { x: -4.5, y: 0, z: -3.5 },
    color: '#E8D5B7',
    floorColor: '#D2B48C',
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    width: 5,
    depth: 5,
    height: 3,
    position: { x: 3.5, y: 0, z: -3.5 },
    color: '#B7D5E8',
    floorColor: '#A9C4D8',
  },
  {
    id: 'master-bedroom',
    name: 'Master Bedroom',
    width: 7,
    depth: 6,
    height: 3,
    position: { x: -4, y: 0, z: 3 },
    color: '#D5B7E8',
    floorColor: '#C4A8D8',
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    width: 4,
    depth: 4,
    height: 3,
    position: { x: 4, y: 0, z: 2.5 },
    color: '#B7E8D5',
    floorColor: '#A8D8C4',
  },
  {
    id: 'office',
    name: 'Home Office',
    width: 5,
    depth: 5,
    height: 3,
    position: { x: 4, y: 0, z: 7 },
    color: '#E8E8B7',
    floorColor: '#D8D8A8',
  },
];
