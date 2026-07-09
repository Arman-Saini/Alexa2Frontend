import { useEffect, useState } from 'react';
import { TraceBadge } from '../shared/TraceBadge';
import { useEventStream, type WsMessage, type EventTrace } from '../../hooks/useEventStream';

function extractTrace(msg: WsMessage): EventTrace | null {
  if (msg.type !== 'event_result' && msg.type !== 'device_update') return null;
  const payload = msg.payload;
  if (!payload || typeof payload !== 'object') return null;
  const trace = (payload as Record<string, unknown>).trace;
  if (!trace || typeof trace !== 'object') return null;
  const t = trace as Partial<EventTrace>;
  if (typeof t.tier_label !== 'string' || typeof t.latency_ms !== 'number' || typeof t.cost_usd !== 'number') {
    return null;
  }
  return t as EventTrace;
}

/**
 * Secondary/de-emphasized readout of the latest event trace. Tucked as a
 * footnote near the ontology graph — never the hero of the screen.
 */
export function Act2_TraceReadout() {
  const { onMessage } = useEventStream();
  const [trace, setTrace] = useState<EventTrace | null>(null);

  useEffect(() => {
    return onMessage((msg) => {
      const t = extractTrace(msg);
      if (t) setTrace(t);
    });
  }, [onMessage]);

  if (!trace) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', opacity: 0.85 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-tertiary)',
          letterSpacing: '0.04em',
        }}
      >
        LAST TRACE
      </span>
      <TraceBadge tierLabel={trace.tier_label} latencyMs={trace.latency_ms} costUsd={trace.cost_usd} />
    </div>
  );
}
