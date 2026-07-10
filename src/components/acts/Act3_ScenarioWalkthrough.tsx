import { useEffect, useRef } from 'react';
import { useTourStore } from '../../store/tourStore';
import { useActStore } from '../../store/actStore';

const PROMPT = 'Turn off the kitchen light';

/**
 * Act 3 — "Try it". Opens the dock phone, asks for one real command, and
 * hands off to freeplay the moment any real reply comes back — no canned
 * scenario diagram, this beat is the live thing actually happening.
 */
export function Act3_ScenarioWalkthrough() {
  const baselineReplyAt = useRef<number | null>(useTourStore.getState().lastReplyAt);

  useEffect(() => {
    useTourStore.getState().setReply(`Try saying: "${PROMPT}"`);
    useTourStore.getState().setDockExpanded(true);
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
    </div>
  );
}
