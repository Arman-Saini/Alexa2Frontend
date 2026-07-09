import { GlassCard } from '../shared/GlassCard';
import { findDoor, humanizeRoomId } from './openingLookup';

interface DoorInspectorProps {
  doorId: string;
  onClose: () => void;
}

export function DoorInspector({ doorId, onClose }: DoorInspectorProps) {
  const door = findDoor(doorId);

  return (
    <div style={{ position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)', width: 220, zIndex: 30 }}>
      <GlassCard padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
              Door
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              {door ? humanizeRoomId(door.roomId) : 'Unknown room'}
            </p>
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
