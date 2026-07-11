import { useEffect, useState } from 'react';
import { useEventStream, type WsMessage } from '../../hooks/useEventStream';
import { backendApi } from '../../api/backendApi';

type TierId = 't0' | 't1' | 'cache' | 't3';

const TIERS: { id: TierId; label: string; sub: string }[] = [
  { id: 't0', label: 'T0', sub: 'Reflex' },
  { id: 't1', label: 'T1', sub: 'Perception' },
  { id: 'cache', label: 'T2', sub: 'Cache' },
  { id: 't3', label: 'T3', sub: 'Cloud' },
];

interface LatestDecision {
  tier: TierId;
  ruleId?: string;
  explanation?: string;
}

interface StatsPoint {
  t0: number;
  t1: number;
  cache: number;
  t3: number;
}

// Backend reports response.tier as 'T0'|'T1'|'CACHED'|'T3'|'LOGGED'.
function normalizeTier(raw: unknown): TierId | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.toUpperCase();
  if (upper === 'T0') return 't0';
  if (upper === 'T1') return 't1';
  if (upper === 'CACHED' || upper === 'CACHE') return 'cache';
  if (upper === 'T3') return 't3';
  return null;
}

function pct(raw: unknown): number {
  if (typeof raw !== 'string') return 0;
  return parseFloat(raw) || 0;
}

/**
 * "How I decide" brain panel — tier cascade strip, escalation-rate sparkline,
 * and rule explainability, sharing one WS subscription. Reframes T2 as the
 * cache it is (recalls a compiled rule, doesn't re-reason) per the T0-T3
 * cascade briefing, and surfaces the same rule_id/explanation the backend
 * already attaches to every T0 decision.
 */
export function Act2_BrainPanel() {
  const { onMessage } = useEventStream();
  const [activeTier, setActiveTier] = useState<TierId | null>(null);
  const [decision, setDecision] = useState<LatestDecision | null>(null);
  const [history, setHistory] = useState<StatsPoint[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    return onMessage((msg: WsMessage) => {
      if (msg.type === 'event_result') {
        const payload = msg.payload as Record<string, unknown>;
        const tier = normalizeTier(payload?.tier);
        if (!tier) return;
        setActiveTier(tier);
        const result = payload.result as Record<string, unknown> | undefined;
        setDecision({
          tier,
          ruleId: typeof result?.rule_id === 'string' ? result.rule_id : undefined,
          explanation: typeof result?.explanation === 'string' ? result.explanation : undefined,
        });
        setDeleted(false);
        return;
      }
      if (msg.type === 'stats_update') {
        const stats = msg.payload as Record<string, unknown>;
        setHistory((prev) => {
          const next: StatsPoint = {
            t0: pct(stats.t0_percent),
            t1: pct(stats.t1_percent),
            cache: pct(stats.cache_percent),
            t3: pct(stats.t3_percent),
          };
          return [...prev, next].slice(-40);
        });
      }
    });
  }, [onMessage]);

  async function handleDelete() {
    if (!decision?.ruleId) return;
    setDeleting(true);
    try {
      await backendApi.deleteRule(undefined, decision.ruleId);
      setDeleted(true);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', pointerEvents: 'auto' }}>
      {/* Tier cascade strip */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {TIERS.map((tier) => {
          const active = activeTier === tier.id;
          return (
            <div
              key={tier.id}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: 'var(--space-4) var(--space-2)',
                borderRadius: 'var(--r-lg)',
                border: `2px solid ${active ? 'var(--copper-500)' : 'var(--glass-border)'}`,
                backgroundColor: active ? 'rgba(217, 169, 138, 0.16)' : 'rgba(36, 31, 27, 0.4)',
                boxShadow: active ? '0 0 24px rgba(217, 169, 138, 0.35)' : 'none',
                transition: 'all 200ms ease',
              }}
            >
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: active ? 'var(--copper-500)' : 'var(--text-secondary)' }}>
                {tier.label}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, marginTop: 4, color: 'var(--text-tertiary)' }}>
                {tier.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Escalation-rate-over-time sparkline */}
      {history.length > 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
            ESCALATION RATE OVER TIME (T3 SHARE)
          </span>
          <svg width="100%" height="64" viewBox="0 0 200 64" preserveAspectRatio="none" style={{ display: 'block' }}>
            <polyline
              fill="none"
              stroke="var(--ember-500)"
              strokeWidth="2.5"
              points={history
                .map((p, i) => `${(i / (history.length - 1)) * 200},${64 - (p.t3 / 100) * 60 - 2}`)
                .join(' ')}
            />
          </svg>
        </div>
      )}

      {/* Why did you do that? */}
      {decision?.ruleId && decision?.explanation && !deleted && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{
              background: 'transparent',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              padding: 'var(--space-1) var(--space-3)',
              borderRadius: 'var(--r-full)',
              cursor: 'pointer',
            }}
          >
            Why did you do that?
          </button>
          {expanded && (
            <div
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--r-md)',
                border: '1px solid var(--glass-border)',
                backgroundColor: 'rgba(12, 11, 10, 0.6)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                maxWidth: 360,
              }}
            >
              <p style={{ margin: 0 }}>{decision.explanation}</p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  marginTop: 'var(--space-2)',
                  background: 'transparent',
                  border: '1px solid var(--ember-500)',
                  color: 'var(--ember-500)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  padding: 'var(--space-1) var(--space-3)',
                  borderRadius: 'var(--r-full)',
                  cursor: deleting ? 'default' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                }}
              >
                {deleting ? 'Deleting…' : 'Delete this rule'}
              </button>
            </div>
          )}
        </div>
      )}
      {deleted && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>
          Rule deleted.
        </span>
      )}
    </div>
  );
}
