import { GlassCard } from '../shared/GlassCard';
import { ASSET_MAP } from '../../constants/assets';
import { deviceMetrics } from './deviceMetrics';
import type { PlacedObject } from '../../types';

interface DevicePanelProps {
  obj: PlacedObject;
  onClose: () => void;
}

export function DevicePanel({ obj, onClose }: DevicePanelProps) {
  const def = ASSET_MAP.get(obj.type);
  const metrics = deviceMetrics(obj.alexaDeviceState);

  return (
    <div style={{ position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)', width: 280, zIndex: 30 }}>
      <GlassCard padding="md" glow="ember">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
              {obj.deviceName || def?.label || obj.type}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: obj.alexaDeviceState.isOn ? 'var(--ember-500)' : 'var(--text-tertiary)' }}>
              {obj.alexaDeviceState.isOn ? 'On' : 'Off'}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {metrics.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {metrics.map((m) => (
              <div
                key={m.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--space-2) 0',
                  borderBottom: '1px solid var(--void-border)',
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {m.icon} {m.label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--copper-300)' }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-tertiary)', margin: 0 }}>
            No live readings for this device.
          </p>
        )}
      </GlassCard>
    </div>
  );
}
