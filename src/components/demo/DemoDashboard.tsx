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
interface OverlayInfo {
  scenarioId: string;
  tier: 'T0' | 'T3';
  emoji: string;
  ms: string;
  cost: string;
  overlayTitle: string;
  overlayDetail: string;
  steps?: string[];
}
interface Scenario {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  tier: 'T0' | 'T3';
  ms: string;
  cost: string;
  overlayTitle: string;
  overlayDetail: string;
  steps?: string[];
  fn: () => Promise<unknown>;
}

const SCENARIOS: Scenario[] = [
  { id: 'geyser',    emoji: '🚿', title: 'Geyser Left On',    desc: 'AI turns it off — no cloud needed',       tier: 'T0', ms: '8ms',  cost: '$0.00',    overlayTitle: 'Geyser turned off',             overlayDetail: 'Used a saved home pattern — no internet needed',     fn: () => backendApi.simulateGeyser() },
  { id: 'study',     emoji: '📚', title: 'Evening Tuition',   desc: 'AI quiets the house at 6PM',              tier: 'T0', ms: '8ms',  cost: '$0.00',    overlayTitle: 'Study mode activated',          overlayDetail: 'Lights on, TV muted — pattern matched in 8ms',       fn: () => backendApi.simulateStudyMode() },
  { id: 'night',     emoji: '🌙', title: 'Bedtime Check',     desc: 'AI secures LPG, TV, motor',               tier: 'T0', ms: '8ms',  cost: '$0.00',    overlayTitle: 'Home secured for sleep',        overlayDetail: 'LPG off, TV off, motor off — instant local check',   fn: () => backendApi.simulateNightSafety() },
  { id: 'power',     emoji: '⚡', title: 'Power Outage',      desc: 'AI switches to inverter mode',            tier: 'T0', ms: '8ms',  cost: '$0.00',    overlayTitle: 'Switched to inverter mode',     overlayDetail: 'AC load shed, critical devices kept on — <10ms',     fn: () => backendApi.simulatePowerCut() },
  { id: 'motor',     emoji: '⚙️', title: 'Pump Overrun',      desc: 'AI stops the pump automatically',         tier: 'T0', ms: '8ms',  cost: '$0.00',    overlayTitle: 'Water pump stopped',            overlayDetail: 'Dead-man timer triggered — overflow prevented',       fn: () => backendApi.simulateMotorSafety() },
  { id: 'inventory', emoji: '📦', title: 'Milk Running Low',  desc: 'AI orders from Amazon Now',               tier: 'T3', ms: '1.2s', cost: '$0.00004', overlayTitle: 'Milk ordered on Amazon Now',    overlayDetail: "Alexa's 4-agent cloud AI reasoned:",                 steps: ['⟳ Checking your inventory', '✓ Milk: 0.2L remaining', '⟳ Searching Amazon Now', '✓ Best price: ₹58 for 2L', '✓ Order placed! Delivery in 2 hours'],    fn: () => backendApi.simulateInventoryDrop() },
  { id: 'sound',     emoji: '🔊', title: 'Strange Sound',     desc: 'AI identifies what it heard',             tier: 'T3', ms: '1.5s', cost: '$0.00004', overlayTitle: 'Unknown sound identified',      overlayDetail: "Alexa's audio AI classified the cluster:",           steps: ['⟳ Analysing sound cluster', '✓ Frequency: 800–2000 Hz pattern', '⟳ Matching against known sounds', '✓ Identified: pressure cooker whistle', '✓ Alert sent — cooker overdue'], fn: () => backendApi.simulateUnknownSound() },
  { id: 'voice',     emoji: '🎙️', title: 'Complex Request',   desc: 'AI thinks deeper for this one',           tier: 'T3', ms: '2.1s', cost: '$0.00004', overlayTitle: 'Complex voice request handled', overlayDetail: 'Bedrock Nova Micro with tool use:',                  steps: ['⟳ Parsing multi-step intent', '✓ Intent: fan + thermostat change', '⟳ Resolving device targets', '✓ Living room fan + main thermostat', '✓ Both commands executed'],  fn: () => backendApi.simulateVoiceCommand(undefined, 'turn on the living room fan and set thermostat to 24') },
];

const TIER_COLORS: Record<string, string> = { T0: '#4ADE80', T1: '#60A5FA', T3: '#F59E0B' };
const tierColor = (tier: string) => TIER_COLORS[tier] ?? '#888';

// ── Clock ────────────────────────────────────────────────────────────────────

function useCurrentTime() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  useEffect(() => {
    const id = setInterval(
      () => setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
      10000
    );
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Header ───────────────────────────────────────────────────────────────────

function DemoHeader({ tierCounts, costSaved }: { tierCounts: TierCounts; costSaved: number }) {
  const time = useCurrentTime();
  const instantCount = tierCounts.T0 + tierCounts.T1;
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-[#1A1A2A]" style={{ background: '#08080E' }}>
      <div className="shrink-0 flex items-baseline gap-0.5">
        <span className="text-sm font-bold text-white">Alexa</span>
        <sup className="text-[#00A8E0] text-[9px]">+</sup>
        <span className="text-sm font-bold text-[#00A8E0] ml-0.5">India</span>
        <span className="text-[9px] text-[#333] ml-2">HackOn S6</span>
      </div>
      <div className="h-4 w-px bg-[#1E1E2A]" />
      <p className="flex-1 text-center text-[11px] text-[#555]">Arjun's Home · {time}</p>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[10px] px-2 py-1 rounded-full border border-[#4ADE8030] text-[#4ADE80]" style={{ background: '#0A1A0A' }}>
          ⚡ {instantCount} instant
        </span>
        <span className="text-[10px] px-2 py-1 rounded-full border border-[#4ADE8020] text-[#4ADE80]" style={{ background: '#0A1A0A' }}>
          💰 ${costSaved.toFixed(4)} saved
        </span>
        <span className="text-[10px] px-2 py-1 rounded-full border border-[#4ADE8030] text-[#4ADE80]" style={{ background: '#0A1A0A' }}>
          🟢 AI Active
        </span>
      </div>
    </div>
  );
}

// ── Onboarding banner ────────────────────────────────────────────────────────

function OnboardingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="shrink-0 flex items-center gap-3 px-4 py-2 border-b border-[#1A1A2A]" style={{ background: '#090E1A' }}>
      <span className="text-base shrink-0">🇮🇳</span>
      <p className="flex-1 text-[10px] text-[#888] leading-snug">
        <span className="text-white font-semibold">Alexa+ India</span> solves what standard Alexa can't: geysers, power cuts, water motors &amp; more.
        {' '}AI acts in <span className="text-[#4ADE80] font-semibold">8ms locally</span> — only calls cloud when it truly needs to.
        {' '}<span className="text-[#555]">Click any scenario on the right to see it in action.</span>
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-[10px] text-[#333] hover:text-[#777] px-2 py-1 border border-[#1A1A2A] rounded-lg transition-colors"
      >
        Got it ×
      </button>
    </div>
  );
}

// ── AI Decision Overlay ──────────────────────────────────────────────────────

function AiDecisionOverlay({ overlay, onDismiss }: { overlay: OverlayInfo; onDismiss: () => void }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const isDone = !overlay.steps || visibleSteps >= overlay.steps.length;
  const isT3 = overlay.tier === 'T3';
  const borderColor = isT3 ? '#F59E0B' : '#4ADE80';

  useEffect(() => {
    setVisibleSteps(0);
    if (!overlay.steps) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setVisibleSteps(i);
      if (i >= (overlay.steps?.length ?? 0)) clearInterval(id);
    }, 400);
    return () => clearInterval(id);
  }, [overlay.scenarioId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (overlay.tier !== 'T0') return;
    const id = setTimeout(onDismiss, 5000);
    return () => clearTimeout(id);
  }, [overlay.scenarioId, overlay.tier, onDismiss]);

  useEffect(() => {
    if (!isDone || overlay.tier !== 'T3') return;
    const id = setTimeout(onDismiss, 3000);
    return () => clearTimeout(id);
  }, [isDone, overlay.tier, onDismiss]);

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-72 rounded-2xl border shadow-2xl"
      style={{ background: isT3 ? '#0D0800' : '#000D07', borderColor, boxShadow: `0 0 40px ${borderColor}33` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{overlay.emoji}</span>
            <div>
              <p className="text-sm font-bold text-white leading-tight">{overlay.overlayTitle}</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: borderColor }}>
                {isT3 ? '🤔 Deep AI' : '⚡ Instant'} · {overlay.ms} · {overlay.cost === '$0.00' ? 'No cloud cost' : overlay.cost}
              </p>
            </div>
          </div>
          <button onClick={onDismiss} className="text-[#333] hover:text-[#777] text-xs ml-2 shrink-0">✕</button>
        </div>

        {overlay.steps ? (
          <div>
            <p className="text-[9px] text-[#555] mb-2">{overlay.overlayDetail}</p>
            <div className="space-y-1.5">
              {overlay.steps.slice(0, visibleSteps).map((step, i) => (
                <p key={i} className="text-[11px] font-mono" style={{ color: step.startsWith('✓') ? '#4ADE80' : '#F59E0B' }}>
                  {step}
                </p>
              ))}
            </div>
            {!isDone && (
              <div className="flex items-center gap-1.5 mt-2.5">
                <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#F59E0B', borderTopColor: 'transparent' }} />
                <span className="text-[9px] text-[#F59E0B]">Alexa is thinking...</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-[11px] text-[#AAA] leading-snug">{overlay.overlayDetail}</p>
        )}

        {isDone && (
          <p className="text-[9px] text-[#333] mt-3 border-t border-[#151510] pt-2">
            ✓ Your home stayed safe — auto-closes shortly
          </p>
        )}
      </div>
    </div>
  );
}

// ── Compact Alexa View (left column) ─────────────────────────────────────────

const QUICK_SCENES = [
  { emoji: '🌅', label: 'Morning', regime: 'normal'   },
  { emoji: '🎬', label: 'Movie',   regime: 'festival' },
  { emoji: '😴', label: 'Sleep',   regime: 'sleep'    },
  { emoji: '🏠', label: 'Away',    regime: 'away'     },
];

function CompactAlexaView({ events, onOpenFullApp }: { events: LiveEvent[]; onOpenFullApp: () => void }) {
  const addNotification = useAppStore(s => s.addNotification);
  const [tapped, setTapped] = useState(false);

  const handleScene = async (regime: string) => {
    try {
      await backendApi.forceRegime(undefined, regime);
      const s = QUICK_SCENES.find(x => x.regime === regime);
      addNotification(`${s?.emoji} ${s?.label} mode activated`, 'success');
    } catch {
      addNotification('Backend offline?', 'warning');
    }
  };

  const handleRingTap = () => {
    setTapped(true);
    setTimeout(() => setTapped(false), 600);
    onOpenFullApp();
  };

  const recentEvents = events.slice(0, 4);

  return (
    <div className="flex flex-col h-full" style={{ background: '#08080E' }}>
      {/* Alexa ring */}
      <div className="flex flex-col items-center py-6 border-b border-[#1A1A2A]">
        <button
          onClick={handleRingTap}
          className="relative w-24 h-24 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ background: 'radial-gradient(circle, #001A2A 60%, #000D18 100%)' }}
        >
          <div
            className={`absolute inset-0 rounded-full border-4 transition-opacity ${tapped ? 'animate-ping opacity-70' : 'opacity-60'}`}
            style={{ borderColor: '#00A8E0' }}
          />
          <div className="absolute inset-2 rounded-full border-2 opacity-40" style={{ borderColor: '#0080B0' }} />
          <div
            className="absolute inset-3 rounded-full animate-pulse"
            style={{ background: 'radial-gradient(circle, #00A8E025 0%, transparent 70%)' }}
          />
          <div className="w-4 h-4 rounded-full" style={{ background: '#00A8E0', boxShadow: '0 0 14px #00A8E0' }} />
        </button>
        <p className="text-[10px] text-[#444] mt-2.5">Tap to speak to Alexa</p>
      </div>

      {/* AI action log */}
      <div className="flex-1 flex flex-col px-3 py-3 border-b border-[#1A1A2A] min-h-0">
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest">AI just did this</p>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-[9px] text-[#252535] text-center leading-snug py-4">
            Try a scenario →<br />AI actions appear here
          </p>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {recentEvents.map(e => (
              <div key={e.id} className="flex items-start gap-1.5">
                <span className="text-[11px] shrink-0 mt-0.5">{e.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#BBB] leading-snug truncate">{e.description}</p>
                  <p className="text-[8px] text-[#333]">
                    {e.time} · {e.tier === 'T0' || e.tier === 'T1' ? '⚡ instant' : '🤔 deep AI'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick scenes */}
      <div className="px-3 py-3">
        <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-2">Quick scenes</p>
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_SCENES.map(s => (
            <button
              key={s.regime}
              onClick={() => handleScene(s.regime)}
              className="flex flex-col items-center py-2 rounded-xl border border-[#1E1E2A] bg-[#0C0C14] hover:border-[#00A8E040] hover:bg-[#000D18] transition-all"
            >
              <span className="text-base">{s.emoji}</span>
              <span className="text-[9px] text-[#555] mt-0.5">{s.label}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onOpenFullApp}
          className="w-full mt-2 py-1.5 text-[9px] text-[#333] hover:text-[#00A8E0] border border-[#141420] hover:border-[#00A8E025] rounded-lg transition-colors"
        >
          Open Full Alexa App →
        </button>
      </div>
    </div>
  );
}

// ── Scenario panel (right column) ────────────────────────────────────────────

function ScenarioPanel({ onRun, onOverlay }: {
  onRun: (tier: string, desc: string) => void;
  onOverlay: (info: OverlayInfo) => void;
}) {
  const [running, setRunning] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; ok: boolean } | null>(null);
  const addNotification = useAppStore(s => s.addNotification);

  const run = async (s: Scenario) => {
    if (running) return;
    setRunning(s.id);
    onOverlay({
      scenarioId: s.id, tier: s.tier, emoji: s.emoji,
      ms: s.ms, cost: s.cost,
      overlayTitle: s.overlayTitle, overlayDetail: s.overlayDetail,
      steps: s.steps,
    });
    try {
      const data = await s.fn() as { message?: string };
      const msg = data.message ?? `${s.title} triggered`;
      addNotification(`${s.emoji} ${msg}`, 'success');
      onRun(s.tier, `${s.title}: ${msg.substring(0, 60)}`);
      setFlash({ id: s.id, ok: true });
    } catch {
      addNotification(`${s.emoji} ${s.title} — backend offline?`, 'warning');
      setFlash({ id: s.id, ok: false });
    } finally {
      setRunning(null);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  return (
    <div className="px-3 py-3 border-b border-[#1A1A2A]">
      <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-2.5">Try these scenarios</p>
      <div className="space-y-1.5">
        {SCENARIOS.map(s => {
          const isRunning = running === s.id;
          const flashState = flash?.id === s.id;
          const isInstant = s.tier === 'T0';
          return (
            <button
              key={s.id}
              onClick={() => run(s)}
              disabled={!!running}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all duration-150 disabled:opacity-50 ${
                flashState
                  ? (flash!.ok ? 'border-[#4ADE80] bg-[#0A2010]' : 'border-red-700 bg-[#1A0808]')
                  : isRunning
                  ? 'border-alexa-blue bg-[#001A2A]'
                  : 'border-[#1E1E2A] bg-[#0C0C14] hover:border-[#2A2A3A] hover:bg-[#0E0E18]'
              }`}
            >
              <span className="text-base shrink-0">{isRunning ? '⟳' : s.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-white leading-tight truncate">{s.title}</p>
                <p className="text-[9px] text-[#444] truncate">{s.desc}</p>
              </div>
              <span
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                  isInstant ? 'text-[#4ADE80] bg-[#4ADE8015]' : 'text-[#F59E0B] bg-[#F59E0B15]'
                }`}
              >
                {isInstant ? '⚡ Instant' : '🤔 Deep AI'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Home mode panel ──────────────────────────────────────────────────────────

const HOME_MODES = [
  { id: 'normal',   emoji: '🌅', label: 'Normal',  desc: 'Standard home automation rules are active' },
  { id: 'festival', emoji: '🎉', label: 'Festival', desc: 'Party lights, louder alerts, festive mode' },
  { id: 'guest',    emoji: '👥', label: 'Guests',   desc: 'Privacy mode — AI is polite and discreet' },
  { id: 'sleep',    emoji: '😴', label: 'Sleep',    desc: 'Quiet mode — only safety alerts get through' },
  { id: 'away',     emoji: '🏠', label: 'Away',     desc: 'Security + energy save — nobody is home' },
];

function HomeModePanel() {
  const [regime, setRegime] = useState<RegimeState | null>(null);
  const [busy, setBusy] = useState(false);
  const addNotification = useAppStore(s => s.addNotification);

  useEffect(() => { backendApi.getRegime().then(setRegime).catch(() => {}); }, []);

  const force = async (id: string) => {
    setBusy(true);
    try {
      await backendApi.forceRegime(undefined, id);
      const updated = await backendApi.getRegime();
      setRegime(updated);
      const mode = HOME_MODES.find(m => m.id === id);
      addNotification(`${mode?.emoji} Home mode → ${mode?.label}`, 'success');
    } catch {
      addNotification('Mode change failed — backend offline?', 'warning');
    } finally { setBusy(false); }
  };

  const currentMode = HOME_MODES.find(m => m.id === regime?.current_regime);

  return (
    <div className="px-3 py-3 border-b border-[#1A1A2A]">
      <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-2">Home mode</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {HOME_MODES.map(m => {
          const active = regime?.current_regime === m.id;
          return (
            <button
              key={m.id}
              onClick={() => force(m.id)}
              disabled={busy}
              title={m.desc}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-medium border transition-all disabled:opacity-40 ${
                active
                  ? 'border-alexa-blue bg-alexa-accent text-alexa-ring'
                  : 'border-[#1E1E2A] bg-[#0C0C14] text-[#555] hover:text-white hover:border-[#2A2A3A]'
              }`}
            >
              {m.emoji} {m.label}
            </button>
          );
        })}
      </div>
      {currentMode && (
        <p className="text-[9px] text-[#444] leading-snug">{currentMode.desc}</p>
      )}
    </div>
  );
}

// ── AI predictions panel ─────────────────────────────────────────────────────

function AiComingUpPanel() {
  const { anticipations, loading } = useAnticipations();

  return (
    <div className="px-3 py-3 border-b border-[#1A1A2A]">
      <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-2">What AI predicts next</p>
      {loading ? (
        <p className="text-[9px] text-[#333]">Loading...</p>
      ) : anticipations.length === 0 ? (
        <p className="text-[9px] text-[#252535] leading-snug">
          Run AI Learning first — predictions appear once the AI knows your patterns
        </p>
      ) : (
        <div className="space-y-2">
          {anticipations.slice(0, 3).map((a, i) => (
            <div key={i} className="p-2 rounded-lg bg-[#0A0A12] border border-[#181828]">
              <p className="text-[10px] text-white leading-snug">AI expects: {a.action}</p>
              <p className="text-[9px] text-[#444] mt-0.5">
                {a.trigger_window ? `${a.trigger_window} · ` : ''}
                {Math.round(a.confidence * 100)}% confident
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AI learning panel ────────────────────────────────────────────────────────

function AiLearningPanel() {
  const [rules, setRules] = useState<T0Rule[]>([]);
  const [proposed, setProposed] = useState<ProposedRule[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [mining, setMining] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const addNotification = useAppStore(s => s.addNotification);

  const loadRules = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([backendApi.listT0Rules(), backendApi.listProposedRules()]);
      setRules(r.rules ?? []);
      setProposed(p.proposed ?? []);
    } catch {}
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  const seed = async () => {
    setSeeding(true);
    try {
      const data = await homeApi.seedLearningHistory();
      addNotification(`📊 Loaded ${data.days_seeded} days of home history`, 'success');
      setSeeded(true);
      await loadRules();
    } catch {
      addNotification('Backend offline?', 'warning');
    } finally { setSeeding(false); }
  };

  const mine = async () => {
    setMining(true);
    try {
      const data = await backendApi.runRuleMiner() as { proposed?: number };
      addNotification(`🔍 Found ${data.proposed ?? 0} pattern(s) in your home history`, 'success');
      await loadRules();
    } catch {
      addNotification('Backend offline?', 'warning');
    } finally { setMining(false); }
  };

  const confirm = async (id: string) => {
    try {
      await backendApi.confirmRule(undefined, id);
      addNotification('✅ Pattern added — now fires in 8ms, no cloud', 'success');
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
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-bold text-[#3A3A5A] uppercase tracking-widest">AI learning</p>
        {activeCount > 0 && (
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-[#4ADE80] bg-[#4ADE8015]">
            {activeCount} instant rules
          </span>
        )}
      </div>

      <button
        onClick={seed}
        disabled={seeding || mining}
        className={`w-full py-2 mb-2 rounded-lg text-[10px] font-semibold border transition-colors disabled:opacity-40 ${
          seeded
            ? 'border-[#4ADE8040] text-[#4ADE80] bg-[#0A2010]'
            : 'border-[#1E1E2A] text-[#666] hover:text-white hover:border-[#2A2A3A] bg-[#0C0C14]'
        }`}
      >
        {seeding ? '📊 Loading history...' : seeded ? '✓ Step 1: Home history loaded' : '📊 Step 1: Load a sample week'}
      </button>

      {seeded && (
        <button
          onClick={mine}
          disabled={mining || seeding}
          className="w-full py-2 mb-2 rounded-lg text-[10px] font-semibold border border-[#1E1E2A] text-[#666] hover:text-white hover:border-[#2A2A3A] bg-[#0C0C14] transition-colors disabled:opacity-40"
        >
          {mining ? '🔍 Finding patterns...' : '🔍 Step 2: Find patterns'}
        </button>
      )}

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] text-[#F59E0B] font-semibold">Step 3 · AI found {pending.length} pattern(s):</p>
          {pending.slice(0, 3).map(p => (
            <div key={p.proposal_id} className="p-2.5 rounded-xl bg-[#0A0A12] border border-[#F59E0B1A]">
              <p className="text-[10px] text-white leading-snug mb-1">{p.description}</p>
              {p.confidence != null && (
                <p className="text-[9px] text-[#444] mb-2">{Math.round(p.confidence * 100)}% confident · based on your history</p>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => confirm(p.proposal_id)}
                  className="flex-1 py-1 rounded text-[9px] font-bold bg-[#0A2010] border border-[#4ADE8030] text-[#4ADE80] hover:bg-[#0E2A16] transition-colors"
                >
                  ✓ Add to instant rules
                </button>
                <button
                  onClick={() => reject(p.proposal_id)}
                  className="flex-1 py-1 rounded text-[9px] font-bold bg-[#1A0A0A] border border-[#F8717125] text-[#F87171] hover:bg-[#240D0D] transition-colors"
                >
                  ✗ Skip
                </button>
              </div>
            </div>
          ))}
          <p className="text-[8px] text-[#252535] text-center leading-snug pt-1">
            Once added → fires instantly next time · No cloud · $0.00
          </p>
        </div>
      )}

      {pending.length === 0 && activeCount === 0 && !seeded && (
        <p className="text-[9px] text-[#252535] text-center leading-snug py-1">
          AI learns your patterns and turns them into instant reactions
        </p>
      )}
    </div>
  );
}

// ── Analytics view components (kept from original) ────────────────────────────

function TierCascadePanel({ tierCounts }: { tierCounts: TierCounts }) {
  const total = tierCounts.T0 + tierCounts.T1 + tierCounts.T3 || 1;
  const tiers = [
    { key: 'T0' as const, label: 'Instant (local rules)',  color: '#4ADE80', desc: 'Hardcoded local rules',            detail: '<10ms · $0.00 · no model inference' },
    { key: 'T1' as const, label: 'Quick (on-device AI)',   color: '#60A5FA', desc: 'commandProcessor.ts — on-device',  detail: '<100ms · $0.00 · intent regex engine' },
    { key: 'T3' as const, label: 'Deep AI (cloud)',        color: '#F59E0B', desc: 'Bedrock Nova Micro + tool use',    detail: '0.5–3s · ~$0.00004 · 4-agent orchestration' },
  ];
  return (
    <div className="p-4 border-b border-[#1A1A2A]">
      <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest mb-4">How AI decides</p>
      <div className="space-y-4">
        {tiers.map(t => {
          const pct = Math.round((tierCounts[t.key] / total) * 100);
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color: t.color, background: t.color + '18' }}>{t.key}</span>
                  <span className="text-xs font-semibold text-white">{t.label}</span>
                  <span className="text-[10px] text-[#444]">{t.desc}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: t.color }}>{pct}%</span>
                  <span className="text-[10px] text-[#333]">({tierCounts[t.key]} calls)</span>
                </div>
              </div>
              <div className="h-3 bg-[#111118] rounded-full overflow-hidden border border-[#1A1A2A]">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}66, ${t.color})` }} />
              </div>
              <p className="text-[9px] text-[#2A2A3A] mt-1">{t.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventFeedPanel({ events }: { events: LiveEvent[] }) {
  return (
    <div className="p-4 border-b border-[#1A1A2A]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest">AI Action Log</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-[9px] text-[#4ADE80]">Live</span>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="py-5 text-center border border-dashed border-[#1E1E2A] rounded-xl">
          <p className="text-xs text-[#333]">No events yet</p>
          <p className="text-[9px] text-[#252535] mt-1">Run a scenario to see the AI in action</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
          {events.map(e => (
            <div key={e.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#0A0A12] border border-[#18182A]">
              <span className="text-sm shrink-0">{e.icon}</span>
              <p className="flex-1 text-xs text-[#BBB] truncate">{e.description}</p>
              <span className="text-[9px] text-[#333] shrink-0">{e.time}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{ color: tierColor(e.tier), background: tierColor(e.tier) + '1A' }}>{e.tier}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomStatusGrid() {
  const { twinData } = useDigitalTwin();
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest">Room Status</p>
        {twinData && <span className="text-[9px] text-[#333]">{twinData.current_mode} mode</span>}
      </div>
      {!twinData?.rooms?.length ? (
        <p className="text-xs text-[#252535]">Backend offline — start backend to see live room status</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {twinData.rooms.map(room => {
            const pct = room.device_count > 0 ? Math.round((room.on_count / room.device_count) * 100) : 0;
            return (
              <div key={room.id} className="p-3 rounded-xl border border-[#1A1A2A] bg-[#0A0A12]">
                <p className="text-xs font-semibold text-white truncate mb-1">{room.name}</p>
                <div className="flex items-center justify-between text-[10px] mb-2">
                  <span className="text-[#444]">{room.on_count}/{room.device_count} on</span>
                  <span style={{ color: pct > 0 ? '#4ADE80' : '#444' }}>{pct}%</span>
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

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function DemoDashboard() {
  useSimulation(2000);
  const { subscribe } = useWebSocket();

  const [view, setView] = useState<'3d' | 'analytics'>('3d');
  const [tierCounts, setTierCounts] = useState<TierCounts>({ T0: 8, T1: 3, T3: 1 });
  const [costSaved, setCostSaved] = useState(0.00044);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [showBanner, setShowBanner] = useState(true);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const [showFullAlexa, setShowFullAlexa] = useState(false);

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

  const handleScenarioRun = useCallback((tier: string, description: string) => {
    const k = tier as keyof TierCounts;
    setTierCounts(prev => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }));
    if (tier !== 'T3') setCostSaved(prev => prev + 0.00004);
    setEvents(prev => [
      { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), tier, description, icon: tier === 'T3' ? '🤖' : '⚡' },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const handleOverlay = useCallback((info: OverlayInfo) => setOverlay(info), []);
  const dismissOverlay = useCallback(() => setOverlay(null), []);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: '#08080E' }}>
      {showBanner && <OnboardingBanner onDismiss={() => setShowBanner(false)} />}
      <DemoHeader tierCounts={tierCounts} costSaved={costSaved} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Compact Alexa (220px) */}
        <div className="w-[220px] shrink-0 border-r border-[#1A1A2A] overflow-y-auto">
          <CompactAlexaView events={events} onOpenFullApp={() => setShowFullAlexa(true)} />
        </div>

        {/* Center: 3D always visible, or Analytics deep-dive */}
        <div className="flex-1 overflow-hidden relative">
          {view === '3d' ? (
            <div className="w-full h-full relative" style={{ background: '#080810' }}>
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
              {overlay && <AiDecisionOverlay overlay={overlay} onDismiss={dismissOverlay} />}
              <button
                onClick={() => setView('analytics')}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black bg-opacity-60 border border-[#252535] text-[10px] text-[#666] hover:text-white hover:border-[#383848] transition-colors backdrop-blur-sm"
              >
                📊 Analytics
              </button>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto" style={{ background: '#0C0C14' }}>
              <div className="px-4 py-3 border-b border-[#1A1A2A] flex items-center gap-3 sticky top-0 z-10" style={{ background: '#0C0C14' }}>
                <button
                  onClick={() => setView('3d')}
                  className="flex items-center gap-1.5 text-[10px] text-[#555] hover:text-white transition-colors"
                >
                  ← Back to Home
                </button>
                <div className="h-3 w-px bg-[#1E1E2A]" />
                <p className="text-[10px] font-bold text-[#3A3A5A] uppercase tracking-widest">Technical Analytics</p>
                <p className="text-[9px] text-[#252535] ml-auto">For Amazon SDE judges</p>
              </div>
              <TierCascadePanel tierCounts={tierCounts} />
              <EventFeedPanel events={events} />
              <RoomStatusGrid />
            </div>
          )}
        </div>

        {/* Right: Scenarios + AI panels (260px) */}
        <div className="w-[260px] shrink-0 border-l border-[#1A1A2A] flex flex-col overflow-y-auto" style={{ background: '#08080E' }}>
          <ScenarioPanel onRun={handleScenarioRun} onOverlay={handleOverlay} />
          <HomeModePanel />
          <AiComingUpPanel />
          <AiLearningPanel />
        </div>
      </div>

      {/* Full Alexa App modal */}
      {showFullAlexa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)' }}
          onClick={() => setShowFullAlexa(false)}
        >
          <div
            className="w-80 h-[640px] rounded-2xl overflow-hidden relative border border-[#252535] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullAlexa(false)}
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full bg-[#1A1A2A] border border-[#2A2A3A] text-[#888] hover:text-white text-[11px] flex items-center justify-center transition-colors"
            >
              ✕
            </button>
            <AlexaAppSimView />
          </div>
        </div>
      )}
    </div>
  );
}
