import type { PlacedObject } from '../../types';
import { ASSET_MAP } from '../../constants/assets';
import { useAppStore } from '../../store/store';

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#2A2218' }}>
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function Row({ icon, label, value, bar, barColor, barMax }: {
  icon: string; label: string; value: string;
  bar?: boolean; barColor?: string; barMax?: number;
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5 border-b last:border-0" style={{ borderColor: '#2A2218' }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] flex items-center gap-1.5" style={{ color: '#7A6E5C' }}>
          <span>{icon}</span>{label}
        </span>
        <span className="text-[11px] font-semibold" style={{ color: '#E8A845' }}>{value}</span>
      </div>
      {bar && barColor && barMax !== undefined && (
        <Bar value={parseFloat(value)} max={barMax} color={barColor} />
      )}
    </div>
  );
}

interface Props { obj: PlacedObject; onClose: () => void }

export function DevicePanel({ obj, onClose }: Props) {
  const def = ASSET_MAP.get(obj.type);
  const ds = obj.alexaDeviceState ?? {};
  const isOn = ds.isOn ?? false;
  const updateAlexaState = useAppStore(s => s.updateAlexaState);

  const rows: React.ReactNode[] = [];

  if (ds.volume !== undefined) rows.push(
    <Row key="vol" icon="🔊" label="Volume" value={`${ds.volume}%`} bar barColor="#9C27B0" barMax={100} />
  );
  if (ds.brightness !== undefined) rows.push(
    <Row key="bright" icon="💡" label="Brightness" value={`${ds.brightness}%`} bar barColor="#FFD700" barMax={100} />
  );
  if (ds.colorTemp !== undefined) rows.push(
    <Row key="ctemp" icon="🎨" label="Color Temp" value={`${ds.colorTemp}K`} bar barColor="#88CCFF" barMax={6500} />
  );
  if (ds.temperature !== undefined) rows.push(
    <Row key="temp" icon="🌡️" label="Temperature" value={`${ds.temperature.toFixed(1)}°C`}
      bar barColor={ds.temperature > 26 ? '#F44336' : '#4CAF50'} barMax={30} />
  );
  if (ds.humidity !== undefined) rows.push(
    <Row key="hum" icon="💧" label="Humidity" value={`${ds.humidity.toFixed(0)}%`} bar barColor="#2196F3" barMax={100} />
  );
  if (ds.speed !== undefined) rows.push(
    <Row key="speed" icon="💨" label="Fan Speed" value={`${ds.speed}/5`} bar barColor="#00BCD4" barMax={5} />
  );
  if (ds.airQuality !== undefined) {
    const lbl = ds.airQuality < 50 ? 'Good' : ds.airQuality < 100 ? 'Moderate' : 'Poor';
    rows.push(<Row key="aqi" icon="🌬️" label="Air Quality" value={`AQI ${ds.airQuality.toFixed(0)} · ${lbl}`} />);
  }
  if (ds.batteryLevel !== undefined) rows.push(
    <Row key="bat" icon="🔋" label="Battery" value={`${ds.batteryLevel.toFixed(0)}%`}
      bar barColor={ds.batteryLevel > 50 ? '#4CAF50' : '#F44336'} barMax={100} />
  );
  if (ds.motionDetected !== undefined) rows.push(
    <Row key="motion" icon="👁️" label="Motion" value={ds.motionDetected ? 'Detected!' : 'Clear'} />
  );
  if (ds.isLocked !== undefined) rows.push(
    <Row key="lock" icon={ds.isLocked ? '🔒' : '🔓'} label="Lock" value={ds.isLocked ? 'Locked' : 'Unlocked'} />
  );
  if (ds.channel !== undefined && isOn) rows.push(
    <Row key="ch" icon="📺" label="Channel" value={`CH ${ds.channel}`} />
  );
  if (ds.powerConsumption !== undefined) rows.push(
    <Row key="pw" icon="⚡" label="Power Draw" value={isOn ? `${ds.powerConsumption.toFixed(1)}W` : '0W'} />
  );

  return (
    <div
      style={{
        background: '#16120E',
        border: '1px solid #2A2218',
        borderRadius: 16,
        padding: '14px 16px',
        width: 220,
        boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(232,168,69,0.08)',
        backdropFilter: 'blur(12px)',
        position: 'relative',
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 8, right: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#7A6E5C', fontSize: 16, lineHeight: 1,
        }}
      >×</button>

      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3 pb-3" style={{ borderBottom: '1px solid #2A2218' }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ background: (obj.color ?? '#E8A845') + '18', border: `1px solid ${obj.color ?? '#E8A845'}28` }}
        >
          {def?.emoji ?? '📦'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate leading-tight" style={{ color: '#F2EDE5' }}>{obj.deviceName}</p>
          <p className="text-[10px] capitalize leading-tight" style={{ color: '#7A6E5C' }}>{obj.type.replace(/-/g,' ')}</p>
        </div>
        {/* ON/OFF toggle */}
        <button
          onClick={() => updateAlexaState(obj.id, { isOn: !isOn })}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', borderRadius: 20,
            background: isOn ? '#5A9A5A20' : '#40404020',
            border: `1px solid ${isOn ? '#5A9A5A' : '#4A5E72'}`,
            cursor: 'pointer', color: isOn ? '#5A9A5A' : '#888888',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
          }}
        >
          <span
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOn ? '#5A9A5A' : '#4A5E72',
              display: 'inline-block',
            }}
          />
          {isOn ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* Rows */}
      {rows.length > 0 ? (
        <div className="flex flex-col">{rows}</div>
      ) : (
        <p className="text-[10px] text-center py-1" style={{ color: '#4A5E72' }}>
          {isOn ? 'No sensor data' : 'Device is offline'}
        </p>
      )}
    </div>
  );
}
