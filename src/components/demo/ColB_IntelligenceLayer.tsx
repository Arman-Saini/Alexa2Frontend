import { useEffect, useRef, useState } from 'react';
import { C } from './ScenarioDefs';
import type { ActiveScenario, IntelTab, TierKey } from './ScenarioDefs';

export interface TierCounts { T0: number; T1: number; T2: number; T3: number; }
export interface LiveEvent { id: string; time: string; tier: string; description: string; }

interface Props {
  activeScenario: ActiveScenario | null;
  activeTab: IntelTab;
  onTabChange: (t: IntelTab) => void;
  tierCounts: TierCounts;
  events: LiveEvent[];
}

const TABS: { key: IntelTab; label: string }[] = [
  { key: 'cascade', label: 'Compute Cascade' },
  { key: 'memory',  label: 'Memory Vaults'   },
  { key: 'agents',  label: 'Agent Tree'       },
  { key: 'kb',      label: 'Knowledge Base'   },
];

// ── Cascade tab ───────────────────────────────────────────────────────────────

interface TierNode {
  key: TierKey;
  label: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
  pct: number;
}

const TIER_NODES: TierNode[] = [
  { key: 'T0', label: 'Reflex',     sub: 'on device · free',  color: C.green,  bg: C.greenBg,  border: C.greenDim,  pct: 22  },
  { key: 'T1', label: 'Learned',    sub: 'on device · free',  color: C.cyan,   bg: C.cyanBg,   border: C.cyanDim,   pct: 47  },
  { key: 'T2', label: 'Local',      sub: 'on device · free',  color: C.violet, bg: C.violetBg, border: C.violetDim, pct: 72  },
  { key: 'T3', label: 'Deep Think', sub: 'cloud · rare',      color: C.amber,  bg: C.amberBg,  border: C.amberDim,  pct: 97  },
];

const PULSE_DUR: Record<TierKey, number> = { T0: 400, T1: 700, T2: 1000, T3: 1400 };

function PulseDot({ color, pct, tier, animKey }: { color: string; pct: number; tier: TierKey; animKey: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const dur = PULSE_DUR[tier];
    el.style.transition = 'none';
    el.style.left = '2%';
    el.style.opacity = '1';
    void el.offsetWidth; // force reflow
    el.style.transition = `left ${dur}ms linear, opacity 180ms ease ${dur - 80}ms`;
    el.style.left = `${pct}%`;
    el.style.opacity = '0';
  }, [animKey]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute', top: 10, left: '2%',
        width: 8, height: 8, borderRadius: '50%',
        background: color, boxShadow: `0 0 10px ${color}`,
        pointerEvents: 'none', zIndex: 10,
      }}
    />
  );
}

function CascadeTab({ activeScenario, tierCounts }: { activeScenario: ActiveScenario | null; tierCounts: TierCounts }) {
  const [pulseKey,   setPulseKey]   = useState(0);
  const [pulsing,    setPulsing]    = useState(false);
  const [activeTier, setActiveTier] = useState<TierKey | null>(null);

  useEffect(() => {
    if (!activeScenario) return;
    setActiveTier(activeScenario.tier);
    setPulseKey(k => k + 1);
    setPulsing(true);
    const dur = PULSE_DUR[activeScenario.tier] + 600;
    const id  = setTimeout(() => setPulsing(false), dur);
    return () => clearTimeout(id);
  }, [activeScenario?.id]);

  const total    = Math.max(1, (Object.values(tierCounts) as number[]).reduce((a, b) => a + b, 0));
  const activeN  = TIER_NODES.find(n => n.key === activeTier);

  return (
    <div style={{ padding: '10px 14px' }}>
      {/* Query-type badge */}
      {activeScenario && (
        <div style={{ marginBottom: 8 }}>
          <span style={{
            fontSize: 7, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
            letterSpacing: '0.08em', display: 'inline-block',
            color: activeScenario.tier === 'T3' ? C.amber : activeScenario.tier === 'T2' ? C.violet : C.green,
            background: activeScenario.tier === 'T3' ? C.amberBg : activeScenario.tier === 'T2' ? C.violetBg : C.greenBg,
            border: `1px solid ${activeScenario.tier === 'T3' ? C.amberDim : activeScenario.tier === 'T2' ? C.violetDim : C.greenDim}`,
          }}>
            {activeScenario.tier === 'T3' ? '☁️ Cloud reasoning' : activeScenario.tier === 'T2' ? '[KNOWLEDGE BASE PATH]' : '⚡ Device reflex'}
          </span>
        </div>
      )}

      {/* Tier node row */}
      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
        {TIER_NODES.map((node, idx) => {
          const glow = activeTier === node.key && !pulsing && !!activeScenario;
          return (
            <div key={node.key} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '4px 9px', borderRadius: 3, whiteSpace: 'nowrap',
                  border: `1px solid ${glow ? node.color : node.border}`,
                  background: glow ? node.bg : C.card,
                  color: node.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                  boxShadow: glow ? `0 0 14px ${node.color}44` : 'none',
                  transition: 'box-shadow .3s, border-color .3s',
                }}>
                  {node.label}
                </div>
                <div style={{ fontSize: 10, color: C.text3, marginTop: 3, lineHeight: 1.4 }}>{node.sub}</div>
                <div style={{ fontSize: 11, color: node.color, marginTop: 2, fontWeight: 700 }}>
                  {Math.round((tierCounts[node.key] / total) * 100)}%
                </div>
              </div>
              {idx < TIER_NODES.length - 1 && (
                <div style={{ color: C.border2, fontSize: 12, padding: '0 4px', paddingBottom: 18 }}>──▶</div>
              )}
            </div>
          );
        })}

        {/* Routing pulse */}
        {pulsing && activeN && (
          <PulseDot key={pulseKey} color={activeN.color} pct={activeN.pct} tier={activeN.key} animKey={pulseKey} />
        )}
      </div>
    </div>
  );
}

// ── Memory Vaults tab ─────────────────────────────────────────────────────────

function MemoryTab({ activeScenario }: { activeScenario: ActiveScenario | null }) {
  const isGeyser = activeScenario?.id === 'geyser';
  const isT3     = activeScenario?.tier === 'T3';

  const stmWidths = isT3 ? [90, 75, 60, 42] : [];

  const ltmBars = [35, 48, 40, 55, 44, 50, 38, 52, isGeyser ? 95 : 42];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '10px 14px' }}>
      {/* STM */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 9px', background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.cyan, flexShrink: 0 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: C.text2 }}>Active memory</span>
          <span style={{ fontSize: 7, color: C.text3 }}>this session</span>
        </div>
        {stmWidths.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {stmWidths.map((w, i) => (
              <div key={i} style={{
                height: 7, borderRadius: 2, width: `${w}%`,
                background: C.cyan, opacity: 0.6,
              }} />
            ))}
          </div>
        ) : (
          <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
            <div style={{ height: 7, width: '30%', borderRadius: 2, background: C.border }} />
          </div>
        )}
        <div style={{ fontSize: 7, color: C.text3, marginTop: 5 }}>
          {isT3 ? `Thread tokens · ${stmWidths.length} turns active` : 'No active thread'}
        </div>
      </div>

      {/* LTM */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 9px', background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.violet, flexShrink: 0 }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: C.text2 }}>Learned patterns</span>
          <span style={{ fontSize: 7, color: C.text3 }}>30-day history</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
          {ltmBars.map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: '1px 1px 0 0',
              height: `${h}%`,
              background: isGeyser && i === 8 ? C.red : C.violet,
              opacity:    isGeyser && i === 8 ? 0.9 : 0.45,
              transition: 'height .5s, background .4s',
            }} />
          ))}
        </div>
        <div style={{ fontSize: 7, marginTop: 4, color: isGeyser ? C.red : C.text3 }}>
          {isGeyser ? 'Geyser anomaly , 45min vs 20min avg' : '7-day Timestream baseline'}
        </div>
      </div>
    </div>
  );
}

// ── Agent Tree tab ────────────────────────────────────────────────────────────

const ALL_AGENTS = ['Commerce Agent', 'Home-Control Agent', 'Tutor Agent'] as const;

function AgentTreeTab({ activeScenario }: { activeScenario: ActiveScenario | null }) {
  const active = activeScenario?.tier === 'T3';
  const highlighted =
    activeScenario?.id === 'away'  ? 'Home-Control Agent' :
    activeScenario?.id === 'jeera' ? 'Commerce Agent'     : 'Commerce Agent';

  return (
    <div style={{ padding: '10px 14px' }}>
      {!active ? (
        <div style={{ fontSize: 9, color: C.text3 }}>No cloud agent active , T0/T1/T2 handling locally</div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          <div>
            <div style={{
              padding: '5px 10px', borderRadius: 3, whiteSpace: 'nowrap',
              border: `1px solid ${C.amberDim}`, background: C.amberBg,
              color: C.amber, fontSize: 8, fontWeight: 700, letterSpacing: '0.06em',
            }}>
              [T3 SUPERVISOR AGENT]
            </div>
            <div style={{ fontSize: 7, color: C.text3, marginTop: 3 }}>Bedrock · triage + route</div>
          </div>
          <div style={{ color: C.border2, fontSize: 12, lineHeight: 1.7, padding: '4px 0', marginTop: 2 }}>
            ├<br/>├<br/>└
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {ALL_AGENTS.map(a => {
              const on = a === highlighted;
              return (
                <div key={a} style={{
                  padding: '3px 8px', borderRadius: 3, fontSize: 8, whiteSpace: 'nowrap',
                  border: `1px solid ${on ? C.cyan : C.border}`,
                  background: on ? C.cyanBg : C.card,
                  color: on ? C.cyan : C.text2,
                }}>
                  [{a}]
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Knowledge Base tab ────────────────────────────────────────────────────────

const KB_PIPELINE = [
  { label: 'User Query',    color: C.text2   },
  { label: 'Bedrock KB',   color: C.amber   },
  { label: 'OpenSearch',   color: C.cyan    },
  { label: 'Vector Match', color: C.violet  },
  { label: 'Response',     color: C.green   },
];

const KB_DOCS = [
  { label: 'LPG Receipt',    status: 'Retrieved' },
  { label: 'School Circular',status: 'Retrieved' },
  { label: 'Pump Manual',    status: 'Indexed'   },
];

function KBTab() {
  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', marginBottom: 10 }}>
        {KB_PIPELINE.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 3, whiteSpace: 'nowrap',
              color: s.color, background: `${s.color}14`, border: `1px solid ${s.color}40`,
            }}>
              {s.label}
            </span>
            {i < KB_PIPELINE.length - 1 && <span style={{ color: C.border2, fontSize: 11 }}>──▶</span>}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', color: C.text3, marginBottom: 5 }}>
        INDIAN DOCS LIBRARY
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {KB_DOCS.map(d => (
          <div key={d.label} style={{
            flex: 1, border: `1px solid ${C.border}`, borderRadius: 3,
            padding: '5px 7px', background: C.card,
          }}>
            <div style={{ fontSize: 8, fontWeight: 600, color: C.text2 }}>{d.label}</div>
            <div style={{ fontSize: 7, color: C.green, marginTop: 2 }}>{d.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ColB_IntelligenceLayer({ activeScenario, activeTab, onTabChange, tierCounts }: Props) {
  return (
    <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.surface }}>
      {/* Tab strip */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}` }}>
        {TABS.map(t => {
          const on = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              style={{
                padding: '6px 12px', fontSize: 8, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: on ? C.cyan : C.text3,
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${on ? C.cyan : 'transparent'}`,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'cascade' && <CascadeTab activeScenario={activeScenario} tierCounts={tierCounts} />}
      {activeTab === 'memory'  && <MemoryTab  activeScenario={activeScenario} />}
      {activeTab === 'agents'  && <AgentTreeTab activeScenario={activeScenario} />}
      {activeTab === 'kb'      && <KBTab />}
    </div>
  );
}
