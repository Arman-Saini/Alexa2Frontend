import { useEffect, useRef, useState } from 'react';
import { useTourStore } from '../../store/tourStore';
import { useAppStore } from '../../store/store';
import { useActStore } from '../../store/actStore';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

interface SensingSection {
  headline: string;
  body: string;
  roomId: string | null;
  say: string;
}

const SECTIONS: SensingSection[] = [
  {
    headline: 'I watch every room',
    body: 'Living room, kitchen, bathroom, office, bedroom — each one checks in with me all the time, not just when something changes.',
    roomId: null,
    say: "I'm always watching — every room, all the time.",
  },
  {
    headline: 'I notice when you move',
    body: "Motion and open doors tell me where people are, so I know the difference between empty and quiet.",
    roomId: 'kitchen',
    say: 'I can tell when someone walks into the kitchen.',
  },
  {
    headline: 'I feel the room, too',
    body: 'Temperature, humidity, and air quality all feed into one picture of how the house feels right now.',
    roomId: 'master-bedroom',
    say: "I can feel if a room's getting too warm — like the bedroom, right now.",
  },
  {
    headline: 'Safety comes first',
    body: 'Smoke alarms and doorbells get to me fastest of all — nothing waits in line behind small stuff.',
    roomId: null,
    say: "If something's actually wrong, I hear about it first.",
  },
];

/**
 * Act 1 — "Sensing". One section active at a time (not all 4 at once),
 * each paired with a highlight on the matching part of the twin via the
 * existing setActiveRoom action — no new highlight mechanism.
 */
export function Act1_Sensing() {
  const [active, setActive] = useState(0);
  const headlineGlassRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(headlineGlassRef, { borderRadius: 24, scale: -100, frost: 0.08 });
  useLiquidGlass(glassRef, { borderRadius: 24, scale: -100, frost: 0.08 });

  useEffect(() => {
    const section = SECTIONS[active];
    useTourStore.getState().setReply(section.say);
    useAppStore.getState().setActiveRoom(section.roomId);
  }, [active]);

  useEffect(() => {
    return () => useAppStore.getState().setActiveRoom(null);
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8)',
        gap: 'var(--space-6)',
        pointerEvents: 'none',
      }}
    >
      {/* Rest of viewport passes through to OrbitControls; only this
          content stack captures clicks. */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)', pointerEvents: 'auto' }}>
      <div
        ref={headlineGlassRef}
        style={{
          padding: 'var(--space-4) var(--space-8)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backgroundColor: 'var(--glass-bg)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            color: 'var(--text-primary)',
            textAlign: 'center',
            margin: 0,
            maxWidth: 640,
          }}
        >
          Always sensing
        </h2>
      </div>

      <div
        ref={glassRef}
        className="max-w-md"
        style={{
          padding: 'var(--space-6)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          backgroundColor: 'var(--glass-bg)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '1.1rem',
            color: 'var(--text-primary)',
            margin: 0,
            marginBottom: 'var(--space-2)',
          }}
        >
          {SECTIONS[active].headline}
        </h3>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {SECTIONS[active].body}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <button
          type="button"
          onClick={() => setActive((a) => Math.max(0, a - 1))}
          disabled={active === 0}
          aria-label="Previous"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.25)',
            background: active === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
            color: active === 0 ? 'rgba(255,255,255,0.25)' : 'var(--text-primary)',
            fontSize: '1.1rem',
            cursor: active === 0 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ‹
        </button>

        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
          {SECTIONS.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Section ${i + 1}`}
              style={{
                width: i === active ? 20 : 8,
                height: 8,
                borderRadius: 4,
                border: 'none',
                padding: 0,
                backgroundColor: i === active ? 'var(--ember-500)' : 'var(--void-border)',
                cursor: 'pointer',
                transition: 'width 0.25s ease, background-color 0.2s',
              }}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setActive((a) => Math.min(SECTIONS.length - 1, a + 1))}
          disabled={active === SECTIONS.length - 1}
          aria-label="Next"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.25)',
            background: active === SECTIONS.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
            color: active === SECTIONS.length - 1 ? 'rgba(255,255,255,0.25)' : 'var(--text-primary)',
            fontSize: '1.1rem',
            cursor: active === SECTIONS.length - 1 ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ›
        </button>
      </div>

      <button
        type="button"
        onClick={() => useActStore.getState().goToAct(2)}
        style={{
          marginTop: 'var(--space-2)',
          background: 'var(--copper-500)',
          color: 'var(--void-950)',
          border: 'none',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '13px',
          padding: 'var(--space-2) var(--space-5)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
        }}
      >
        Next: How I decide →
      </button>
      </div>
    </div>
  );
}
