import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { AlexaAppSimView } from '../panels/AlexaAppSimView';
import { useDigitalTwin, useAnticipations } from '../../hooks/useBackendApi';
import { backendApi, homeApi } from '../../api';
import type { RegimeState, T0Rule, ProposedRule } from '../../api';
import { useAppStore } from '../../store/store';
import { useSimulation } from '../../hooks/useSimulation';
import { useWebSocket } from '../../hooks/useWebSocket';

const DigitalTwinCanvas = lazy(() =>
  import('../canvas/DigitalTwinCanvas').then((m) => ({ default: m.DigitalTwinCanvas }))
);

interface TierCounts { T0: number; T1: number; T3: number; }
interface LiveEvent { id: string; time: string; tier: string; description: string; icon: string; }

const SCENARIOS = [
  { id: 'geyser',    label: 'Geyser',        emoji: '🚿', tier: 'T0', desc: 'Morning routine — auto heat water',  fn: () => backendApi.simulateGeyser() },
  { id: 'study',     label: 'Study Mode',    emoji: '📚', tier: 'T0', desc: '6PM tuition — lights on, TV mute',  fn: () => backendApi.simulateStudyMode() },
  { id: 'night',     label: 'Night Safety',  emoji: '🌙', tier: 'T0', desc: 'Check LPG/TV/motor, set sleep',     fn: () => backendApi.simulateNightSafety() },
  { id: 'power',     label: 'Power Cut',     emoji: '⚡', tier: 'T0', desc: 'Inverter mode, shed AC load',       fn: () => backendApi.simulatePowerCut() },
  { id: 'motor',     label: 'Motor Safety',  emoji: '⚙️', tier: 'T0', desc: 'Dead-man timer — stop pump',        fn: () => backendApi.simulateMotorSafety() },
  { id: 'inventory', label: 'Inventory',     emoji: '📦', tier: 'T3', desc: 'Milk low → Amazon Now order',       fn: () => backendApi.simulateInventoryDrop() },
  { id: 'sound',     label: 'Unknown Sound', emoji: '🔊', tier: 'T3', desc: 'Zero-shot CLAP cluster detect',     fn: () => backendApi.simulateUnknownSound() },
  { id: 'voice',     label: 'Voice → T3',    emoji: '🤖', tier: 'T3', desc: 'Complex voice → Bedrock 4-agent',  fn: () => backendApi.simulateVoiceCommand(undefined, 'turn on the living room fan and set thermostat to 24') },
] as const;

const TIER_COLORS: Record<string, string> = { T0: '#4ADE80', T1: '#60A5FA', T3: '#F59E0B' };
const tierColor = (tier: string) => TIER_COLORS[tier] ?? '#888';

// ── Header with tier stats ────────────────────────────────────────────────────

function TierMeter({ tier, count, total, ms }: { tier: string; count: number; total: number; ms: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const color = tierColor(tier);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold w-5 shrink-0" style={{ color }}>{tier}</span>
      <div className="w-20 h-1.5 bg-[#1A1A2A] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] text-[#555]">{pct}% · {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}</span>
    </div>
  );
}

function DemoHeader({ tierCounts, costSaved, view, onViewChange }: {
  tierCounts: TierCounts;
  costSaved: number;
  view: 'intelligence' | '3d';
  onViewChange: (v: 'intelligence' | '3d') => void;
}) {
  const total = tierCounts.T0 + tierCounts.T1 + tierCounts.T3;
  return (
    <div className="shrink-0 flex items-center gap-5 px-4 py-2.5 border-b border-[#1A1A2A]"
      style={{ background: '#08080E' }}>
      <div className="shrink-0 border-r border-[#1A1A2A] pr-5">
        <p className="text-sm font-bold text-white tracking-tight leading-tight">
          Alexa<sup className="text-alexa-blue text-[9px] align-super">+</sup> India Context Layer
        </p>
        <p className="text-[9px] text-[#444]">HackOn with Amazon S6 · Context-Aware Smart Home</p>
      </div>
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <TierMeter tier="T0" count={tierCounts.T0} total={total} ms={8} />
        <TierMeter tier="T1" count={tierCounts.T1} total={total} ms={45} />
        <TierMeter tier="T3" count={tierCounts.T3} total={total} ms={1200} />
      </div>
      <div className="shrink-0 border-l border-[#1A1A2A] pl-5 text-right">
        <p className="text-[9px] text-[#444] mb-0.5">Cloud Cost Avoided</p>
        <p className="text-base font-bold text-[#4ADE80]">${costSaved.toFixed(4)}</p>
        <p className="text-[9px] text-[#444]">vs all-cloud baseline</p>
      </div>
      <div className="flex rounded-lg overflow-hidden border border-[#252535] shrink-0">
        {(['intelligence', '3d'] as const).map(v => (
          <button key={v} onClick={() => onViewChange(v)}
            className={`px-3 py-1.5 text-[10px] font-semibold transition-colors ${
              view === v ? 'bg-alexa-blue text-[#05050E]' : 'bg-[#111118] text-[#555] hover:text-white'
            }`}>
            {v === 'intelligence' ? 'Intelligence' : '3D View'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Scenario strip ────────────────────────────────────────────────────────────

function ScenarioStrip({ onRun }: { onRun: (tier: string, desc: string) => void }) {
  const [running, setRunning] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const addNotification = useAppStore(s => s.addNotification);

  const run = async (s: typeof SCENARIOS[number]) => {
    if (running) return;
    setRunning(s.id);
    try {
      const data = await s.fn() as { message?: string };
      const msg = data.message ?? `${s.label} triggered`;
      addNotification(`${s.emoji} ${msg}`, 'success');
      onRun(s.tier, `${s.label}: ${msg.substring(0, 70)}`);
      setFlash({ id: s.id, ok: true });
    } catch {
      addNotification(`${s.emoji} ${s.label} — backend offline?`, 'warning');
      setFlash({ id: s.id, ok: false });
    } finally {
      setRunning(null);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  return (
    <div className="shrink-0 px-3 py-2.5 border-b border-[#1A1A2A]" style={{ background: '#0A0A12' }}>
      <p className="text-[9px] font-bold text-[#3A3A4A] uppercase tracking-widest mb-2">Simulate Scenario</p>
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {SCENARIOS.map(s => {
          const isRunning = running === s.id;
          const flashState = flash?.id === s.id;
          const color = tierColor(s.tier);
          return (
            <button key={s.id} onClick={() => run(s)} disabled={!!running}
              title={s.desc}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl shrink-0 border transition-all duration-200 disabled:opacity-50 ${
                flashState
                  ? (flash!.ok ? 'border-[#4ADE80] bg-[#0A2010]' : 'border-red-500 bg-[#200A0A]')
                  : isRunning
                  ? 'border-alexa-blue bg-[#001A2A] scale-95'
                  : 'border-[#1E1E2A] bg-[#0E0E18] hover:border-[#2A2A3A] hover:bg-[#14141E]'
              }`}>
              <span className="text-lg leading-none">{isRunning ? '⟳' : s.emoji}</span>
              <span className="text-[10px] font-semibold text-white whitespace-nowrap mt-0.5">{s.label}</span>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                style={{ color, background: color + '1A' }}>{s.tier}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Tier cascade chart ────────────────────────────────────────────────────────

function TierCascadePanel({ tierCounts }: { tierCounts: TierCounts }) {
  const total = tierCounts.T0 + tierCounts.T1 + tierCounts.T3 || 1;
  const tiers = [
    { key: 'T0' as const, label: 'T0 Reflexes',  color: '#4ADE80', desc: 'Hardcoded local rules',             detail: '<10ms · $0.00 · no model inference' },
    { key: 'T1' as const, label: 'T1 Local NLU', color: '#60A5FA', desc: 'commandProcessor.ts — on-device',   detail: '<100ms · $0.00 · intent regex engine' },
    { key: 'T3' as const, label: 'T3 Cloud LLM', color: '#F59E0B', desc: 'Bedrock Nova Micro + tool use',     detail: '0.5–3s · ~$0.00004 · 4-agent orchestration' },
  ];
  return (
    <div className="p-4 border-b border-[#1A1A2A]">
      <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-4">Tiered Intelligence Cascade</p>
      <div className="space-y-4">
        {tiers.map(t => {
          const pct = Math.round((tierCounts[t.key] / total) * 100);
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: t.color, background: t.color + '18' }}>{t.key}</span>
                  <span className="text-xs font-semibold text-white">{t.label}</span>
                  <span className="text-[10px] text-[#555]">{t.desc}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: t.color }}>{pct}%</span>
                  <span className="text-[10px] text-[#444]">({tierCounts[t.key]} calls)</span>
                </div>
              </div>
              <div className="h-3 bg-[#111118] rounded-full overflow-hidden border border-[#1A1A2A]">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}66, ${t.color})` }} />
              </div>
              <p className="text-[9px] text-[#3A3A4A] mt-1">{t.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Live event feed ───────────────────────────────────────────────────────────

function EventFeedPanel({ events }: { events: LiveEvent[] }) {
  return (
    <div className="p-4 border-b border-[#1A1A2A]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest">Live Event Feed</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-[9px] text-[#4ADE80]">Live</span>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="py-5 text-center border border-dashed border-[#1E1E2A] rounded-xl">
          <p className="text-xs text-[#444]">No events yet</p>
          <p className="text-[9px] text-[#333] mt-1">Run a scenario above to see tier cascade in action</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
          {events.map(e => (
            <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0A0A12] border border-[#18182A]">
              <span className="text-sm shrink-0">{e.icon}</span>
              <p className="flex-1 text-xs text-[#BBB] truncate">{e.description}</p>
              <span className="text-[9px] text-[#444] shrink-0">{e.time}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ color: tierColor(e.tier), background: tierColor(e.tier) + '1A' }}>{e.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Room status grid ──────────────────────────────────────────────────────────

function RoomStatusGrid() {
  const { twinData } = useDigitalTwin();
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest">Room Status</p>
        {twinData && <span className="text-[9px] text-[#444]">{twinData.current_mode} mode</span>}
      </div>
      {!twinData?.rooms?.length ? (
        <p className="text-xs text-[#333]">Backend offline — start backend to see live room status</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {twinData.rooms.map(room => {
            const pct = room.device_count > 0 ? Math.round((room.on_count / room.device_count) * 100) : 0;
            return (
              <div key={room.id} className="p-3 rounded-xl border border-[#1A1A2A] bg-[#0A0A12]">
                <p className="text-xs font-semibold text-white truncate mb-1">{room.name}</p>
                <div className="flex items-center justify-between text-[10px] mb-2">
                  <span className="text-[#555]">{room.on_count}/{room.device_count} on</span>
                  <span style={{ color: pct > 0 ? '#4ADE80' : '#555' }}>{pct}%</span>
                </div>
                <div className="h-1.5 bg-[#141420] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#4ADE80' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Regime panel ──────────────────────────────────────────────────────────────

const REGIMES = [
  { id: 'normal',   emoji: '🟢', label: 'Normal'  },
  { id: 'festival', emoji: '🎉', label: 'Festival' },
  { id: 'guest',    emoji: '👤', label: 'Guest'    },
  { id: 'sleep',    emoji: '🌙', label: 'Sleep'    },
  { id: 'away',     emoji: '🏠', label: 'Away'     },
];

function RegimePanel() {
  const [regime, setRegime] = useState<RegimeState | null>(null);
  const [busy, setBusy] = useState(false);
  const addNotification = useAppStore(s => s.addNotification);

  useEffect(() => {
    backendApi.getRegime().then(setRegime).catch(() => {});
  }, []);

  const force = async (r: string) => {
    setBusy(true);
    try {
      await backendApi.forceRegime(undefined, r);
      const updated = await backendApi.getRegime();
      setRegime(updated);
      const emoji = REGIMES.find(x => x.id === r)?.emoji ?? '⚙️';
      addNotification(`${emoji} Regime → ${r}`, 'success');
    } catch {
      addNotification('Regime change failed — backend offline?', 'warning');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-3 border-b border-[#1A1A2A]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest">Context Regime</p>
        {regime && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: '#4ADE80', background: '#4ADE8018' }}>{regime.current_regime.toUpperCase()}</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {REGIMES.map(r => {
          const active = regime?.current_regime === r.id;
          return (
            <button key={r.id} onClick={() => force(r.id)} disabled={busy}
              className={`flex flex-col items-center py-2 px-1 rounded-xl text-center transition-all border disabled:opacity-40 ${
                active
                  ? 'border-alexa-blue bg-alexa-accent text-alexa-ring font-semibold'
                  : 'border-[#1E1E2A] bg-[#0C0C14] text-[#666] hover:border-[#2A2A3A] hover:text-white'
              }`}>
              <span className="text-base mb-0.5">{r.emoji}</span>
              <span className="text-[9px] font-medium">{r.label}</span>
            </button>
          );
        })}
      </div>
      {regime?.description && (
        <p className="text-[9px] text-[#444] mt-1.5 leading-snug">{regime.description}</p>
      )}
    </div>
  );
}

// ── Anticipations ─────────────────────────────────────────────────────────────

function AnticipationsPanel() {
  const { anticipations, loading } = useAnticipations();
  return (
    <div className="px-3 py-3 border-b border-[#1A1A2A]">
      <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-2">Anticipations</p>
      {loading ? (
        <p className="text-[10px] text-[#444]">Loading...</p>
      ) : anticipations.length === 0 ? (
        <p className="text-[10px] text-[#333] leading-snug">Seed learning history in Rule Mining to generate time-based anticipations</p>
      ) : (
        <div className="space-y-2">
          {anticipations.slice(0, 4).map((a, i) => (
            <div key={i} className="flex gap-2 pb-2 border-b border-[#141420] last:border-0 last:pb-0">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-white leading-tight">{a.action}</p>
                {a.trigger_window && (
                  <p className="text-[9px] text-alexa-blue mt-0.5">{a.trigger_window}</p>
                )}
                <p className="text-[9px] text-[#444] mt-0.5 leading-tight">{a.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded"
                  style={{ color: tierColor(a.tier), background: tierColor(a.tier) + '1A' }}>{a.tier}</span>
                <span className="text-[9px] text-[#444]">{Math.round(a.confidence * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Rule mining ───────────────────────────────────────────────────────────────

function RuleMiningPanel() {
  const [rules, setRules] = useState<T0Rule[]>([]);
  const [proposed, setProposed] = useState<ProposedRule[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [mining, setMining] = useState(false);
  const addNotification = useAppStore(s => s.addNotification);

  const loadRules = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([
        backendApi.listT0Rules(),
        backendApi.listProposedRules(),
      ]);
      setRules(r.rules ?? []);
      setProposed(p.proposed ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const seed = async () => {
    setSeeding(true);
    try {
      const data = await homeApi.seedLearningHistory();
      addNotification(`📊 Seeded ${data.days_seeded} days of learning history`, 'success');
      await loadRules();
    } catch {
      addNotification('Seed failed — backend offline?', 'warning');
    } finally { setSeeding(false); }
  };

  const mine = async () => {
    setMining(true);
    try {
      const data = await backendApi.runRuleMiner() as { proposed?: number };
      addNotification(`⛏️ Miner ran — ${data.proposed ?? 0} rule(s) proposed`, 'success');
      await loadRules();
    } catch {
      addNotification('Mining failed — backend offline?', 'warning');
    } finally { setMining(false); }
  };

  const confirm = async (id: string) => {
    try {
      await backendApi.confirmRule(undefined, id);
      addNotification('✅ Rule confirmed → added to T0', 'success');
      await loadRules();
    } catch {}
  };

  const reject = async (id: string) => {
    try {
      await backendApi.rejectRule(undefined, id);
      await loadRules();
    } catch {}
  };

  const pending = proposed.filter(p => p.status === 'pending');
  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="px-3 py-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest">Rule Mining</p>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ color: '#4ADE80', background: '#4ADE8018' }}>{activeCount} T0 rules</span>
      </div>
      <div className="flex gap-1.5 mb-3">
        <button onClick={seed} disabled={seeding || mining}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-[#1E1E2A] text-[#555] hover:text-white hover:border-[#2A2A3A] transition-colors disabled:opacity-40">
          {seeding ? 'Seeding...' : '📊 Seed 7 Days'}
        </button>
        <button onClick={mine} disabled={mining || seeding}
          className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold border border-[#1E1E2A] text-[#555] hover:text-white hover:border-[#2A2A3A] transition-colors disabled:opacity-40">
          {mining ? 'Mining...' : '⛏️ Run Miner'}
        </button>
      </div>
      {pending.length === 0 && activeCount === 0 && (
        <p className="text-[9px] text-[#2A2A3A] text-center py-2 leading-snug">
          Seed history → run miner → confirm rules<br/>Confirmed rules fire at T0 (instant, $0)
        </p>
      )}
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-[#F59E0B] font-semibold">{pending.length} rule(s) pending approval</p>
          {pending.slice(0, 3).map(p => (
            <div key={p.proposal_id} className="p-2.5 rounded-xl bg-[#0A0A12] border border-[#F59E0B22]">
              <p className="text-[10px] text-white leading-snug mb-1.5">{p.description}</p>
              {p.confidence != null && (
                <p className="text-[9px] text-[#555] mb-2">Confidence: {Math.round(p.confidence * 100)}%</p>
              )}
              <div className="flex gap-1.5">
                <button onClick={() => confirm(p.proposal_id)}
                  className="flex-1 py-1 rounded text-[9px] font-bold bg-[#0A2010] border border-[#4ADE8033] text-[#4ADE80] hover:bg-[#0E2A16] transition-colors">
                  ✓ Add to T0
                </button>
                <button onClick={() => reject(p.proposal_id)}
                  className="flex-1 py-1 rounded text-[9px] font-bold bg-[#1A0A0A] border border-[#F8717133] text-[#F87171] hover:bg-[#240D0D] transition-colors">
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DemoDashboard() {
  useSimulation(2000);
  const { subscribe } = useWebSocket();

  const [view, setView] = useState<'intelligence' | '3d'>('intelligence');
  const [tierCounts, setTierCounts] = useState<TierCounts>({ T0: 8, T1: 3, T3: 1 });
  const [costSaved, setCostSaved] = useState(0.00044);
  const [events, setEvents] = useState<LiveEvent[]>([]);

  useEffect(() => {
    const unsub = subscribe(msg => {
      if (msg.type === 'event_result' && msg.payload) {
        const tier = (msg.payload.tier as string) ?? 'T0';
        const desc = ((msg.payload.description as string) ?? (msg.payload.message as string) ?? 'Event processed').substring(0, 80);
        const id = `${Date.now()}-${Math.random()}`;
        setEvents(prev => [
          { id, time: new Date().toLocaleTimeString(), tier, description: desc, icon: tier === 'T3' ? '🤖' : '⚡' },
          ...prev.slice(0, 19),
        ]);
        setTierCounts(prev => ({ ...prev, [tier]: (prev[tier as keyof TierCounts] ?? 0) + 1 }));
        if (tier !== 'T3') setCostSaved(prev => prev + 0.00004);
      }
    });
    return unsub;
  }, [subscribe]);

  const handleScenarioRun = (tier: string, description: string) => {
    const k = tier as keyof TierCounts;
    setTierCounts(prev => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }));
    if (tier !== 'T3') setCostSaved(prev => prev + 0.00004);
    setEvents(prev => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date().toLocaleTimeString(),
        tier,
        description,
        icon: tier === 'T3' ? '🤖' : '⚡',
      },
      ...prev.slice(0, 19),
    ]);
  };

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#08080E' }}>
      <DemoHeader tierCounts={tierCounts} costSaved={costSaved} view={view} onViewChange={setView} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Alexa voice interface */}
        <div className="w-80 shrink-0 border-r border-[#1A1A2A] overflow-hidden">
          <AlexaAppSimView />
        </div>

        {/* Center: Intelligence or 3D */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScenarioStrip onRun={handleScenarioRun} />
          {view === 'intelligence' ? (
            <div className="flex-1 overflow-y-auto" style={{ background: '#0C0C14' }}>
              <TierCascadePanel tierCounts={tierCounts} />
              <EventFeedPanel events={events} />
              <RoomStatusGrid />
            </div>
          ) : (
            <div className="flex-1 relative" style={{ background: '#080810' }}>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full border-2 border-alexa-blue border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-xs text-[#444]">Loading 3D Twin...</p>
                  </div>
                </div>
              }>
                <DigitalTwinCanvas />
              </Suspense>
            </div>
          )}
        </div>

        {/* Right: Context & Control */}
        <div className="w-72 shrink-0 border-l border-[#1A1A2A] flex flex-col overflow-y-auto" style={{ background: '#08080E' }}>
          <RegimePanel />
          <AnticipationsPanel />
          <RuleMiningPanel />
        </div>
      </div>
    </div>
  );
}
