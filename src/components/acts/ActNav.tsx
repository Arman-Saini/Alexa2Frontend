import { Link } from 'react-router-dom';
import { useActStore, type ActId } from '../../store/actStore';

const ACT_LABELS: Record<ActId, string> = {
  0: 'Rest',
  1: 'Sensing',
  2: 'Brain',
  3: 'Scenario',
};

const ACT_IDS: ActId[] = [0, 1, 2, 3];

/**
 * Minimal persistent nav — thin glass strip, corner-anchored.
 * 4 dots/labels for Acts 0-3, plus a link out to the separate Ecosystem page.
 * Does not participate in the Act Z-depth transition; always visible.
 */
export function ActNav() {
  const currentAct = useActStore((s) => s.currentAct);
  const goToAct = useActStore((s) => s.goToAct);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 'var(--space-4)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: '8px 14px',
        borderRadius: 'var(--r-full)',
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        boxShadow: 'var(--shadow-copper-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {ACT_IDS.map((id) => {
          const active = id === currentAct;
          return (
            <button
              key={id}
              type="button"
              onClick={() => goToAct(id)}
              aria-current={active ? 'step' : undefined}
              aria-label={`Go to Act ${id}: ${ACT_LABELS[id]}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--r-full)',
                border: active ? '1px solid var(--copper-500)' : '1px solid transparent',
                backgroundColor: active ? 'rgba(192, 134, 98, 0.12)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: active ? 'var(--ember-500)' : 'var(--text-tertiary)',
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                }}
              >
                {ACT_LABELS[id]}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <Link
        to="/ecosystem"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--copper-300)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        App Store ↗
      </Link>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <Link
        to="/animation"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--copper-300)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        3D Cascade ↗
      </Link>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <Link
        to="/cartoon"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--copper-300)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Cute Alexa ↗
      </Link>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <Link
        to="/companion"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--copper-300)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        Companion App ↗
      </Link>
    </nav>
  );
}
