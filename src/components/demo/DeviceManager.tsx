// DeviceManager , live device grid with real-time power & online toggles.
// Reads from useLiveBackend; every toggle calls the backend immediately.

import { useState } from 'react';
import { C, F } from './ScenarioDefs';
import type { LiveDevice } from '../../hooks/useLiveBackend';

const DEVICE_ICONS: Record<string, string> = {
  fan: '🌀', light: '💡', geyser: '🚿', water_heater: '🚿',
  water_pump: '💧', motor: '⚙️', lpg_sensor: '🔥', ac: '❄️',
  air_conditioner: '❄️', smart_plug: '🔌', inverter: '⚡', ups: '🔋',
  ro_purifier: '💧', water_purifier: '💧', door_lock: '🔒', tv: '📺',
  smart_tv: '📺', motion_sensor: '👁️', presence_sensor: '📡',
  smoke_detector: '🚨', curtain: '🪟', blind: '🪟',
  pressure_cooker_monitor: '🫕', default: '📟',
};

function getIcon(type: string) {
  return DEVICE_ICONS[type.toLowerCase()] ?? DEVICE_ICONS.default;
}

function getPower(state: Record<string, unknown>): boolean | null {
  const v = state.power ?? state.on ?? state.active ?? state.enabled;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string')  return v.toLowerCase() === 'true' || v.toLowerCase() === 'on';
  return null;
}

interface Props {
  devices:        LiveDevice[];
  onToggle:       (deviceId: string, property: string, value: unknown) => Promise<void>;
  onSetOnline:    (deviceId: string, online: boolean) => Promise<void>;
  onDelete:       (deviceId: string) => Promise<void>;
  onSeed:         () => Promise<void>;
  connected:      boolean;
  homeStats:      { total_devices?: number; online_devices?: number } | null;
}

interface DeviceCardProps {
  device:      LiveDevice;
  onToggle:    (property: string, value: unknown) => Promise<void>;
  onSetOnline: (online: boolean) => Promise<void>;
  onDelete:    () => Promise<void>;
}

function DeviceCard({ device, onToggle, onSetOnline, onDelete }: DeviceCardProps) {
  const [busy, setBusy] = useState(false);
  const power   = getPower(device.state);
  const online  = device.online !== false;
  const icon    = getIcon(device.type);

  const handlePower = async () => {
    if (power === null || busy) return;
    setBusy(true);
    try { await onToggle('power', !power); } finally { setBusy(false); }
  };

  const handleOnline = async () => {
    setBusy(true);
    try { await onSetOnline(!online); } finally { setBusy(false); }
  };

  const powerColor = power ? C.green : C.text3;

  return (
    <div style={{
      background: C.card, border: `1px solid ${power ? C.greenDim : C.border}`,
      borderRadius: 6, padding: '8px 10px',
      opacity: online ? 1 : 0.5,
      transition: 'border-color 0.2s, opacity 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: F.xs, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {device.name || device.friendly_name || device.id.split('_').slice(-2).join(' ')}
          </div>
          <div style={{ fontSize: F.badge, color: C.text3, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
            {device.type.replace(/_/g, ' ')}
          </div>
        </div>
        {/* Online/offline indicator */}
        <div
          onClick={handleOnline}
          title={online ? 'Click to go offline' : 'Click to go online'}
          style={{
            width: 7, height: 7, borderRadius: '50%', cursor: 'pointer',
            background: online ? C.green : C.text3,
            boxShadow: online ? `0 0 6px ${C.green}` : 'none',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Power toggle */}
      <div style={{ display: 'flex', gap: 4 }}>
        {power !== null && (
          <button
            onClick={handlePower}
            disabled={busy || !online}
            style={{
              flex: 1, fontSize: F.badge, fontWeight: 700, padding: '4px 0', borderRadius: 4,
              background: power ? `${C.green}22` : C.surface,
              border: `1px solid ${power ? C.green : C.border}`,
              color: powerColor, cursor: busy || !online ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {busy ? '…' : power ? 'ON' : 'OFF'}
          </button>
        )}
        <button
          onClick={onDelete}
          title="Remove device"
          style={{
            fontSize: F.badge, padding: '4px 7px', borderRadius: 4,
            background: C.redBg, border: `1px solid ${C.redDim}`, color: C.red,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function DeviceManager({ devices, onToggle, onSetOnline, onDelete, onSeed, connected, homeStats }: Props) {
  const [searchQuery, setSearch] = useState('');
  const [seeding, setSeeding]    = useState(false);

  const filtered = devices.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.type?.toLowerCase().includes(q) ||
      d.id?.toLowerCase().includes(q)
    );
  });

  const handleSeed = async () => {
    setSeeding(true);
    try { await onSeed(); } finally { setSeeding(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 8px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
          <div>
            <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text }}>Devices</div>
            <div style={{ fontSize: F.tiny, color: C.text3, marginTop: 1 }}>
              {homeStats
                ? `${homeStats.online_devices ?? '?'}/${homeStats.total_devices ?? '?'} online`
                : 'Loading…'
              }
              {!connected && <span style={{ color: C.red, marginLeft: 6 }}>· offline</span>}
            </div>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding || !connected}
            title={connected ? 'Seed home with 15 demo devices' : 'Needs the live backend'}
            style={{
              fontSize: F.badge, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
              background: seeding ? C.card : C.cyanBg,
              border: `1px solid ${C.cyanDim}`, color: C.cyan,
              cursor: seeding || !connected ? 'not-allowed' : 'pointer',
              opacity: seeding || !connected ? 0.5 : 1,
            }}
          >
            {seeding ? 'Seeding…' : devices.length === 0 ? '⚡ Seed Home' : '↺ Re-seed'}
          </button>
        </div>
        <input
          placeholder="Search devices…"
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box' as const,
            fontSize: F.xs, padding: '5px 8px', borderRadius: 4,
            background: C.surface, border: `1px solid ${C.border}`,
            color: C.text, outline: 'none',
          }}
        />
      </div>

      {/* Device grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.text3, fontSize: F.xs }}>
            {devices.length === 0
              ? <><div style={{ fontSize: 28, marginBottom: 8 }}>🏠</div>No devices yet.<br />Click "Seed Home" to add 15 demo devices.</>
              : 'No devices match that search.'
            }
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {filtered.map(d => (
              <DeviceCard
                key={d.id}
                device={d}
                onToggle={(prop, val) => onToggle(d.id, prop, val)}
                onSetOnline={online => onSetOnline(d.id, online)}
                onDelete={() => onDelete(d.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
