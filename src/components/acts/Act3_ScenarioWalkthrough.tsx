import { useEffect, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import { useActStore } from '../../store/actStore';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

const PROMPT = 'Turn off the kitchen light';

/**
 * Act 3 — "Try it". Opens the dock phone, asks for one real command, and
 * hands off to freeplay the moment any real reply comes back — no canned
 * scenario diagram, this beat is the live thing actually happening.
 */
export function Act3_ScenarioWalkthrough() {
  // Captured *after* our own prompt bubble below (not at render time): that
  // setReply call itself advances lastReplyAt, so freezing the baseline
  // before it would make the very next unrelated tourStore update (e.g. the
  // mic's isListening toggle) look like "a reply changed" and fire early.
  const baselineReplyAt = useRef<number | null>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  useLiquidGlass(glassRef, { borderRadius: 24, scale: -100, frost: 0.08 });

  useEffect(() => {
    useTourStore.getState().setReply(`Try saying: "${PROMPT}"`);
    useTourStore.getState().setDockExpanded(true);
    baselineReplyAt.current = useTourStore.getState().lastReplyAt;
  }, []);

  useEffect(() => {
    const unsubscribe = useTourStore.subscribe((state) => {
      if (state.lastReplyAt !== null && state.lastReplyAt !== baselineReplyAt.current) {
        useActStore.getState().goToAct('freeplay');
      }
    });
    return unsubscribe;
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
        gap: 'var(--space-4)',
        pointerEvents: 'none',
      }}
    >
      {/* Rest of viewport passes through to OrbitControls; only this
          content stack captures clicks. */}
      <div
        ref={glassRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-4)',
          pointerEvents: 'auto',
          padding: 'var(--space-6)',
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
        Your turn
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '1rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: 480,
        }}
      >
        Open the phone in the corner and say or type: <strong>"{PROMPT}"</strong>. Watch the house.
      </p>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.85rem',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
          maxWidth: 480,
        }}
      >
        Drag anywhere to orbit the house, scroll to zoom. Move the camera around freely while you try it.
      </p>
      <button
        type="button"
        onClick={() => useActStore.getState().goToAct('freeplay')}
        style={{
          marginTop: 'var(--space-2)',
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid rgba(255,255,255,0.2)',
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: '13px',
          padding: 'var(--space-3) var(--space-6)',
          borderRadius: 'var(--r-md)',
          cursor: 'pointer',
        }}
      >
        Skip → Explore freely
      </button>
      </div>
    </div>
  );
}
