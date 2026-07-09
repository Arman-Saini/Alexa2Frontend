import { GlassCard } from '../shared/GlassCard';
import { ASSET_MAP } from '../../constants/assets';
import type { PlacedObject } from '../../types';

interface FurnitureInspectorProps {
  obj: PlacedObject;
  onClose: () => void;
}

export function FurnitureInspector({ obj, onClose }: FurnitureInspectorProps) {
  const def = ASSET_MAP.get(obj.type);

  return (
    <div style={{ position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)', width: 240, zIndex: 30 }}>
      <GlassCard padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
              {def?.label ?? obj.type}
            </div>
            {obj.description && (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                {obj.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
