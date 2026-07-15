import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useActStore, type ActId } from '../../store/actStore';
import { useStoryStore } from '../../store/storyStore';
import { DemoControls } from '../shared/DemoControls';

const ACT_LABELS: Record<Exclude<ActId, 'freeplay'>, string> = {
  0: 'Hi',
  1: 'Sensing',
  4: 'Skills',
  2: 'Brain',
  3: 'Try it',
};

const ACT_IDS: Exclude<ActId, 'freeplay'>[] = [0, 1, 4, 2, 3];

/**
 * Minimal persistent nav — thin glass strip, corner-anchored. Plain-language
 * tour-beat dots (no jargon), a Replay tour button (reuses actStore's
 * existing resetToRest), and one de-emphasized dev-only menu for the other
 * routes/debug tools — nothing here should require reading to operate.
 */
export function ActNav() {
  const currentAct = useActStore((s) => s.currentAct);
  const goToAct = useActStore((s) => s.goToAct);
  const resetToRest = useActStore((s) => s.resetToRest);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

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
              aria-label={`Go to: ${ACT_LABELS[id]}`}
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

      <button
        type="button"
        onClick={() => {
          resetToRest();
          useStoryStore.getState().restartStory();
        }}
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--copper-300)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Replay tour
      </button>

      {currentAct !== 'freeplay' && (
        <>
          <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />
          <button
            type="button"
            onClick={() => goToAct('freeplay')}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Skip tour → Explore now
          </button>
        </>
      )}

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <Link
        to="/live-showcase"
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--text-tertiary)',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        See how it works ↓
      </Link>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--void-border)' }} />

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setDevMenuOpen((v) => !v)}
          aria-label="Developer links"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            opacity: 0.6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          dev ↗
        </button>

        {devMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              padding: 'var(--space-3)',
              borderRadius: 'var(--r-md)',
              backgroundColor: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              minWidth: 160,
            }}
          >
            {[
              ['/ecosystem', 'App Store'],
              ['/animation', '3D Cascade'],
              ['/cartoon', 'Cute Alexa'],
              ['/companion', 'Companion App'],
              ['/smartphone', 'Smartphone Lab'],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  color: 'var(--copper-300)',
                  textDecoration: 'none',
                }}
              >
                {label} ↗
              </Link>
            ))}
            <div style={{ borderTop: '1px solid var(--void-border)', paddingTop: 'var(--space-2)' }}>
              <DemoControls />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
