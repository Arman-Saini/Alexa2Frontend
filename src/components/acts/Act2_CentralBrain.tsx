import { ScrollReveal } from '../shared/ScrollReveal';
import { GlassCard } from '../shared/GlassCard';
import { Act2_OntologyGraph } from './Act2_OntologyGraph';
import { Act2_TraceReadout } from './Act2_TraceReadout';

/**
 * Act 2 — "how Hearth thinks." The creative centerpiece: raw sensor
 * signal resolving into semantic meaning through Entity -> State ->
 * Environment, the real shape of broker-style ontology reasoning.
 */
export function Act2_CentralBrain() {
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
      }}
    >
      <ScrollReveal>
        <div style={{ textAlign: 'center', maxWidth: 680 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            The central brain
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.95rem',
              color: 'var(--text-secondary)',
              marginTop: 'var(--space-3)',
            }}
          >
            A reading doesn't stay a number for long. It resolves into a recognized entity, that entity
            carries a state, and states combine into an understanding of what's actually happening in the
            home.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <GlassCard padding="lg" className="w-full" glow="ember">
          <Act2_OntologyGraph />
        </GlassCard>
      </ScrollReveal>

      <ScrollReveal delay={0.18}>
        <div style={{ alignSelf: 'flex-end', marginRight: 'var(--space-4)' }}>
          <Act2_TraceReadout />
        </div>
      </ScrollReveal>
    </div>
  );
}
