import { useAppStore } from '../../store/store';
import { ASSET_MAP } from '../../constants/assets';
import type { PlacedObject } from '../../types';

export function AlexaAppSimView() {
  const { placedObjects, rooms, ui, toggleAlexaDevice, setActiveRoom } = useAppStore();
  const { activeRoomId } = ui;

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Filter to only Alexa devices, and filter by room if in room view
  const devices = placedObjects.filter(
    (o) => o.isAlexaDevice && (activeRoomId ? o.parentRoomId === activeRoomId : true)
  );

  const onDevices = devices.filter((d) => d.alexaDeviceState.isOn);
  const offDevices = devices.filter((d) => !d.alexaDeviceState.isOn);

  return (
    <div className="flex flex-col h-full bg-alexa-dark">
      {/* Phone frame top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0a0a1a] border-b border-alexa-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-alexa-blue animate-pulse" />
          <span className="text-xs font-bold text-alexa-blue tracking-widest uppercase">Amazon Alexa</span>
        </div>
        <span className="text-xs text-gray-500">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Context banner */}
      <div className="px-4 py-3 bg-gradient-to-r from-alexa-card to-[#0a0a20] border-b border-alexa-card">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
          {activeRoomId ? 'Room View' : 'Home View'}
        </p>
        <p className="text-sm font-semibold text-white">
          {activeRoom ? activeRoom.name : 'All Rooms'}
        </p>
        {activeRoomId && (
          <button
            onClick={() => setActiveRoom(null)}
            className="text-xs text-alexa-blue mt-1 hover:underline"
          >
            ← Back to all rooms
          </button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-2 px-4 py-3 border-b border-alexa-card">
        <Chip label="Total" value={devices.length} color="blue" />
        <Chip label="On" value={onDevices.length} color="green" />
        <Chip label="Off" value={offDevices.length} color="gray" />
      </div>

      {/* Device list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2">
        {devices.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <span className="text-4xl mb-2">🔵</span>
            <p className="text-xs text-gray-500">
              {activeRoomId
                ? 'No Alexa devices in this room yet.'
                : 'No devices placed yet. Use the Library tab to add them.'}
            </p>
          </div>
        )}

        {/* Active devices first */}
        {onDevices.map((d) => (
          <DeviceCard key={d.id} device={d} onToggle={() => toggleAlexaDevice(d.id)} />
        ))}
        {offDevices.map((d) => (
          <DeviceCard key={d.id} device={d} onToggle={() => toggleAlexaDevice(d.id)} />
        ))}
      </div>

      {/* Footer — Alexa branding */}
      <div className="px-4 py-3 border-t border-alexa-card flex items-center justify-center gap-2">
        <div className="w-6 h-6 rounded-full bg-alexa-blue flex items-center justify-center text-xs text-alexa-dark font-bold">A</div>
        <span className="text-xs text-gray-500">Powered by Alexa · Digital Twin Sim</span>
      </div>
    </div>
  );
}

function Chip({ label, value, color }: { label: string; value: number; color: 'blue' | 'green' | 'gray' }) {
  const colors = {
    blue: 'bg-alexa-card text-alexa-blue',
    green: 'bg-green-900 bg-opacity-50 text-green-400',
    gray: 'bg-gray-800 text-gray-400',
  };
  return (
    <div className={`flex-1 rounded-lg px-2 py-1.5 text-center ${colors[color]}`}>
      <p className="text-lg font-bold leading-none">{value}</p>
      <p className="text-xs leading-none mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function DeviceCard({ device, onToggle }: { device: PlacedObject; onToggle: () => void }) {
  const def = ASSET_MAP.get(device.type);
  const ds = device.alexaDeviceState;
  const isOn = ds.isOn;

  return (
    <div
      className={`rounded-xl p-3 border transition-all ${
        isOn
          ? 'bg-alexa-card border-alexa-blue border-opacity-50'
          : 'bg-[#0f0f1e] border-gray-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${
            isOn ? 'bg-alexa-blue bg-opacity-20' : 'bg-gray-800'
          }`}
        >
          {def?.emoji ?? '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{device.deviceName}</p>
          <p className="text-xs text-gray-500 truncate">{device.description.slice(0, 40)}…</p>

          {/* Device-specific data */}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
            {ds.temperature !== undefined && (
              <span className="text-xs text-alexa-blue">🌡️ {ds.temperature}°C</span>
            )}
            {ds.humidity !== undefined && (
              <span className="text-xs text-alexa-blue">💧 {ds.humidity}%</span>
            )}
            {ds.brightness !== undefined && isOn && (
              <span className="text-xs text-yellow-400">💡 {ds.brightness}%</span>
            )}
            {ds.batteryLevel !== undefined && (
              <span className={`text-xs ${ds.batteryLevel > 30 ? 'text-green-400' : 'text-red-400'}`}>
                🔋 {ds.batteryLevel}%
              </span>
            )}
            {ds.motionDetected !== undefined && (
              <span className={`text-xs ${ds.motionDetected ? 'text-yellow-400' : 'text-gray-500'}`}>
                {ds.motionDetected ? '👁️ Motion!' : '👁️ Clear'}
              </span>
            )}
            {ds.isLocked !== undefined && (
              <span className={`text-xs ${ds.isLocked ? 'text-green-400' : 'text-red-400'}`}>
                {ds.isLocked ? '🔒 Locked' : '🔓 Unlocked'}
              </span>
            )}
            {ds.powerConsumption !== undefined && isOn && (
              <span className="text-xs text-orange-400">⚡ {ds.powerConsumption}W</span>
            )}
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={onToggle}
          className={`shrink-0 relative w-11 h-6 rounded-full transition-colors mt-0.5 ${
            isOn ? 'bg-alexa-blue' : 'bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
              isOn ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
