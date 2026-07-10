import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { animate, stagger } from 'animejs';
import { useTourStore } from '../../store/tourStore';
import { useActStore } from '../../store/actStore';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

/**
 * Act 0 — "Hi". The avatar wakes and greets, points at the phone dock as the
 * one way to talk to the house. No mic here — this was voice-entry-point #1
 * of 3 in the old design; SmartphoneWidget (in HudDock) is now the only one.
 *
 * Entrance is anime.js driven (not framer-motion, unlike the other Acts) and
 * the section scrolls if content overflows the viewport, rather than being
 * pinned to a fixed full-bleed layout.
 */
export function Act0_Resting() {
  const goToAct = useActStore((s) => s.goToAct);
  const rootRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(glassRef, { borderRadius: 28, scale: -100, frost: 0.08 });

  useEffect(() => {
    useTourStore.getState().setReply(
      "Hi — I'm Alexa. This is your home, live."
    );
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    animate(rootRef.current.querySelectorAll('[data-anime]'), {
      opacity: [0, 1],
      translateY: [24, 0],
      easing: 'easeOutExpo',
      duration: 700,
      delay: stagger(120),
    });
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-8)',
        padding: 'var(--space-8)',
        pointerEvents: 'none',
      }}
    >
      {/* Only this card captures clicks/drag — the rest of the viewport
          passes through to OrbitControls so the house stays orbitable
          underneath the tour in every beat. */}
      <div
        ref={glassRef}
        style={{
          textAlign: 'center',
          maxWidth: 720,
          pointerEvents: 'auto',
          padding: 'var(--space-8)',
          borderRadius: 28,
          border: '1px solid rgba(255, 255, 255, 0.25)',
          boxShadow:
            '0 8px 32px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        }}
      >
        <h1
          data-anime
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
            opacity: 0,
          }}
        >
          A house that understands itself.
        </h1>
        <p
          data-anime
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-4)',
            opacity: 0,
          }}
        >
          Say hi to Alexa in the corner — she'll show you around.
        </p>
        <p
          data-anime
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.95rem',
            color: 'var(--text-tertiary)',
            marginTop: 'var(--space-3)',
            opacity: 0,
          }}
        >
          This app is a live digital twin of your smart home: sensing,
          reasoning, and acting shown as they happen, so you can see exactly
          what Alexa hears, decides, and does — not just the end result.
        </p>
        <button
          data-anime
          type="button"
          onClick={() => goToAct(1)}
          style={{
            marginTop: 'var(--space-6)',
            background: 'var(--copper-500)',
            color: 'var(--void-950)',
            border: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '14px',
            padding: 'var(--space-3) var(--space-6)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            opacity: 0,
          }}
        >
          Start tour →
        </button>
        <Link
          data-anime
          to="/showcase"
          style={{
            marginTop: 'var(--space-6)',
            marginLeft: 'var(--space-3)',
            display: 'inline-block',
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--glass-border)',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '14px',
            padding: 'var(--space-3) var(--space-6)',
            borderRadius: 'var(--r-md)',
            textDecoration: 'none',
            opacity: 0,
          }}
        >
          See how it all works ↓
        </Link>
      </div>
    </div>
  );
}
