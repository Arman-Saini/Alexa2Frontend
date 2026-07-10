import { useEffect } from 'react';
import { useTourStore } from '../../store/tourStore';

/**
 * Act 0 — "Hi". The avatar wakes and greets, points at the phone dock as the
 * one way to talk to the house. No mic here — this was voice-entry-point #1
 * of 3 in the old design; SmartphoneWidget (in HudDock) is now the only one.
 */
export function Act0_Resting() {
  useEffect(() => {
    useTourStore.getState().setReply(
      "Hi — I'm Alexa. This is your home, live. Tap me to talk."
    );
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
        gap: 'var(--space-8)',
        padding: 'var(--space-8)',
        pointerEvents: 'none',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 720, pointerEvents: 'auto' }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            lineHeight: 1.1,
            color: 'var(--text-primary)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          A house that understands itself.
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            marginTop: 'var(--space-4)',
          }}
        >
          Say hi to Alexa in the corner — she'll show you around.
        </p>
      </div>
    </div>
  );
}
