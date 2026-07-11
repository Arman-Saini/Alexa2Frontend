import { useRef, useState } from 'react';
import { useActStore } from '../../store/actStore';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

interface AppStoreSection {
  icon: string;
  title: string;
  body: string;
}

const SECTIONS: AppStoreSection[] = [
  {
    icon: '🛒',
    title: 'The Alexa Skills Store',
    body: 'Thousands of skills built by developers and brands — each one extends what Alexa can do. Enable a skill once, and it lives in every Echo in your home.',
  },
  {
    icon: '🧠',
    title: 'Skills as Superpowers',
    body: 'Your smart home can understand food delivery, gym routines, doctor reminders, prayer times, and more. Each skill plugs into the same brain that runs your house.',
  },
  {
    icon: '🔗',
    title: 'Works with Everything',
    body: 'Alexa connects to Philips Hue, Samsung SmartThings, Nest, Ring, and hundreds of other ecosystems. One voice — every device, every brand.',
  },
  {
    icon: '📱',
    title: 'The Companion App',
    body: 'Browse skills, manage routines, see a live log of every command and automation — all from your phone. The app is the control room your voice never shows.',
  },
];

/**
 * Act 4 — "Extend Anything". Explains the Alexa Skills Store and companion
 * app ecosystem before handing off to freeplay.
 */
export function Act4_AppStore() {
  const [idx, setIdx] = useState(0);
  const glassRef = useRef<HTMLDivElement>(null);
  const headlineGlassRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(glassRef, { borderRadius: 24, scale: -100, frost: 0.08 });
  useLiquidGlass(headlineGlassRef, { borderRadius: 24, scale: -100, frost: 0.08 });

  const section = SECTIONS[idx];

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
        </div>

        {/* Info card */}
        <div
          ref={glassRef}
          className="max-w-md"
          style={{
            padding: 'var(--space-6)',
            borderRadius: 24,
            border: '1px solid rgba(255, 255, 255, 0.25)',
            backgroundColor: 'var(--glass-bg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)', textAlign: 'center' }}>
            {section.icon}
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '1.1rem',
              color: 'var(--text-primary)',
              margin: 0,
              marginBottom: 'var(--space-2)',
              textAlign: 'center',
            }}
          >
            {section.title}
          </h3>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.5,
              textAlign: 'center',
            }}
          >
            {section.body}
          </p>
        </div>

        {/* Prev / dots / Next */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            aria-label="Previous"
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
            {SECTIONS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Card ${i + 1}`}
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
            onClick={() => setIdx((i) => Math.min(SECTIONS.length - 1, i + 1))}
            disabled={idx === SECTIONS.length - 1}
            aria-label="Next section"
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.25)',
              background: idx === SECTIONS.length - 1 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.12)',
              color: idx === SECTIONS.length - 1 ? 'rgba(255,255,255,0.25)' : 'var(--text-primary)',
              fontSize: '1.1rem',
              cursor: idx === SECTIONS.length - 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ›
          </button>
        </div>

        {/* CTA to freeplay */}
        <button
          type="button"
          onClick={() => useActStore.getState().goToAct('freeplay')}
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
          Explore freely →
        </button>
      </div>
    </div>
  );
}
