import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type {
  PlacedObject,
  Room,
  UIState,
  AssetType,
  AlexaDeviceState,
  ActivePanel,
  AlexaNotification,
  Routine,
  Scene,
  AlexaTab,
} from '../types';
import { DEFAULT_ROOMS, ASSET_MAP, DEFAULT_ROUTINES, DEFAULT_SCENES } from '../constants/assets';
import { DEFAULT_PLACED_OBJECTS } from '../constants/defaults';
import { processCommand, type CommandResult } from './commandProcessor';

function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function notifId(): string {
  return Math.random().toString(36).slice(2);
}

interface AppState {
  rooms: Room[];
  placedObjects: PlacedObject[];
  ui: UIState;
  notifications: AlexaNotification[];
  routines: Routine[];
  scenes: Scene[];
  simulationTick: number;

  // Devices changed by the most recent command , drives the 3D confirm glow
  recentlyChangedIds: string[];
  setRecentlyChanged: (ids: string[]) => void;

  // Active scenario , drives 3D world reactions
  activeScenarioId: string | null;
  setActiveScenarioId: (id: string | null) => void;

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
  setHoveredObject: (id: string | null) => void;
  setActivePanel: (panel: ActivePanel) => void;
  setAlexaTab: (tab: AlexaTab) => void;
  enterPlacementMode: (assetType: AssetType) => void;
  exitPlacementMode: () => void;
  toggleMiniMap: () => void;
  setListeningVoice: (v: boolean) => void;
  setDraggedAsset: (type: AssetType | null) => void;
  enterLayoutEditMode: () => void;
  exitLayoutEditMode: () => void;
  lockLayout: () => void;

  // Notifications
  addNotification: (message: string, type: AlexaNotification['type'], deviceId?: string) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;

  // Scenes
  triggerScene: (sceneId: string) => void;

  // Routines
  toggleRoutine: (id: string) => void;

  // Voice commands
  runLocalCommand: (text: string) => CommandResult;
  executeVoiceCommand: (text: string) => string;

  // Last cloud-escalated command (T3)
  lastCloudCommand: { text: string; time: string } | null;
  setLastCloudCommand: (text: string) => void;
  lastSpecialist: string | null;
  setLastSpecialist: (s: string) => void;
  pendingLookup: string | null;
  setPendingLookup: (query: string | null) => void;
  activeMemoryVault: Array<{ query: string; timestamp: string; approved: boolean }>;
  addActiveMemory: (entry: { query: string; timestamp: string; approved: boolean }) => void;

  // Simulation
  tickSimulation: () => void;

  // Furniture inspector (layout overrides)
  selectedFurnitureId: string | null;
  furnitureOverrides: Record<string, FurnitureOverride>;
  setSelectedFurniture: (id: string | null) => void;
  updateFurnitureOverride: (id: string, patch: Partial<FurnitureOverride>) => void;
  resetFurnitureOverride: (id: string) => void;

  // Door inspector
  selectedDoorId: string | null;
  doorOverrides: Record<string, DoorOverride>;
  setSelectedDoor: (id: string | null) => void;
  updateDoorOverride: (id: string, patch: Partial<DoorOverride>) => void;
  resetDoorOverride: (id: string) => void;

  // Window inspector
  selectedWindowId: string | null;
  windowOverrides: Record<string, { along?: number; maskW?: number; maskH?: number; yBottom?: number; maskEnabled?: boolean }>;
  setSelectedWindow: (id: string | null) => void;
  updateWindowOverride: (id: string, patch: { along?: number; maskW?: number; maskH?: number; yBottom?: number; maskEnabled?: boolean }) => void;
  resetWindowOverride: (id: string) => void;

  // Persistence
  exportState: () => string;
  importState: (json: string) => void;
}

export type FurnitureOverride = {
  wall?: 'W1' | 'W2' | 'W3' | 'W4';
  along?: number;
  distFromWall?: number;
  rot?: number;
  size?: number;
  yOffset?: number;
};

export type DoorOverride = {
  wall?: 'W1' | 'W2' | 'W3' | 'W4';
  along?: number;
  distFromWall?: number;
  swingDir?: 1 | -1;
  size?: number;
  maskWidth?: number;
  maskHeight?: number;
  maskWall?: 'W1' | 'W2' | 'W3' | 'W4'; // independent mask wall (defaults to door wall)
  maskAlong?: number;                      // independent mask position (0-1 along wall)
};

const INITIAL_UI: UIState = {
  activeRoomId: null,
  selectedObjectId: null,
  hoveredObjectId: null,
  activePanel: 'alexa',
  placementAssetType: null,
  isPlacementMode: false,
  hoveredRoomId: null,
  alexaTab: 'home',
  showMiniMap: true,
  isListeningVoice: false,
  draggedAssetType: null,
  isLayoutEditMode: false,
  layoutLocked: false,
};

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        rooms: DEFAULT_ROOMS,
        placedObjects: DEFAULT_PLACED_OBJECTS,
        notifications: [
          {
            id: notifId(),
            message: 'Your home is ready! Click a room to zoom in, or hover a device for live sensor data.',
            type: 'info',
            timestamp: Date.now(),
          },
        ],
        routines: DEFAULT_ROUTINES,
        scenes: DEFAULT_SCENES,
        simulationTick: 0,

        recentlyChangedIds: [],
        setRecentlyChanged: (ids) => {
          set({ recentlyChangedIds: ids });
          if (ids.length) setTimeout(() => set({ recentlyChangedIds: [] }), 2200);
        },

        ui: INITIAL_UI,
        selectedFurnitureId: null,
        furnitureOverrides: {},
        setSelectedFurniture: (id) => set({ selectedFurnitureId: id }),
        updateFurnitureOverride: (id, patch) =>
          set((s) => ({
            furnitureOverrides: {
              ...s.furnitureOverrides,
              [id]: { ...s.furnitureOverrides[id], ...patch },
            },
          })),
        resetFurnitureOverride: (id) =>
          set((s) => {
            const next = { ...s.furnitureOverrides };
            delete next[id];
            return { furnitureOverrides: next };
          }),

        selectedDoorId: null,
        doorOverrides: {},
        setSelectedDoor: (id) => set({ selectedDoorId: id }),
        updateDoorOverride: (id, patch) =>
          set((s) => ({
            doorOverrides: {
              ...s.doorOverrides,
              [id]: { ...s.doorOverrides[id], ...patch },
            },
          })),
        resetDoorOverride: (id) =>
          set((s) => {
            const next = { ...s.doorOverrides };
            delete next[id];
            return { doorOverrides: next };
          }),

        selectedWindowId: null,
        windowOverrides: {},
        setSelectedWindow: (id) => set({ selectedWindowId: id }),
        updateWindowOverride: (id, patch) =>
          set((s) => ({
            windowOverrides: { ...s.windowOverrides, [id]: { ...s.windowOverrides[id], ...patch } },
          })),
        resetWindowOverride: (id) =>
          set((s) => {
            const next = { ...s.windowOverrides };
            delete next[id];
            return { windowOverrides: next };
          }),

        activeScenarioId: null,
        setActiveScenarioId: (id) => set({ activeScenarioId: id }),

        setActiveRoom: (roomId) =>
          set((s) => ({
            ui: {
              ...s.ui,
              activeRoomId: roomId,
              selectedObjectId: null,
              hoveredObjectId: null,
              activePanel: roomId !== s.ui.activeRoomId ? 'alexa' : s.ui.activePanel,
            },
          })),

        setHoveredRoom: (roomId) =>
          set((s) => ({ ui: { ...s.ui, hoveredRoomId: roomId } })),

        addPlacedObject: (type, position, roomId) => {
          const def = ASSET_MAP.get(type);
          if (!def) return;
          const room = roomId ? get().rooms.find((r) => r.id === roomId) : null;
          const obj: PlacedObject = {
            id: generateId(),
            type,
            position,
            rotation: { x: 0, y: 0, z: 0 },
            description: `${def.label}${room ? ` in ${room.name}` : ''}. ${def.defaultDescription}`,
            deviceName: `${def.label}${room ? ` (${room.name})` : ''}`,
            parentRoomId: roomId,
            isAlexaDevice: def.isAlexaDevice,
            alexaDeviceState: { ...def.defaultState },
            color: def.color,
          };
          set((s) => ({
            placedObjects: [...s.placedObjects, obj],
            // Auto-select new object and open inspector so user can rename/describe it
            ui: {
              ...s.ui,
              selectedObjectId: obj.id,
              activePanel: 'inspector',
            },
          }));
          if (def.isAlexaDevice) {
            get().addNotification(
              `${def.emoji} ${def.label} added${room ? ` to ${room.name}` : ''}.`,
              'success',
              obj.id
            );
            // Register with backend so Alexa can control it
            import('../api').then(({ homeApi }) => {
              homeApi.registerDevice(undefined, {
                device_id: obj.id,
                name: obj.deviceName,
                type: obj.type,
                room_id: roomId ?? undefined,
                state: obj.alexaDeviceState as unknown as Record<string, unknown>,
              }).catch(() => {/* backend offline — local state still intact */});
            });
          }
        },

        updatePlacedObject: (id, updates) =>
          set((s) => ({
            placedObjects: s.placedObjects.map((o) =>
              o.id === id ? { ...o, ...updates } : o
            ),
          })),

        removePlacedObject: (id) => {
          const obj = get().placedObjects.find((o) => o.id === id);
          set((s) => ({
            placedObjects: s.placedObjects.filter((o) => o.id !== id),
            ui: {
              ...s.ui,
              selectedObjectId: s.ui.selectedObjectId === id ? null : s.ui.selectedObjectId,
              hoveredObjectId: s.ui.hoveredObjectId === id ? null : s.ui.hoveredObjectId,
            },
          }));
          if (obj) {
            get().addNotification(`${obj.deviceName} removed.`, 'info');
          }
        },

        toggleAlexaDevice: (id) => {
          const obj = get().placedObjects.find((o) => o.id === id);
          if (!obj) return;
          const newState = !obj.alexaDeviceState.isOn;
          set((s) => ({
            placedObjects: s.placedObjects.map((o) =>
              o.id === id
                ? { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: newState } }
                : o
            ),
          }));
          const def = ASSET_MAP.get(obj.type);
          get().addNotification(
            `${def?.emoji ?? ''} ${obj.deviceName} turned ${newState ? 'on' : 'off'}.`,
            newState ? 'success' : 'info',
            id
          );
        },

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
              activePanel: id ? 'inspector' : s.ui.activePanel,
            },
          })),

        setHoveredObject: (id) =>
          set((s) => ({ ui: { ...s.ui, hoveredObjectId: id } })),

        setActivePanel: (panel) =>
          set((s) => ({ ui: { ...s.ui, activePanel: panel } })),

        setAlexaTab: (tab) =>
          set((s) => ({ ui: { ...s.ui, alexaTab: tab } })),

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
              draggedAssetType: null,
            },
          })),

        toggleMiniMap: () =>
          set((s) => ({ ui: { ...s.ui, showMiniMap: !s.ui.showMiniMap } })),

        setListeningVoice: (v) =>
          set((s) => ({ ui: { ...s.ui, isListeningVoice: v } })),

        setDraggedAsset: (type) =>
          set((s) => ({ ui: { ...s.ui, draggedAssetType: type } })),

        enterLayoutEditMode: () =>
          set((s) => ({ ui: { ...s.ui, isLayoutEditMode: true, isPlacementMode: false } })),

        exitLayoutEditMode: () =>
          set((s) => ({ ui: { ...s.ui, isLayoutEditMode: false } })),

        lockLayout: () =>
          set((s) => ({ ui: { ...s.ui, layoutLocked: true, isLayoutEditMode: false } })),

        addNotification: (message, type, deviceId) => {
          const notif: AlexaNotification = {
            id: notifId(),
            message,
            type,
            timestamp: Date.now(),
            deviceId,
          };
          set((s) => ({
            notifications: [notif, ...s.notifications].slice(0, 20),
          }));
        },

        dismissNotification: (id) =>
          set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

        clearNotifications: () => set({ notifications: [] }),

        triggerScene: (sceneId) => {
          const { scenes } = get();
          const scene = scenes.find((s) => s.id === sceneId);
          if (!scene) return;

          switch (sceneId) {
            case 'morning':
              set((s) => ({
                placedObjects: s.placedObjects.map((o) => {
                  if (o.type === 'smart-bulb')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true, brightness: 100, colorTemp: 5000 } };
                  if (o.type === 'thermostat')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true, temperature: 21 } };
                  if (o.type === 'echo-dot' || o.type === 'echo-show')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true } };
                  return o;
                }),
              }));
              break;
            case 'movie':
              set((s) => ({
                placedObjects: s.placedObjects.map((o) => {
                  if (o.type === 'smart-bulb')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true, brightness: 20, colorTemp: 2700 } };
                  if (o.type === 'smart-tv')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true, volume: 40 } };
                  if (o.type === 'ceiling-fan')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: true, speed: 1 } };
                  return o;
                }),
              }));
              break;
            case 'night':
              set((s) => ({
                placedObjects: s.placedObjects.map((o) => {
                  if (o.isAlexaDevice && o.type !== 'camera' && o.type !== 'smoke-detector' && o.type !== 'motion-sensor' && o.type !== 'doorbell')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: false } };
                  if (o.type === 'smart-lock')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isLocked: true } };
                  return o;
                }),
              }));
              break;
            case 'away':
              set((s) => ({
                placedObjects: s.placedObjects.map((o) => {
                  if (o.isAlexaDevice) {
                    const keepOn = o.type === 'camera' || o.type === 'smoke-detector' || o.type === 'motion-sensor' || o.type === 'doorbell';
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isOn: keepOn } };
                  }
                  if (o.type === 'smart-lock')
                    return { ...o, alexaDeviceState: { ...o.alexaDeviceState, isLocked: true } };
                  return o;
                }),
              }));
              break;
          }

          get().addNotification(`${scene.emoji} Scene "${scene.name}" activated.`, 'success');
        },

        toggleRoutine: (id) =>
          set((s) => ({
            routines: s.routines.map((r) =>
              r.id === id ? { ...r, isEnabled: !r.isEnabled } : r
            ),
          })),

        // Deterministic local resolver: drives device state, camera and confirm-glow.
        // The robust matcher lives in commandProcessor.ts (unit-tested) , this wires its
        // result into the store so known twin commands always work, with or without backend.
        runLocalCommand: (text: string): CommandResult => {
          const { placedObjects } = get();
          const result = processCommand(text, placedObjects);

          if (result.matched) {
            // 1. apply device state changes
            for (const u of result.updates) get().updateAlexaState(u.id, u.changes);

            // 2. confirmation glow on exactly the devices that changed
            const changedIds = result.updates.map((u) => u.id);
            if (changedIds.length) get().setRecentlyChanged(changedIds);

            // 3. camera choreography , room id zooms in, null returns to house view,
            //    undefined leaves the camera untouched
            if (result.roomFocus !== undefined) {
              get().setActiveRoom(result.roomFocus);
              if (result.roomFocus !== null) {
                // auto-return after the action reads, unless the user navigated elsewhere
                setTimeout(() => {
                  if (get().ui.activeRoomId === result.roomFocus) get().setActiveRoom(null);
                }, 3500);
              }
            }

            // 4. notify only when a device actually changed (skip greetings/status)
            if (changedIds.length) {
              get().addNotification(result.response, 'success', changedIds[0]);
            }

            // 5. Jazz: play when speaker turns on, stop when off
            const speakerTypes = new Set(['echo-dot', 'echo-show']);
            const turnedOnSpeakers = result.updates.filter(u => {
              const o = placedObjects.find(p => p.id === u.id);
              return o && speakerTypes.has(o.type) && u.changes.isOn === true;
            });
            const turnedOffSpeakers = result.updates.filter(u => {
              const o = placedObjects.find(p => p.id === u.id);
              return o && speakerTypes.has(o.type) && u.changes.isOn === false;
            });
            if (turnedOnSpeakers.length > 0) {
              import('../utils/jazzPlayer').then(({ playJazz }) => playJazz()).catch(() => {});
            }
            if (turnedOffSpeakers.length > 0) {
              import('../utils/jazzPlayer').then(({ stopJazz }) => stopJazz()).catch(() => {});
            }
          }

          return result;
        },

        lastCloudCommand: null,
        setLastCloudCommand: (text: string) =>
          set({ lastCloudCommand: { text, time: new Date().toLocaleTimeString() } }),
        lastSpecialist: null,
        setLastSpecialist: (s: string) => set({ lastSpecialist: s }),
        pendingLookup: null,
        setPendingLookup: (query: string | null) => set({ pendingLookup: query }),
        activeMemoryVault: [],
        addActiveMemory: (entry) => set((state) => ({
          activeMemoryVault: [entry, ...state.activeMemoryVault].slice(0, 20),
        })),

        executeVoiceCommand: (text: string): string => get().runLocalCommand(text).response,

        tickSimulation: () => {
          set((s) => {
            const tick = s.simulationTick + 1;
            const placedObjects = s.placedObjects.map((o) => {
              if (!o.isAlexaDevice || !o.alexaDeviceState.isOn) return o;
              const ds = { ...o.alexaDeviceState };

              if (o.type === 'thermostat') {
                ds.temperature = parseFloat(((ds.temperature ?? 22) + (Math.random() - 0.5) * 0.1).toFixed(1));
                ds.humidity = parseFloat(((ds.humidity ?? 45) + (Math.random() - 0.5) * 0.2).toFixed(1));
                ds.temperature = Math.max(16, Math.min(30, ds.temperature));
                ds.humidity = Math.max(20, Math.min(80, ds.humidity));
              }
              if (o.type === 'motion-sensor' && tick % 30 === 0) {
                ds.motionDetected = Math.random() < 0.12;
              }
              if (o.type === 'air-purifier') {
                ds.airQuality = Math.max(0, Math.min(200, (ds.airQuality ?? 35) + (Math.random() - 0.5) * 3));
              }
              if (ds.batteryLevel !== undefined && tick % 120 === 0) {
                ds.batteryLevel = Math.max(0, ds.batteryLevel - 0.05);
              }
              if (ds.powerConsumption !== undefined) {
                ds.powerConsumption = parseFloat(((ds.powerConsumption ?? 0) * (0.95 + Math.random() * 0.1)).toFixed(1));
              }

              return { ...o, alexaDeviceState: ds };
            });

            return { placedObjects, simulationTick: tick };
          });
        },

        exportState: () => {
          const { rooms, placedObjects, routines } = get();
          return JSON.stringify({ rooms, placedObjects, routines }, null, 2);
        },

        importState: (json) => {
          try {
            const { rooms, placedObjects, routines } = JSON.parse(json);
            set({ rooms, placedObjects, routines });
            get().addNotification('State imported successfully.', 'success');
          } catch {
            get().addNotification('Failed to import: invalid JSON.', 'alert');
          }
        },
      }),
      {
        name: 'alexa-twin-v9', // bumped: window mask toggle + yOffset guard for object anchors
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          placedObjects: state.placedObjects,
          doorOverrides: state.doorOverrides,
          furnitureOverrides: state.furnitureOverrides,
          windowOverrides: state.windowOverrides,
          ui: {
            isLayoutEditMode: state.ui.isLayoutEditMode,
            layoutLocked: state.ui.layoutLocked,
          },
        }),
        merge: (persisted: unknown, current) => {
          const p = persisted as Partial<{
            placedObjects: typeof current.placedObjects;
            doorOverrides: typeof current.doorOverrides;
            furnitureOverrides: typeof current.furnitureOverrides;
            windowOverrides: typeof current.windowOverrides;
            ui: Partial<typeof current.ui>;
          }>;
          // Merge new default objects that weren't in the cached state
          const persisted_objs = p.placedObjects ?? current.placedObjects;
          const existingIds = new Set(persisted_objs.map((o: { id: string }) => o.id));
          const missingDefaults = DEFAULT_PLACED_OBJECTS.filter(d => !existingIds.has(d.id));
          return {
            ...current,
            placedObjects: [...persisted_objs, ...missingDefaults],
            doorOverrides: p.doorOverrides ?? current.doorOverrides,
            furnitureOverrides: p.furnitureOverrides ?? current.furnitureOverrides,
            windowOverrides: p.windowOverrides ?? current.windowOverrides,
            ui: { ...current.ui, ...(p.ui ?? {}) },
          };
        },
      }
    ),
    { name: 'alexa-digital-twin' }
  )
);
