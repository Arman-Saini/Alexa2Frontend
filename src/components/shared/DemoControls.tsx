import { useActStore } from '../../store/actStore';
import { useStoryStore } from '../../store/storyStore';
import { GlassCard } from './GlassCard';

export function DemoControls() {
  const triggerXray = useActStore((s) => s.triggerXray);
  const restartStory = useStoryStore((s) => s.restartStory);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
      <GlassCard padding="sm" className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => triggerXray('house')}
          style={{
            background: 'var(--copper-500)',
            color: 'var(--void-950)',
            border: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '13px',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-copper-sm)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1.0)';
          }}
        >
          Scan the House
        </button>

        <button
          type="button"
          onClick={restartStory}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--copper-500)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--glass-border)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Replay Story
        </button>
      </GlassCard>
    </div>
  );
}
