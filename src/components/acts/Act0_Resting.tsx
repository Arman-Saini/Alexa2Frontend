import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { VoiceEntry } from '../shared/VoiceEntry';
import { useDemoScript } from '../../hooks/useDemoScript';
import { useActSequencer } from '../../hooks/useActSequencer';

/**
 * Act 0 — the landing/idle state. Calmest, most spacious act; the 3D house
 * (rendered behind this layer) is the visual anchor. Hero headline + the
 * primary voice entry point, with ambient example prompts cycling from the
 * attract-mode demo script.
 */
export function Act0_Resting() {
  const { submitTranscript } = useActSequencer();
  const { steps } = useDemoScript();
  const [chipIndex, setChipIndex] = useState(0);

  useEffect(() => {
    if (steps.length === 0) return;
    const dwell = steps[chipIndex % steps.length]?.dwell_ms ?? 4000;
    const timer = setTimeout(() => {
      setChipIndex((i) => (i + 1) % steps.length);
    }, dwell);
    return () => clearTimeout(timer);
  }, [chipIndex, steps]);

  const currentCaption = steps[chipIndex % steps.length]?.caption;

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
          HomeSense reads every room in real time and reasons about what's happening — so it can act
          before you have to ask.
        </p>
      </div>

      <div style={{ pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
        <VoiceEntry onSubmit={submitTranscript} />

        {currentCaption && (
          <motion.div
            key={chipIndex}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 0.6, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              color: 'var(--text-tertiary)',
            }}
          >
            Try: “{currentCaption}”
          </motion.div>
        )}
      </div>
    </div>
  );
}
