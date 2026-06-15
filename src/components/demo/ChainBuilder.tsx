// ChainBuilder , live T0 rule chain editor.
// Shows active rules from the real backend, lets the user confirm/reject
// mined proposals, and mine for new patterns.

import { useState } from 'react';
import { C, F } from './ScenarioDefs';
import type { T0Rule, ProposedRule } from '../../api/backendApi';

interface Props {
  t0Rules:       T0Rule[];
  proposedRules: ProposedRule[];
  connected:     boolean;
  onMine:        () => Promise<void>;
  onConfirm:     (id: string) => Promise<void>;
  onReject:      (id: string) => Promise<void>;
}

const FALLBACK_RULES: T0Rule[] = [
  { rule_id: 'r1', description: 'Jeera burning detection , reduce burner', trigger_event: 'AUDIO_SPIKE_800HZ', action: 'NOTIFY + REDUCE_FLAME', enabled: true, source: 'factory' },
  { rule_id: 'r2', description: 'Pressure cooker: 3rd whistle → cut burner', trigger_event: 'WHISTLE_COUNT_3', action: 'CUT_BURNER + NOTIFY', enabled: true, source: 'factory' },
  { rule_id: 'r3', description: 'Grid failure → inverter + dead-man timer', trigger_event: 'GRID_LOSS', action: 'SWITCH_INVERTER + TIMER_45MIN', enabled: true, source: 'factory' },
  { rule_id: 'r4', description: 'Geyser on > 20min avg → cut power', trigger_event: 'GEYSER_ANOMALY', action: 'CUT_GEYSER + NOTIFY', enabled: true, source: 'ltm-mined' },
  { rule_id: 'r5', description: '6:00 AM → warm lights + devotional mode', trigger_event: 'TIME_0600', action: 'SET_LIGHTS_WARM + REGIME_RESTING', enabled: true, source: 'factory' },
];

function RuleRow({ rule }: { rule: T0Rule }) {
  const sourceColor = rule.source === 'ltm-mined' ? C.violet : rule.source === 'user' ? C.amber : C.text3;
  const sourceLabel = rule.source === 'ltm-mined' ? 'AI Mined' : rule.source === 'user' ? 'User' : 'Factory';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Enabled dot */}
      <div style={{
        marginTop: 4, width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
        background: rule.enabled ? C.green : C.text3,
        boxShadow: rule.enabled ? `0 0 6px ${C.green}` : 'none',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: F.xs, color: C.text, lineHeight: 1.4 }}>{rule.description}</div>
        <div style={{ fontSize: F.tiny, color: C.text3, marginTop: 2, display: 'flex', gap: 8 }}>
          <span style={{ color: C.text3 }}>IF</span>
          <span style={{ color: C.cyan, fontFamily: 'monospace' }}>{rule.trigger_event}</span>
          <span style={{ color: C.text3 }}>→</span>
          <span style={{ color: C.green, fontFamily: 'monospace' }}>{rule.action}</span>
        </div>
      </div>
      <span style={{
        fontSize: F.badge, padding: '1px 5px', borderRadius: 3,
        background: `${sourceColor}18`, color: sourceColor,
        border: `1px solid ${sourceColor}40`, flexShrink: 0, alignSelf: 'flex-start',
      }}>
        {sourceLabel}
      </span>
    </div>
  );
}

function ProposedRow({
  rule, onConfirm, onReject,
}: { rule: ProposedRule; onConfirm: () => void; onReject: () => void }) {
  const conf = rule.confidence !== undefined ? Math.round(rule.confidence * 100) : null;
  const confColor = conf !== null ? (conf >= 80 ? C.green : conf >= 60 ? C.amber : C.red) : C.text3;

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px',
      borderBottom: `1px solid ${C.border}`,
      background: `${C.violet}08`,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: F.xs, color: C.text, lineHeight: 1.4 }}>{rule.description}</div>
        <div style={{ fontSize: F.tiny, color: C.text3, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {rule.trigger_event && (
            <><span style={{ color: C.text3 }}>IF</span>
              <span style={{ color: C.cyan, fontFamily: 'monospace' }}>{rule.trigger_event}</span></>
          )}
          {rule.action && (
            <><span style={{ color: C.text3 }}>→</span>
              <span style={{ color: C.green, fontFamily: 'monospace' }}>{rule.action}</span></>
          )}
          {conf !== null && (
            <span style={{ color: confColor, fontWeight: 700 }}>{conf}% conf.</span>
          )}
        </div>
      </div>
      {rule.status === 'pending' && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            onClick={onConfirm}
            style={{
              fontSize: F.badge, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
              background: C.greenBg, border: `1px solid ${C.greenDim}`, color: C.green,
              fontWeight: 700,
            }}
          >
            Add
          </button>
          <button
            onClick={onReject}
            style={{
              fontSize: F.badge, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
              background: C.redBg, border: `1px solid ${C.redDim}`, color: C.red,
              fontWeight: 700,
            }}
          >
            Skip
          </button>
        </div>
      )}
      {rule.status !== 'pending' && (
        <span style={{
          fontSize: F.badge, padding: '2px 6px', borderRadius: 3,
          background: rule.status === 'confirmed' ? C.greenBg : C.redBg,
          color: rule.status === 'confirmed' ? C.green : C.red,
          border: `1px solid ${rule.status === 'confirmed' ? C.greenDim : C.redDim}`,
        }}>
          {rule.status}
        </span>
      )}
    </div>
  );
}

export function ChainBuilder({ t0Rules, proposedRules, connected, onMine, onConfirm, onReject }: Props) {
  const [mining, setMining] = useState(false);
  const [tab, setTab]       = useState<'active' | 'proposed'>('active');

  const displayRules    = t0Rules.length > 0 ? t0Rules : FALLBACK_RULES;
  const pendingProposed = proposedRules.filter(r => r.status === 'pending');

  const handleMine = async () => {
    setMining(true);
    try { await onMine(); } finally { setMining(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 0',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text }}>T0 Reflex Chain</div>
          <div style={{ fontSize: F.tiny, color: C.text3, marginTop: 1 }}>
            {connected ? `${displayRules.length} live rules` : 'Demo rules (backend offline)'}
            {pendingProposed.length > 0 && (
              <span style={{ color: C.violet, marginLeft: 6 }}>· {pendingProposed.length} awaiting review</span>
            )}
          </div>
        </div>
        <button
          onClick={handleMine}
          disabled={mining || !connected}
          title={connected ? 'Mine patterns from event history' : 'Needs the live backend'}
          style={{
            fontSize: F.tiny, fontWeight: 700, padding: '5px 12px', borderRadius: 4,
            background: mining ? C.card : C.violetBg,
            border: `1px solid ${C.violetDim}`, color: C.violet,
            cursor: mining || !connected ? 'not-allowed' : 'pointer', opacity: mining || !connected ? 0.5 : 1,
          }}
        >
          {mining ? 'Mining…' : 'Mine Patterns'}
        </button>
      </div>

      {/* T3 escalation explainer */}
      <div style={{
        margin: '8px 12px', padding: '8px 10px',
        background: `${C.amber}0C`, border: `1px solid ${C.amberDim}`, borderRadius: 4,
      }}>
        <div style={{ fontSize: F.tiny, fontWeight: 700, color: C.amber, marginBottom: 4 }}>
          How does a request reach T3?
        </div>
        <div style={{ fontSize: F.tiny, color: C.text2, lineHeight: 1.6 }}>
          Requests escalate when local stages can't resolve them:
          T0 misses (no exact rule) → T1 tries audio embedding (cosine similarity &lt; 0.85) →
          T2 local SLM attempts it (confidence &lt; 0.60, or needs 3+ data sources, or multi-intent) →
          T3 Bedrock fires (complex reasoning, purchase auth, or geo-fusion required).
          Every step below T3 is free and runs on your local hub.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, padding: '0 12px' }}>
        {(['active', 'proposed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              fontSize: F.tiny, fontWeight: 600, padding: '6px 10px', background: 'none',
              border: 'none', cursor: 'pointer',
              color: tab === t ? C.cyan : C.text3,
              borderBottom: tab === t ? `2px solid ${C.cyan}` : '2px solid transparent',
            }}
          >
            {t === 'active' ? `Active Rules (${displayRules.length})` : `Review (${pendingProposed.length})`}
          </button>
        ))}
      </div>

      {/* Rule list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'active' && displayRules.map(r => <RuleRow key={r.rule_id} rule={r} />)}
        {tab === 'proposed' && (
          pendingProposed.length === 0
            ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: C.text3, fontSize: F.xs }}>
                No pending proposals.
                <br />Click "Mine Patterns" to analyze recent events.
              </div>
            )
            : proposedRules.map(r => (
              <ProposedRow
                key={r.proposal_id}
                rule={r}
                onConfirm={() => onConfirm(r.proposal_id)}
                onReject={() => onReject(r.proposal_id)}
              />
            ))
        )}
      </div>
    </div>
  );
}
