import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PlacedObject, Room, UIState, AssetType, AlexaDeviceState, ActivePanel } from '../types';
import { DEFAULT_ROOMS, ASSET_MAP } from '../constants/assets';

// Simple UUID using crypto API (no extra dep)
function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

interface AppState {
  // Data
  rooms: Room[];
  placedObjects: PlacedObject[];

  // UI
  ui: UIState;

  // Room actions
  setActiveRoom: (roomId: string | null) => void;
  setHoveredRoom: (roomId: string | null) => void;

  // Object actions
  addPlacedObject: (type: AssetType, position: { x: number; y: number; z: number }, roomId: string | null) => void;
  updatePlacedObject: (id: string, updates: Partial<Omit<PlacedObject, 'id'>>) => void;
  removePlacedObject: (id: string) => void;
  toggleAlexaDevice: (id: string) => void;
  updateAlexaState: (id: string, stateUpdates: Partial<AlexaDeviceState>) => void;

  // UI actions
  setSelectedObject: (id: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  enterPlacementMode: (assetType: AssetType) => void;
  exitPlacementMode: () => void;

  // Persistence
  exportState: () => string;
  importState: (json: string) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      rooms: DEFAULT_ROOMS,
      placedObjects: [],

      ui: {
        activeRoomId: null,
        selectedObjectId: null,
        activePanel: 'alexa',
        placementAssetType: null,
        isPlacementMode: false,
        hoveredRoomId: null,
      },

      setActiveRoom: (roomId) =>
        set((s) => ({
          ui: {
            ...s.ui,
            activeRoomId: roomId,
            selectedObjectId: null,
            activePanel: roomId !== s.ui.activeRoomId ? 'alexa' : s.ui.activePanel,
          },
        })),

      setHoveredRoom: (roomId) =>
        set((s) => ({ ui: { ...s.ui, hoveredRoomId: roomId } })),

      addPlacedObject: (type, position, roomId) => {
        const def = ASSET_MAP.get(type);
        if (!def) return;
        const obj: PlacedObject = {
          id: generateId(),
          type,
          position,
          rotation: { x: 0, y: 0, z: 0 },
          description: def.defaultDescription,
          deviceName: def.label,
          parentRoomId: roomId,
          isAlexaDevice: def.isAlexaDevice,
          alexaDeviceState: { ...def.defaultState },
          color: def.color,
        };
        set((s) => ({ placedObjects: [...s.placedObjects, obj] }));
      },

      updatePlacedObject: (id, updates) =>
        set((s) => ({
          placedObjects: s.placedObjects.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        })),

      removePlacedObject: (id) =>
        set((s) => ({
          placedObjects: s.placedObjects.filter((o) => o.id !== id),
          ui: {
            ...s.ui,
            selectedObjectId: s.ui.selectedObjectId === id ? null : s.ui.selectedObjectId,
          },
        })),

      toggleAlexaDevice: (id) =>
        set((s) => ({
          placedObjects: s.placedObjects.map((o) =>
            o.id === id
              ? { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: !o.alexaDeviceState.isOn } }
              : o
          ),
        })),

      updateAlexaState: (id, stateUpdates) =>
        set((s) => ({
          placedObjects: s.placedObjects.map((o) =>
            o.id === id
              ? { ...o, alexaDeviceState: { ...o.alexaDeviceState, ...stateUpdates } }
              : o
          ),
        })),

      setSelectedObject: (id) =>
        set((s) => ({
          ui: {
            ...s.ui,
            selectedObjectId: id,
            activePanel: id ? 'inspector' : 'alexa',
          },
        })),

      setActivePanel: (panel) =>
        set((s) => ({ ui: { ...s.ui, activePanel: panel } })),

      enterPlacementMode: (assetType) =>
        set((s) => ({
          ui: {
            ...s.ui,
            isPlacementMode: true,
            placementAssetType: assetType,
            selectedObjectId: null,
            activePanel: 'library',
          },
        })),

      exitPlacementMode: () =>
        set((s) => ({
          ui: {
            ...s.ui,
            isPlacementMode: false,
            placementAssetType: null,
          },
        })),

      exportState: () => {
        const { rooms, placedObjects } = get();
        return JSON.stringify({ rooms, placedObjects }, null, 2);
      },

      importState: (json) => {
        try {
          const { rooms, placedObjects } = JSON.parse(json);
          set({ rooms, placedObjects });
        } catch {
          console.error('Failed to import state: invalid JSON');
        }
      },
    }),
    { name: 'alexa-digital-twin' }
  )
);
