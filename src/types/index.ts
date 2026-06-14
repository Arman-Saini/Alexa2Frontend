export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type AlexaDeviceType =
  | 'smart-bulb'
  | 'echo-dot'
  | 'echo-show'
  | 'smart-plug'
  | 'motion-sensor'
  | 'thermostat'
  | 'smart-lock'
  | 'camera'
  | 'smoke-detector';

export type FurnitureType = 'sofa' | 'bed' | 'table' | 'chair' | 'tv-stand' | 'bookshelf' | 'bathtub' | 'desk';

export type AssetType = AlexaDeviceType | FurnitureType;

export interface AlexaDeviceState {
  isOn: boolean;
  brightness?: number;       // 0-100
  temperature?: number;      // °C
  humidity?: number;         // %
  motionDetected?: boolean;
  powerConsumption?: number; // Watts
  batteryLevel?: number;     // %
  isLocked?: boolean;
}

export interface PlacedObject {
  id: string;
  type: AssetType;
  position: Vec3;
  rotation: Vec3;
  description: string;
  deviceName: string;
  parentRoomId: string | null;
  isAlexaDevice: boolean;
  alexaDeviceState: AlexaDeviceState;
  color?: string;
}

export interface Room {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  position: Vec3;
  color: string;
  floorColor: string;
}

export type ActivePanel = 'alexa' | 'inspector' | 'library';

export interface UIState {
  activeRoomId: string | null;
  selectedObjectId: string | null;
  activePanel: ActivePanel;
  placementAssetType: AssetType | null;
  isPlacementMode: boolean;
  hoveredRoomId: string | null;
}
