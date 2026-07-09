import { GlassCard } from '../shared/GlassCard';
import { findWindow, humanizeRoomId } from './openingLookup';

interface WindowInspectorProps {
  windowId: string;
  onClose: () => void;
}

export function WindowInspector({ windowId, onClose }: WindowInspectorProps) {
  const win = findWindow(windowId);

  return (
    <div style={{ position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)', width: 220, zIndex: 30 }}>
      <GlassCard padding="md">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: 'var(--text-primary)' }}>
              Window
            </div>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              {win ? humanizeRoomId(win.roomId) : 'Unknown room'}
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
