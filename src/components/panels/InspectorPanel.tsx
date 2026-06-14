import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/store';
import { ASSET_MAP } from '../../constants/assets';
import type { PlacedObject } from '../../types';

export function InspectorPanel() {
  const { ui, placedObjects, updatePlacedObject, updateAlexaState, toggleAlexaDevice, removePlacedObject, rooms } =
    useAppStore();
  const selectedObj = placedObjects.find((o) => o.id === ui.selectedObjectId) ?? null;

  if (!selectedObj) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <span className="text-4xl mb-3">🔍</span>
        <p className="text-sm text-gray-400">Click any object in the 3D scene to inspect and edit it.</p>
      </div>
    );
  }

  return <ObjectForm obj={selectedObj} rooms={rooms} onUpdate={updatePlacedObject} onUpdateAlexa={updateAlexaState} onToggle={toggleAlexaDevice} onDelete={removePlacedObject} />;
}

function ObjectForm({
  obj,
  rooms,
  onUpdate,
  onUpdateAlexa,
  onToggle,
  onDelete,
}: {
  obj: PlacedObject;
  rooms: { id: string; name: string }[];
  onUpdate: (id: string, updates: Partial<PlacedObject>) => void;
  onUpdateAlexa: (id: string, updates: Partial<PlacedObject['alexaDeviceState']>) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const def = ASSET_MAP.get(obj.type);
  const [name, setName] = useState(obj.deviceName);
  const [desc, setDesc] = useState(obj.description);

  // Sync if object changes externally
  useEffect(() => {
    setName(obj.deviceName);
    setDesc(obj.description);
  }, [obj.id]);

  const commit = () => {
    onUpdate(obj.id, { deviceName: name, description: desc });
  };

  const ds = obj.alexaDeviceState;

  return (
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{def?.emoji ?? '📦'}</span>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">{obj.type.replace('-', ' ')}</p>
          <p className="text-sm font-semibold text-white">{obj.deviceName}</p>
        </div>
        <button
          onClick={() => onDelete(obj.id)}
          className="ml-auto text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-900 bg-opacity-30 hover:bg-opacity-50 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Name */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400 font-medium">Device / Object Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commit}
          className="bg-alexa-dark border border-alexa-card rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-alexa-blue"
        />
      </label>

      {/* Description */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400 font-medium">Description</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          onBlur={commit}
          rows={3}
          className="bg-alexa-dark border border-alexa-card rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-alexa-blue resize-none"
        />
      </label>

      {/* Room assignment */}
      <label className="flex flex-col gap-1">
        <span className="text-xs text-gray-400 font-medium">Assigned Room</span>
        <select
          value={obj.parentRoomId ?? ''}
          onChange={(e) => onUpdate(obj.id, { parentRoomId: e.target.value || null })}
          className="bg-alexa-dark border border-alexa-card rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-alexa-blue"
        >
          <option value="">— No room —</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>

      {/* Position (read-only) */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-400 font-medium">Position (X / Y / Z)</span>
        <div className="flex gap-1">
          {(['x', 'y', 'z'] as const).map((axis) => (
            <div key={axis} className="flex-1 bg-alexa-dark border border-alexa-card rounded px-2 py-1 text-xs text-gray-300">
              <span className="text-gray-500 uppercase">{axis} </span>
              {obj.position[axis].toFixed(2)}
            </div>
          ))}
        </div>
      </div>

      {/* Alexa device controls */}
      {obj.isAlexaDevice && (
        <div className="border-t border-alexa-card pt-3 flex flex-col gap-3">
          <p className="text-xs font-semibold text-alexa-blue uppercase tracking-wider">Alexa Device State</p>

          {/* Power toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Power</span>
            <button
              onClick={() => onToggle(obj.id)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                ds.isOn ? 'bg-green-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  ds.isOn ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Brightness */}
          {ds.brightness !== undefined && (
            <label className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Brightness</span>
                <span className="text-xs text-alexa-blue">{ds.brightness}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={ds.brightness}
                onChange={(e) => onUpdateAlexa(obj.id, { brightness: Number(e.target.value) })}
                className="accent-alexa-blue"
              />
            </label>
          )}

          {/* Temperature */}
          {ds.temperature !== undefined && (
            <label className="flex flex-col gap-1">
              <div className="flex justify-between">
                <span className="text-xs text-gray-400">Temperature</span>
                <span className="text-xs text-alexa-blue">{ds.temperature}°C</span>
              </div>
              <input
                type="range"
                min={16}
                max={30}
                step={0.5}
                value={ds.temperature}
                onChange={(e) => onUpdateAlexa(obj.id, { temperature: Number(e.target.value) })}
                className="accent-alexa-blue"
              />
            </label>
          )}

          {/* Humidity */}
          {ds.humidity !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Humidity</span>
              <span className="text-xs text-alexa-blue">{ds.humidity}%</span>
            </div>
          )}

          {/* Battery */}
          {ds.batteryLevel !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Battery</span>
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${ds.batteryLevel}%`,
                      background: ds.batteryLevel > 50 ? '#4ade80' : ds.batteryLevel > 20 ? '#facc15' : '#f87171',
                    }}
                  />
                </div>
                <span className="text-xs text-alexa-blue">{ds.batteryLevel}%</span>
              </div>
            </div>
          )}

          {/* Motion detected */}
          {ds.motionDetected !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Motion Detected</span>
              <button
                onClick={() => onUpdateAlexa(obj.id, { motionDetected: !ds.motionDetected })}
                className={`text-xs px-2 py-0.5 rounded ${ds.motionDetected ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}
              >
                {ds.motionDetected ? 'YES' : 'No'}
              </button>
            </div>
          )}

          {/* Locked state */}
          {ds.isLocked !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Lock Status</span>
              <button
                onClick={() => onUpdateAlexa(obj.id, { isLocked: !ds.isLocked })}
                className={`text-xs px-2 py-0.5 rounded ${ds.isLocked ? 'bg-green-700 text-green-300' : 'bg-red-900 text-red-400'}`}
              >
                {ds.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </button>
            </div>
          )}

          {/* Power consumption */}
          {ds.powerConsumption !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Power Draw</span>
              <span className="text-xs text-alexa-blue">{ds.isOn ? ds.powerConsumption : 0}W</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
