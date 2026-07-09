import { ActorLane, TraceBadge } from '../shared/TraceBadge';
import type { ScenarioPlan } from '../../api/scenarioBuilderApi';

interface Act3_StepDiagramProps {
  plan: ScenarioPlan | null;
  loading?: boolean;
}

/**
 * Renders a Bedrock-generated scenario plan's steps as a vertical numbered
 * sequence. Steps are 3-8 items, `device_id`/`action` are frequently absent
 * — rendered defensively, never assumed present.
 */
export function Act3_StepDiagram({ plan, loading }: Act3_StepDiagramProps) {
  if (loading) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Working out the steps…
      </p>
    );
  }

  if (!plan) {
    return (
      <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)', fontSize: 13 }}>
        Ask HomeSense something to see it walked through step by step.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: '1.2rem',
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {plan.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {plan.steps.map((step) => (
          <div
            key={step.n}
            style={{
              display: 'flex',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--void-border)',
              backgroundColor: 'rgba(18, 17, 16, 0.4)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--text-tertiary)',
                flexShrink: 0,
                paddingTop: 2,
              }}
            >
              {String(step.n).padStart(2, '0')}
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', flex: 1 }}>
              <ActorLane actor={step.actor} />

              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {step.label}
              </p>

              {step.detail && (
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.85rem',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {step.detail}
                </p>
              )}

              {step.device_id && (
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 11,
                    color: 'var(--copper-300)',
                  }}
                >
                  device: {step.device_id}
                  {step.action ? ` → ${step.action.property} = ${String(step.action.value)}` : ''}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {plan.trace && (
        <div style={{ alignSelf: 'flex-start', marginTop: 'var(--space-2)' }}>
          <TraceBadge
            tierLabel={plan.trace.tier_label}
            latencyMs={plan.trace.latency_ms}
            costUsd={plan.trace.cost_usd}
          />
        </div>
      )}
    </div>
  );
}
