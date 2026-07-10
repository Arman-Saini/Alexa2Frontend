import { useEffect, useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { useTourStore } from '../../store/tourStore';
import { useAppStore } from '../../store/store';

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

      <GlassCard padding="md" className="max-w-md">
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
      </GlassCard>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {SECTIONS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Section ${i + 1}`}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              border: 'none',
              padding: 0,
              backgroundColor: i === active ? 'var(--ember-500)' : 'var(--void-border)',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
}
