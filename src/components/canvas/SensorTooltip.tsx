import { GlassCard } from '../shared/GlassCard';
import { ASSET_MAP } from '../../constants/assets';
import { deviceMetrics } from './deviceMetrics';
import type { PlacedObject } from '../../types';

interface SensorTooltipProps {
  obj: PlacedObject;
}

export function SensorTooltip({ obj }: SensorTooltipProps) {
  const def = ASSET_MAP.get(obj.type);
  const metrics = deviceMetrics(obj.alexaDeviceState).slice(0, 3);

  return (
    <div style={{ position: 'fixed', top: 'var(--space-20)', left: 'var(--space-6)', width: 200, zIndex: 25, pointerEvents: 'none' }}>
      <GlassCard padding="sm">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: 'var(--text-primary)', marginBottom: metrics.length ? 'var(--space-2)' : 0 }}>
          {obj.deviceName || def?.label || obj.type}
        </div>
        {metrics.map((m) => (
          <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span style={{ fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)' }}>{m.icon} {m.label}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper-300)' }}>{m.value}</span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}
