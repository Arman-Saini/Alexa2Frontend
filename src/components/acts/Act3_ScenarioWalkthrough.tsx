import { ScrollReveal } from '../shared/ScrollReveal';
import { GlassCard } from '../shared/GlassCard';
import { Act3_StepDiagram } from './Act3_StepDiagram';
import { useActStore } from '../../store/actStore';
import type { ScenarioPlan } from '../../api/scenarioBuilderApi';

interface Act3_ScenarioWalkthroughProps {
  plan: ScenarioPlan | null;
  loading?: boolean;
}

/**
 * Act 3 — the scenario walkthrough. Shows what the user asked, then the
 * Bedrock-generated step-by-step plan explaining how Hearth resolved it.
 */
export function Act3_ScenarioWalkthrough({ plan, loading }: Act3_ScenarioWalkthroughProps) {
  const scenarioText = useActStore((s) => s.triggerContext?.scenarioText);

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
        gap: 'var(--space-6)',
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
            Walking it through
          </h2>
          {scenarioText && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.95rem',
                color: 'var(--text-secondary)',
                marginTop: 'var(--space-3)',
                fontStyle: 'italic',
              }}
            >
              “{scenarioText}”
            </p>
          )}
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <GlassCard padding="lg" className="w-full" glow="ember">
          <Act3_StepDiagram plan={plan} loading={loading} />
        </GlassCard>
      </ScrollReveal>
    </div>
  );
}
