import { useActStore } from '../../store/actStore';
import { TraceBadge } from '../shared/TraceBadge';

export function PhoneTraceReadout() {
  const triggerContext = useActStore((s) => s.triggerContext);

  if (!triggerContext?.phoneTrace) {
    return (
      <div style={{ padding: 'var(--space-2)' }}>
        <p style={{ fontFamily: 'var(--font-body)', color: 'var(--text-tertiary)', fontSize: 13 }}>
          No trace data available.
        </p>
      </div>
    );
  }

  const { phoneTrace, phoneExplanation } = triggerContext;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-tertiary)',
            letterSpacing: '0.04em',
          }}
        >
          COMMAND TRACE
        </span>
        <TraceBadge
          tierLabel={phoneTrace.tier_label}
          latencyMs={phoneTrace.latency_ms}
          costUsd={phoneTrace.cost_usd}
        />
      </div>

      {phoneExplanation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--text-tertiary)',
              letterSpacing: '0.04em',
            }}
          >
            EXPLANATION
          </span>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {phoneExplanation}
          </p>
        </div>
      )}
    </div>
  );
}
