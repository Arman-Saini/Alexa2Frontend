// EventFeed , scrolling real-time event history from the backend.
// Shows tier, timestamp, and a short description for each event.

import { C, F } from './ScenarioDefs';
import type { HistoryEvent } from '../../hooks/useLiveBackend';
import type { Anticipation } from '../../api';

const TIER_COLORS: Record<string, string> = {
  T0: C.green,
  T1: C.cyan,
  T2: C.violet,
  T3: C.amber,
  ERR: C.red,
};

function tierColor(tier = 'T1') { return TIER_COLORS[tier] ?? C.text3; }

function relTime(ts: string): string {
  try {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60_000)  return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ts; }
}

function EventRow({ ev }: { ev: HistoryEvent }) {
  const tier  = ev.tier ?? 'T1';
  const color = tierColor(tier);
  const desc  = ev.description ?? ev.intent ?? 'Event';

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '6px 12px',
      borderBottom: `1px solid ${C.border}`,
      alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: F.badge, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
        background: `${color}18`, border: `1px solid ${color}44`, color,
        flexShrink: 0, marginTop: 1, letterSpacing: '0.06em',
      }}>{tier}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: F.xs, color: C.text, lineHeight: 1.4, wordBreak: 'break-word' as const }}>
          {String(desc).substring(0, 100)}
        </div>
        <div style={{ fontSize: F.badge, color: C.text3, marginTop: 2 }}>
          {relTime(ev.timestamp)}
        </div>
      </div>
    </div>
  );
}

function AnticipationRow({ ant }: { ant: Anticipation }) {
  const color = tierColor(ant.tier);
  const conf  = Math.round((ant.confidence ?? 0) * 100);

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '6px 12px',
      borderBottom: `1px solid ${C.border}`,
      background: `${C.violet}08`,
      alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: F.badge, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
        background: `${color}18`, border: `1px solid ${color}44`, color,
        flexShrink: 0, marginTop: 1,
      }}>EXP</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: F.xs, color: C.text, lineHeight: 1.4 }}>
          {ant.action}
        </div>
        <div style={{ fontSize: F.badge, color: C.text3, marginTop: 2 }}>
          {ant.reason} · {conf}% confidence
          {ant.trigger_window && <span style={{ color: C.violet, marginLeft: 6 }}>{ant.trigger_window}</span>}
        </div>
      </div>
    </div>
  );
}

interface Props {
  events:        HistoryEvent[];
  anticipations: Anticipation[];
  onSeedHistory: () => Promise<void>;
  connected:     boolean;
}

export function EventFeed({ events, anticipations, onSeedHistory, connected }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 6px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text }}>Event History</div>
          <div style={{ fontSize: F.tiny, color: C.text3 }}>
            {events.length} events · {anticipations.length} anticipated
          </div>
        </div>
        <button
          onClick={onSeedHistory}
          disabled={!connected}
          title="Seed 7 days of learning history"
          style={{
            fontSize: F.badge, fontWeight: 700, padding: '4px 8px', borderRadius: 4,
            background: C.violetBg, border: `1px solid ${C.violetDim}`, color: C.violet,
            cursor: connected ? 'pointer' : 'not-allowed', opacity: connected ? 1 : 0.5,
          }}
        >
          Seed History
        </button>
      </div>

      {/* Anticipations section */}
      {anticipations.length > 0 && (
        <div>
          <div style={{ padding: '6px 12px 3px', fontSize: F.badge, fontWeight: 700, letterSpacing: '0.1em', color: C.violet, textTransform: 'uppercase' as const }}>
            ANTICIPATED
          </div>
          {anticipations.slice(0, 3).map((a, i) => (
            <AnticipationRow key={i} ant={a} />
          ))}
        </div>
      )}

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: C.text3, fontSize: F.xs }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
            No events yet.<br />Run a scenario or seed history to populate.
          </div>
        ) : (
          events.map(ev => <EventRow key={ev.event_id} ev={ev} />)
        )}
      </div>
    </div>
  );
}
