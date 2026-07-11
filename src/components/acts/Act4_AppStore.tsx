import { useRef, useState } from 'react';
import { useActStore } from '../../store/actStore';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

interface SkillCard {
  icon: string;
  title: string;
  author: string;
  body: string;
  tag: string;
}

const SKILLS: SkillCard[] = [
  {
    icon: '🛒',
    title: 'Amazon Fresh',
    author: 'Amazon Alexa',
    body: 'Order groceries automatically. Say "order fresh milk" and Alexa handles it, linked with Amazon Pay for seamless billing.',
    tag: 'Shopping',
  },
  {
    icon: '📒',
    title: 'Amazon Bookkeeper',
    author: 'Amazon Alexa',
    body: 'Digitizes unorganized local commerce: laundry, milk, house help. Log it by voice, settle instantly via Amazon Pay UPI.',
    tag: 'Finance',
  },
  {
    icon: '🍱',
    title: 'Zomato Food Delivery',
    author: 'Zomato',
    body: 'Reorder your regular dish the moment the kitchen sensor notices the fridge is running low. No app, no clicks.',
    tag: 'Food',
  },
  {
    icon: '🔧',
    title: 'Urban Company',
    author: 'Urban Company',
    body: "Book a technician automatically when a device reports a fault state. Happens before you even notice something's wrong.",
    tag: 'Home Services',
  },
  {
    icon: '🛁',
    title: 'Swiggy Instamart',
    author: 'Swiggy',
    body: 'Grocery top-ups triggered by the same pantry signals your home already tracks. Instant delivery, zero effort.',
    tag: 'Shopping',
  },
  {
    icon: '❄️',
    title: 'Ecobee HVAC Sync',
    author: 'Ecobee',
    body: 'Mirror your smart thermostat schedule from Hearth onto a real HVAC controller. Energy savings happen automatically.',
    tag: 'Climate',
  },
];

/**
 * Act 4 — "Skills Store". Showcases real ecosystem integrations from the
 * app store before handing off to the Try It act (Act 3).
 */
export function Act4_AppStore() {
  const [idx, setIdx] = useState(0);
  const glassRef = useRef<HTMLDivElement>(null);
  const headlineGlassRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(glassRef, { borderRadius: 24, scale: -100, frost: 0.08 });
  useLiquidGlass(headlineGlassRef, { borderRadius: 24, scale: -100, frost: 0.08 });

  const skill = SKILLS[idx];

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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-6)', pointerEvents: 'auto' }}>

        {/* Title pill */}
        <div
          ref={headlineGlassRef}
          style={{
            padding: 'var(--space-4) var(--space-8)',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backgroundColor: 'var(--glass-bg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
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
            Extend anything
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              textAlign: 'center',
              margin: 'var(--space-1) 0 0',
            }}
          >
            {SKILLS.length}+ skills in the Alexa Skills Store
          </p>
        </div>

        {/* Skill card */}
        <div
          ref={glassRef}
          className="max-w-md"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backgroundColor: 'var(--glass-bg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            minWidth: 300,
          }}
        >
          {/* Tag */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: 'var(--ember-500)',
                background: 'rgba(255, 120, 50, 0.1)',
                padding: '2px 8px',
                borderRadius: 99,
              }}
            >
              {skill.tag}
            </span>
            <span style={{ fontSize: '1.6rem' }}>{skill.icon}</span>
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1.05rem',
              color: 'var(--text-primary)',
              margin: 0,
              marginBottom: 'var(--space-1)',
            }}
          >
            {skill.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.78rem',
              color: 'var(--text-tertiary)',
              margin: 0,
              marginBottom: 'var(--space-3)',
            }}
          >
            by {skill.author}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            {skill.body}
          </p>
        </div>

        {/* Prev / dots / Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            aria-label="Previous skill"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: idx === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
              color: idx === 0 ? 'rgba(255,255,255,0.25)' : 'var(--text-primary)',
              fontSize: '1.1rem',
              cursor: idx === 0 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ‹
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            {SKILLS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Skill ${i + 1}`}
                style={{
                  width: i === idx ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: 'none',
                  padding: 0,
                  backgroundColor: i === idx ? 'var(--ember-500)' : 'var(--void-border)',
                  cursor: 'pointer',
                  transition: 'width 0.25s ease, background-color 0.2s',
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIdx((i) => Math.min(SKILLS.length - 1, i + 1))}
            disabled={idx === SKILLS.length - 1}
            aria-label="Next skill"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: idx === SKILLS.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
              color: idx === SKILLS.length - 1 ? 'rgba(255,255,255,0.25)' : 'var(--text-primary)',
              fontSize: '1.1rem',
              cursor: idx === SKILLS.length - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ›
          </button>
        </div>

        {/* CTA → Act3 (Try it) */}
        <button
          type="button"
          onClick={() => useActStore.getState().goToAct(3)}
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
          Try it yourself →
        </button>
      </div>
    </div>
  );
}
