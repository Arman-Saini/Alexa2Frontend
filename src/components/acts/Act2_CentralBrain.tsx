import { useEffect } from 'react';
import { ScrollReveal } from '../shared/ScrollReveal';
import { GlassCard } from '../shared/GlassCard';
import { Act2_OntologyGraph } from './Act2_OntologyGraph';
import { Act2_TraceReadout } from './Act2_TraceReadout';
import { useTourStore } from '../../store/tourStore';

/**
 * Act 2 — "Brain". Same visual centerpiece (Act2_OntologyGraph) and the
 * same de-emphasized trace footnote, just plainer headline copy — no
 * "resolves into a recognized entity" language.
 */
export function Act2_CentralBrain() {
  useEffect(() => {
    useTourStore.getState().setReply(
      "When something happens, I decide what to do — sometimes right away, sometimes I think about it a little more."
    );
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'var(--space-24) var(--space-8) var(--space-24)',
        gap: 'var(--space-8)',
        pointerEvents: 'none',
      }}
    >
      <ScrollReveal>
        <div style={{ textAlign: 'center', maxWidth: 680, pointerEvents: 'auto' }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            How I decide
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-3)',
            }}
          >
            Every sensor reading turns into something I understand — is a light on, is someone home,
            is the stove too hot — so I can act on what's actually happening, not just raw numbers.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <div style={{ pointerEvents: 'auto', width: '100%' }}>
          <GlassCard padding="lg" className="w-full" glow="ember">
            <Act2_OntologyGraph />
          </GlassCard>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.18}>
        <div style={{ alignSelf: 'flex-end', marginRight: 'var(--space-4)', pointerEvents: 'auto' }}>
          <Act2_TraceReadout />
        </div>
      </ScrollReveal>
    </div>
  );
}
