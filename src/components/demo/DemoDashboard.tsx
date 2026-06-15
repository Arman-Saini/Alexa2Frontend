import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { AlexaAppSimView } from '../panels/AlexaAppSimView';
import { useDigitalTwin, useAnticipations } from '../../hooks/useBackendApi';
import { backendApi, homeApi } from '../../api';
import type { RegimeState, T0Rule, ProposedRule } from '../../api';
import { useAppStore } from '../../store/store';
import { useSimulation } from '../../hooks/useSimulation';
import { useWebSocket } from '../../hooks/useWebSocket';
import { backendState, onBackendResolved } from '../../config/backendState';
import type { BackendSource } from '../../config/backendState';

const DigitalTwinCanvas = lazy(() =>
  import('../canvas/DigitalTwinCanvas').then((m) => ({ default: m.DigitalTwinCanvas }))
);

// ── Design tokens ─────────────────────────────────────────────────────────────
// Soft dark palette — not pure black, not pure white

const C = {
  bg:           '#090A13',
  surface:      '#0C0E1C',
  card:         '#101326',
  cardHover:    '#151829',
  border:       '#1B1E36',
  borderHover:  '#252845',
  text:         '#DDE0EF',    // primary text — soft white
  text2:        '#6A7490',    // secondary
  text3:        '#30344C',    // muted
  cyan:         '#00A8E0',
  cyanDim:      '#003855',
  cyanBg:       '#001A28',
  green:        '#22D3A4',
  greenDim:     '#0F3028',
  amber:        '#F59E0B',
  amberDim:     '#2C1E05',
  red:          '#E87272',
  redDim:       '#2C1010',
} as const;

// ── Types ──────────────────────────────────────────────────────────────────────

interface TierCounts { T0: number; T1: number; T3: number; }
interface LiveEvent { id: string; time: string; tier: string; description: string; }
interface OverlayInfo {
  scenarioId: string;
  tier: 'T0' | 'T3';
  tag: string;
  ms: string;
  cost: string;
  overlayTitle: string;
  overlayDetail: string;
  steps?: string[];
}

interface Scenario {
  id: string;
  tag: string;
  category: string;
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

// ── Scenarios ─────────────────────────────────────────────────────────────────

const SCENARIOS: Scenario[] = [
  {
    id: 'geyser',
    tag: 'SAFETY', category: 'Local Rule',
    title: 'Geyser Left On',
    desc: 'AI turns it off — no cloud needed',
    tier: 'T0', ms: '8ms', cost: '$0.00',
    overlayTitle: 'Geyser turned off',
    overlayDetail: 'Used a saved home pattern — no internet needed',
    fn: () => backendApi.simulateGeyser(),
  },
  {
    id: 'study',
    tag: 'ROUTINE', category: 'Local Rule',
    title: 'Evening Tuition',
    desc: 'AI quiets the house at 6 PM',
    tier: 'T0', ms: '8ms', cost: '$0.00',
    overlayTitle: 'Study mode activated',
    overlayDetail: 'Lights on, TV muted — pattern matched in 8ms',
    fn: () => backendApi.simulateStudyMode(),
  },
  {
    id: 'night',
    tag: 'SAFETY', category: 'Local Rule',
    title: 'Bedtime Check',
    desc: 'AI secures LPG, TV, motor',
    tier: 'T0', ms: '8ms', cost: '$0.00',
    overlayTitle: 'Home secured for sleep',
    overlayDetail: 'LPG off, TV off, motor off — instant local check',
    fn: () => backendApi.simulateNightSafety(),
  },
  {
    id: 'power',
    tag: 'SAFETY', category: 'Local Rule',
    title: 'Power Outage',
    desc: 'AI switches to inverter mode',
    tier: 'T0', ms: '8ms', cost: '$0.00',
    overlayTitle: 'Switched to inverter mode',
    overlayDetail: 'AC load shed, critical devices kept on — <10ms',
    fn: () => backendApi.simulatePowerCut(),
  },
  {
    id: 'motor',
    tag: 'SAFETY', category: 'Local Rule',
    title: 'Pump Overrun',
    desc: 'AI stops the pump automatically',
    tier: 'T0', ms: '8ms', cost: '$0.00',
    overlayTitle: 'Water pump stopped',
    overlayDetail: 'Dead-man timer triggered — overflow prevented',
    fn: () => backendApi.simulateMotorSafety(),
  },
  {
    id: 'inventory',
    tag: 'CLOUD', category: 'Cloud AI',
    title: 'Milk Running Low',
    desc: 'AI orders from Amazon Now',
    tier: 'T3', ms: '1.2s', cost: '$0.00004',
    overlayTitle: 'Milk ordered on Amazon Now',
    overlayDetail: "Alexa's 4-agent cloud AI reasoned:",
    steps: [
      '⟳ Checking your inventory',
      '✓ Milk: 0.2L remaining',
      '⟳ Searching Amazon Now',
      '✓ Best price: ₹58 for 2L',
      '✓ Order placed! Delivery in 2 hours',
    ],
    fn: () => backendApi.simulateInventoryDrop(),
  },
  {
    id: 'sound',
    tag: 'CLOUD', category: 'Cloud AI',
    title: 'Strange Sound',
    desc: 'AI identifies what it heard',
    tier: 'T3', ms: '1.5s', cost: '$0.00004',
    overlayTitle: 'Unknown sound identified',
    overlayDetail: "Alexa's audio AI classified the cluster:",
    steps: [
      '⟳ Analysing sound cluster',
      '✓ Frequency: 800–2000 Hz pattern',
      '⟳ Matching against known sounds',
      '✓ Identified: pressure cooker whistle',
      '✓ Alert sent — cooker overdue',
    ],
    fn: () => backendApi.simulateUnknownSound(),
  },
  {
    id: 'voice',
    tag: 'CLOUD', category: 'Cloud AI',
    title: 'Complex Request',
    desc: 'AI thinks deeper for this one',
    tier: 'T3', ms: '2.1s', cost: '$0.00004',
    overlayTitle: 'Complex voice request handled',
    overlayDetail: 'Bedrock Nova Micro with tool use:',
    steps: [
      '⟳ Parsing multi-step intent',
      '✓ Intent: fan + thermostat change',
      '⟳ Resolving device targets',
      '✓ Living room fan + main thermostat',
      '✓ Both commands executed',
    ],
    fn: () => backendApi.simulateVoiceCommand(undefined, 'turn on the living room fan and set thermostat to 24'),
  },
];

// ── Clock ──────────────────────────────────────────────────────────────────────

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

// ── Header ─────────────────────────────────────────────────────────────────────

const BACKEND_LABEL: Record<BackendSource, { label: string; dotColor: string; bg: string; border: string; textColor: string }> = {
  detecting: { label: 'Connecting',  dotColor: '#888833',  bg: C.card,    border: C.border,  textColor: '#AAAA44' },
  cloud:     { label: 'Cloud AI',    dotColor: C.green,    bg: C.greenDim,border: '#1A3828',  textColor: C.green  },
  local:     { label: 'Local AI',    dotColor: C.cyan,     bg: C.cyanBg,  border: C.cyanDim, textColor: C.cyan   },
  offline:   { label: 'Offline',     dotColor: C.red,      bg: C.redDim,  border: '#3A1A1A',  textColor: C.red   },
};

function DemoHeader({ tierCounts, costSaved, onTour }: { tierCounts: TierCounts; costSaved: number; onTour: () => void }) {
  const time = useCurrentTime();
  const instantCount = tierCounts.T0 + tierCounts.T1;
  const [backendSource, setBackendSource] = useState<BackendSource>(backendState.source);

  useEffect(() => {
    setBackendSource(backendState.source);
    onBackendResolved(() => setBackendSource(backendState.source));
  }, []);

  const bk = BACKEND_LABEL[backendSource];

  return (
    <div
      className="shrink-0 flex items-center gap-4 px-5 border-b"
      style={{ background: C.surface, borderColor: C.border, height: 52 }}
    >
      {/* Brand */}
      <div className="shrink-0 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` }} />
        <span className="text-sm font-bold" style={{ color: C.text }}>Alexa<span style={{ color: C.cyan }}>+ India</span></span>
        <span
          className="text-[9px] font-semibold px-1.5 py-0.5 rounded border ml-1"
          style={{ color: C.text3, borderColor: C.border, background: C.card }}
        >
          HackOn S6
        </span>
      </div>

      <div className="w-px h-5 shrink-0" style={{ background: C.border }} />

      {/* Center label */}
      <p className="flex-1 text-center text-xs" style={{ color: C.text3 }}>
        Arjun's Home · {time}
      </p>

      {/* Status chips */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Backend status */}
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
          style={{ color: bk.textColor, background: bk.bg, borderColor: bk.border }}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: bk.dotColor }} />
          {bk.label}
        </div>

        {/* Instant count */}
        <div
          className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
          style={{ color: C.green, background: C.greenDim, borderColor: '#1A3828' }}
        >
          <span className="font-bold">{instantCount}</span>
          <span style={{ color: C.text2 }}>instant</span>
        </div>

        {/* Cost saved */}
        <div
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border"
          style={{ color: C.text2, background: C.card, borderColor: C.border }}
        >
          <span style={{ color: C.green }}>${costSaved.toFixed(4)}</span>
          <span>saved</span>
        </div>

        <button
          onClick={onTour}
          className="text-xs px-2.5 py-1 rounded-full border transition-colors"
          style={{ color: C.text3, borderColor: C.border, background: C.card }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text3; }}
          title="Guided tour"
        >
          Tour
        </button>
      </div>
    </div>
  );
}

// ── Demo Tour ──────────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Alexa+ India',
    body: "A live demo of an AI that solves problems standard Alexa can't — geysers left running, power cuts, water motor overflows, and more. It acts in 8ms locally, only calling the cloud when it truly needs to.",
    highlight: null,
    tip: 'Click Next to take a 60-second tour',
  },
  {
    id: 'home3d',
    title: 'Your Live 3D Home',
    body: "The center panel shows Arjun's home as a live 3D model. Devices glow when on, dim when off. Click any room to zoom in and see what's running inside.",
    highlight: 'center',
    tip: 'After this tour, click any room to explore it.',
  },
  {
    id: 'scenarios',
    title: 'Trigger an AI Scenario',
    body: "The right panel has 8 real scenarios. Click \"Geyser Left On\" to see the AI act instantly — no cloud, no internet, just a saved pattern firing in 8ms. Then try \"Milk Running Low\" to see the cloud AI think through 5 steps.",
    highlight: 'right',
    tip: 'Instant = local rule  ·  Cloud AI = Bedrock reasoning',
  },
  {
    id: 'overlay',
    title: 'The AI Decision Card',
    body: "After clicking a scenario, a card floats over the 3D home showing exactly what the AI did, how fast it responded, and what it cost. For Cloud AI scenarios, watch the steps animate — this is the 4-agent reasoning chain.",
    highlight: 'center',
    tip: 'Try a scenario now, then come back and click Next.',
  },
  {
    id: 'voice',
    title: 'Speak to Alexa',
    body: "Tap the Alexa ring on the left to speak. Try: \"Turn on the lights\" or \"Set the thermostat to 24 degrees\". When the cloud backend is connected, your voice routes through the full T0→T1→T3 cascade automatically.",
    highlight: 'left',
    tip: 'The status chip next to the ring shows Cloud or Local — auto-detected.',
  },
  {
    id: 'learning',
    title: 'AI That Gets Smarter',
    body: "Scroll down the right panel to \"AI Learning\". Click Step 1 to load a week of home history, then Step 2 to find patterns. The AI will suggest rules like \"Heat geyser at 6:30 AM daily\" — confirm one and it fires instantly next time.",
    highlight: 'right',
    tip: 'This is the loop that makes the system faster over time.',
  },
  {
    id: 'analytics',
    title: 'Technical Analytics',
    body: "For a deeper look, click \"Analytics\" in the top-right of the 3D panel. You'll see the tier cascade chart, the live event log, and room status. This is the view for technical judges.",
    highlight: 'center',
    tip: "You're ready — close this tour and explore the demo.",
  },
];

function DemoTour({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="pointer-events-auto absolute bottom-6 left-1/2 -translate-x-1/2 w-[500px] max-w-[92vw]">
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            background: C.surface,
            borderColor: C.borderHover,
            boxShadow: `0 0 80px ${C.cyan}18, 0 24px 64px rgba(0,0,0,0.6)`,
          }}
        >
          {/* Progress bar */}
          <div className="h-0.5" style={{ background: C.border }}>
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%`, background: C.cyan }}
            />
          </div>

          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: C.cyan }}>
                  Step {step + 1} of {TOUR_STEPS.length}
                </p>
                <h3 className="text-sm font-bold" style={{ color: C.text }}>{current.title}</h3>
              </div>
              <button
                onClick={onClose}
                className="text-xs px-2.5 py-1 rounded-lg border ml-4 transition-colors shrink-0"
                style={{ color: C.text3, borderColor: C.border }}
              >
                Skip
              </button>
            </div>

            <p className="text-xs leading-relaxed mb-4" style={{ color: C.text2 }}>{current.body}</p>

            <div
              className="rounded-lg px-3 py-2 mb-5 text-xs leading-snug border"
              style={{ color: C.cyan, background: C.cyanBg, borderColor: C.cyanDim }}
            >
              {current.tip}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="rounded-full transition-all"
                    style={{
                      width: i === step ? 20 : 8,
                      height: 8,
                      background: i === step ? C.cyan : C.border,
                    }}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(s => s - 1)}
                    className="px-3 py-1.5 text-xs border rounded-lg transition-colors"
                    style={{ color: C.text2, borderColor: C.border }}
                  >
                    Back
                  </button>
                )}
                {isLast ? (
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ background: C.cyan }}
                  >
                    Start exploring →
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(s => s + 1)}
                    className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg"
                    style={{ background: C.cyan }}
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Column arrows */}
      {current.highlight === 'left' && (
        <div className="pointer-events-none fixed left-[110px] bottom-[230px] text-2xl animate-bounce" style={{ color: C.cyan, opacity: 0.8 }}>←</div>
      )}
      {current.highlight === 'right' && (
        <div className="pointer-events-none fixed right-[140px] bottom-[230px] text-2xl animate-bounce" style={{ color: C.cyan, opacity: 0.8 }}>→</div>
      )}
    </div>
  );
}

// ── Onboarding Banner ──────────────────────────────────────────────────────────

function OnboardingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b"
      style={{ background: C.cyanBg, borderColor: C.cyanDim }}
    >
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: C.cyan }} />
      <p className="flex-1 text-xs" style={{ color: C.text2 }}>
        <span className="font-semibold" style={{ color: C.text }}>Alexa+ India</span>
        {' '}solves what standard Alexa can't: geysers, power cuts, water motors and more.
        AI acts in <span className="font-semibold" style={{ color: C.green }}>8ms locally</span> — only calls cloud when truly needed.
        <span style={{ color: C.text3 }}> Click any scenario on the right to see it in action.</span>
      </p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-xs border rounded-lg px-2.5 py-1 transition-colors"
        style={{ color: C.text3, borderColor: C.border }}
      >
        Got it
      </button>
    </div>
  );
}

// ── AI Decision Overlay ────────────────────────────────────────────────────────

function AiDecisionOverlay({ overlay, onDismiss }: { overlay: OverlayInfo; onDismiss: () => void }) {
  const [visibleSteps, setVisibleSteps] = useState(0);
  const isDone = !overlay.steps || visibleSteps >= overlay.steps.length;
  const isT3 = overlay.tier === 'T3';
  const accentColor = isT3 ? C.amber : C.green;
  const accentBg    = isT3 ? C.amberDim : C.greenDim;

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
      className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-76 rounded-2xl border shadow-2xl"
      style={{
        background: C.surface,
        borderColor: accentColor,
        boxShadow: `0 0 40px ${accentColor}28`,
        minWidth: 290,
        maxWidth: 320,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded border shrink-0"
              style={{ color: accentColor, background: accentBg, borderColor: accentColor + '40' }}
            >
              {overlay.tag}
            </span>
            <div>
              <p className="text-sm font-bold leading-tight" style={{ color: C.text }}>{overlay.overlayTitle}</p>
              <p className="text-[10px] mt-0.5 font-semibold" style={{ color: accentColor }}>
                {isT3 ? 'Cloud AI' : 'Instant'} · {overlay.ms} · {overlay.cost === '$0.00' ? 'No cloud cost' : overlay.cost}
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-xs ml-2 shrink-0 transition-colors"
            style={{ color: C.text3 }}
          >
            ✕
          </button>
        </div>

        {overlay.steps ? (
          <div>
            <p className="text-[10px] mb-2" style={{ color: C.text3 }}>{overlay.overlayDetail}</p>
            <div className="space-y-1.5">
              {overlay.steps.slice(0, visibleSteps).map((step, i) => (
                <p key={i} className="text-xs font-mono" style={{ color: step.startsWith('✓') ? C.green : C.amber }}>
                  {step}
                </p>
              ))}
            </div>
            {!isDone && (
              <div className="flex items-center gap-2 mt-3">
                <div
                  className="w-3 h-3 rounded-full border-2 animate-spin"
                  style={{ borderColor: C.amber, borderTopColor: 'transparent' }}
                />
                <span className="text-[10px]" style={{ color: C.amber }}>Alexa is thinking...</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs leading-snug" style={{ color: C.text2 }}>{overlay.overlayDetail}</p>
        )}

        {isDone && (
          <p className="text-[10px] mt-3 pt-2 border-t" style={{ color: C.text3, borderColor: C.border }}>
            ✓ Your home stayed safe — closes shortly
          </p>
        )}
      </div>
    </div>
  );
}

// ── Compact Alexa View (left column) ──────────────────────────────────────────

const QUICK_SCENES = [
  { label: 'Morning', regime: 'normal'   },
  { label: 'Movie',   regime: 'festival' },
  { label: 'Sleep',   regime: 'sleep'    },
  { label: 'Away',    regime: 'away'     },
];

function CompactAlexaView({ events, onOpenFullApp }: { events: LiveEvent[]; onOpenFullApp: () => void }) {
  const addNotification = useAppStore(s => s.addNotification);
  const [tapped, setTapped] = useState(false);

  const handleScene = async (regime: string) => {
    try {
      await backendApi.forceRegime(undefined, regime);
      const s = QUICK_SCENES.find(x => x.regime === regime);
      addNotification(`${s?.label} mode activated`, 'success');
    } catch {
      addNotification('Backend offline', 'warning');
    }
  };

  const handleRingTap = () => {
    setTapped(true);
    setTimeout(() => setTapped(false), 600);
    onOpenFullApp();
  };

  const recentEvents = events.slice(0, 5);

  return (
    <div className="flex flex-col h-full" style={{ background: C.bg }}>

      {/* Alexa ring */}
      <div className="flex flex-col items-center py-7 border-b" style={{ borderColor: C.border }}>
        <button
          onClick={handleRingTap}
          className="relative w-28 h-28 rounded-full flex items-center justify-center transition-transform active:scale-95"
          style={{ background: `radial-gradient(circle, ${C.cyanBg} 60%, ${C.bg} 100%)` }}
        >
          {/* Outer ring */}
          <div
            className={`absolute inset-0 rounded-full border-4 transition-opacity ${tapped ? 'animate-ping opacity-70' : 'opacity-70'}`}
            style={{ borderColor: C.cyan }}
          />
          {/* Middle ring */}
          <div className="absolute inset-2 rounded-full border-2 opacity-30" style={{ borderColor: C.cyan }} />
          {/* Glow */}
          <div
            className="absolute inset-3 rounded-full animate-pulse"
            style={{ background: `radial-gradient(circle, ${C.cyan}20 0%, transparent 70%)` }}
          />
          {/* Center dot */}
          <div
            className="w-4 h-4 rounded-full"
            style={{ background: C.cyan, boxShadow: `0 0 16px ${C.cyan}` }}
          />
        </button>
        <p className="text-[11px] mt-3" style={{ color: C.text3 }}>Tap to speak to Alexa</p>
      </div>

      {/* AI action log */}
      <div className="flex-1 flex flex-col px-4 py-4 border-b min-h-0" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>AI just did this</p>
        </div>
        {recentEvents.length === 0 ? (
          <p className="text-xs text-center leading-snug py-6" style={{ color: C.text3 }}>
            Try a scenario<br />
            <span style={{ color: C.text3 }}>AI actions appear here</span>
          </p>
        ) : (
          <div className="space-y-2.5 overflow-y-auto">
            {recentEvents.map(e => (
              <div key={e.id} className="flex items-start gap-2">
                <span
                  className="text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                  style={{
                    color: e.tier === 'T3' ? C.amber : C.green,
                    background: e.tier === 'T3' ? C.amberDim : C.greenDim,
                  }}
                >
                  {e.tier}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-snug" style={{ color: C.text2 }}>{e.description}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: C.text3 }}>
                    {e.time} · {e.tier === 'T3' ? 'Cloud AI' : 'Instant'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick scenes */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.text3 }}>Quick scenes</p>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_SCENES.map(s => (
            <button
              key={s.regime}
              onClick={() => handleScene(s.regime)}
              className="py-2.5 rounded-xl border transition-all text-center text-xs font-medium"
              style={{
                color: C.text2,
                borderColor: C.border,
                background: C.card,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.cyanDim;
                (e.currentTarget as HTMLButtonElement).style.color = C.text;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                (e.currentTarget as HTMLButtonElement).style.color = C.text2;
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={onOpenFullApp}
          className="w-full mt-2.5 py-2 text-xs border rounded-lg transition-colors"
          style={{ color: C.text3, borderColor: C.border }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = C.cyan; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = C.text3; }}
        >
          Open Full Alexa App →
        </button>
      </div>
    </div>
  );
}

// ── Scenario Panel (right column) ─────────────────────────────────────────────

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
      scenarioId: s.id, tier: s.tier, tag: s.tag,
      ms: s.ms, cost: s.cost,
      overlayTitle: s.overlayTitle, overlayDetail: s.overlayDetail,
      steps: s.steps,
    });
    try {
      const data = await s.fn() as { message?: string };
      const msg = data.message ?? `${s.title} triggered`;
      addNotification(msg, 'success');
      onRun(s.tier, `${s.title}: ${msg.substring(0, 60)}`);
      setFlash({ id: s.id, ok: true });
    } catch {
      addNotification(`${s.title} — backend offline`, 'warning');
      setFlash({ id: s.id, ok: false });
    } finally {
      setRunning(null);
      setTimeout(() => setFlash(null), 2000);
    }
  };

  const instant = SCENARIOS.filter(s => s.tier === 'T0');
  const cloud   = SCENARIOS.filter(s => s.tier === 'T3');

  const renderScenario = (s: Scenario) => {
    const isRunning = running === s.id;
    const flashState = flash?.id === s.id;
    const isInstant = s.tier === 'T0';
    const accentColor = isInstant ? C.green : C.amber;

    let borderColor: string = C.border;
    let bgColor: string = C.card;
    if (flashState) {
      borderColor = flash!.ok ? C.green : C.red;
      bgColor = flash!.ok ? C.greenDim : C.redDim;
    } else if (isRunning) {
      borderColor = C.cyan;
      bgColor = C.cyanBg;
    }

    return (
      <button
        key={s.id}
        onClick={() => run(s)}
        disabled={!!running}
        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all duration-150 disabled:opacity-50"
        style={{ borderColor, background: bgColor }}
        onMouseEnter={e => {
          if (running || flashState) return;
          (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderHover;
          (e.currentTarget as HTMLButtonElement).style.background = C.cardHover;
        }}
        onMouseLeave={e => {
          if (running || flashState) return;
          (e.currentTarget as HTMLButtonElement).style.borderColor = borderColor;
          (e.currentTarget as HTMLButtonElement).style.background = bgColor;
        }}
      >
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold leading-tight" style={{ color: C.text }}>{s.title}</p>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: C.text3 }}>{s.desc}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono" style={{ color: C.text3 }}>{s.ms}</span>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: accentColor, background: isInstant ? C.greenDim : C.amberDim }}
          >
            {isInstant ? 'T0' : 'T3'}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="px-4 py-4 border-b" style={{ borderColor: C.border }}>
      {/* Instant scenarios */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ color: C.green, background: C.greenDim }}
          >
            INSTANT
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>Local rules · 8ms · $0.00</p>
        </div>
        <div className="space-y-1.5">
          {instant.map(renderScenario)}
        </div>
      </div>

      {/* Cloud scenarios */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded"
            style={{ color: C.amber, background: C.amberDim }}
          >
            CLOUD AI
          </span>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>Bedrock · 4-agent chain</p>
        </div>
        <div className="space-y-1.5">
          {cloud.map(renderScenario)}
        </div>
      </div>
    </div>
  );
}

// ── Home Mode Panel ────────────────────────────────────────────────────────────

const HOME_MODES = [
  { id: 'normal',   label: 'Normal',  desc: 'Standard home automation rules are active' },
  { id: 'festival', label: 'Party',   desc: 'Party lights, louder alerts, festive mode' },
  { id: 'guest',    label: 'Guests',  desc: 'Privacy mode — AI is polite and discreet' },
  { id: 'sleep',    label: 'Sleep',   desc: 'Quiet mode — only safety alerts get through' },
  { id: 'away',     label: 'Away',    desc: 'Security + energy save — nobody is home' },
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
      addNotification(`Home mode → ${mode?.label}`, 'success');
    } catch {
      addNotification('Mode change failed — backend offline', 'warning');
    } finally { setBusy(false); }
  };

  const currentMode = HOME_MODES.find(m => m.id === regime?.current_regime);

  return (
    <div className="px-4 py-4 border-b" style={{ borderColor: C.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.text3 }}>Home mode</p>
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {HOME_MODES.map(m => {
          const active = regime?.current_regime === m.id;
          return (
            <button
              key={m.id}
              onClick={() => force(m.id)}
              disabled={busy}
              title={m.desc}
              className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all disabled:opacity-40"
              style={{
                borderColor: active ? C.cyan : C.border,
                background: active ? C.cyanBg : C.card,
                color: active ? C.cyan : C.text2,
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>
      {currentMode && (
        <p className="text-[10px] leading-snug" style={{ color: C.text3 }}>{currentMode.desc}</p>
      )}
    </div>
  );
}

// ── AI Predictions Panel ───────────────────────────────────────────────────────

function AiComingUpPanel() {
  const { anticipations, loading } = useAnticipations();

  return (
    <div className="px-4 py-4 border-b" style={{ borderColor: C.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: C.text3 }}>AI predicts next</p>
      {loading ? (
        <p className="text-xs" style={{ color: C.text3 }}>Loading...</p>
      ) : anticipations.length === 0 ? (
        <p className="text-xs leading-snug" style={{ color: C.text3 }}>
          Run AI Learning first — predictions appear once the AI knows your patterns
        </p>
      ) : (
        <div className="space-y-2">
          {anticipations.slice(0, 3).map((a, i) => (
            <div key={i} className="p-2.5 rounded-lg border" style={{ background: C.card, borderColor: C.border }}>
              <p className="text-xs leading-snug" style={{ color: C.text }}>AI expects: {a.action}</p>
              <p className="text-[10px] mt-0.5" style={{ color: C.text3 }}>
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

// ── AI Learning Panel ──────────────────────────────────────────────────────────

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
      addNotification(`Loaded ${data.days_seeded} days of home history`, 'success');
      setSeeded(true);
      await loadRules();
    } catch {
      addNotification('Backend offline', 'warning');
    } finally { setSeeding(false); }
  };

  const mine = async () => {
    setMining(true);
    try {
      const data = await backendApi.runRuleMiner() as { proposed?: number };
      addNotification(`Found ${data.proposed ?? 0} pattern(s) in your home history`, 'success');
      await loadRules();
    } catch {
      addNotification('Backend offline', 'warning');
    } finally { setMining(false); }
  };

  const confirm = async (id: string) => {
    try {
      await backendApi.confirmRule(undefined, id);
      addNotification('Pattern added — now fires in 8ms, no cloud', 'success');
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
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>AI learning</p>
        {activeCount > 0 && (
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: C.green, background: C.greenDim }}
          >
            {activeCount} instant rules
          </span>
        )}
      </div>

      <button
        onClick={seed}
        disabled={seeding || mining}
        className="w-full py-2 mb-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40"
        style={{
          borderColor: seeded ? C.green + '60' : C.border,
          color: seeded ? C.green : C.text2,
          background: seeded ? C.greenDim : C.card,
        }}
      >
        {seeding ? 'Loading history...' : seeded ? '✓ Step 1: Home history loaded' : 'Step 1: Load a sample week'}
      </button>

      {seeded && (
        <button
          onClick={mine}
          disabled={mining || seeding}
          className="w-full py-2 mb-2 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-40"
          style={{ borderColor: C.border, color: C.text2, background: C.card }}
        >
          {mining ? 'Finding patterns...' : 'Step 2: Find patterns'}
        </button>
      )}

      {pending.length > 0 && (
        <div className="space-y-2 mt-2">
          <p className="text-[10px] font-semibold" style={{ color: C.amber }}>
            Step 3 · AI found {pending.length} pattern(s):
          </p>
          {pending.slice(0, 3).map(p => (
            <div key={p.proposal_id} className="p-3 rounded-xl border" style={{ background: C.card, borderColor: C.amberDim + '80' }}>
              <p className="text-xs leading-snug mb-1" style={{ color: C.text }}>{p.description}</p>
              {p.confidence != null && (
                <p className="text-[10px] mb-2.5" style={{ color: C.text3 }}>
                  {Math.round(p.confidence * 100)}% confident · based on your history
                </p>
              )}
              <div className="flex gap-1.5">
                <button
                  onClick={() => confirm(p.proposal_id)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold border transition-colors"
                  style={{ background: C.greenDim, borderColor: C.green + '40', color: C.green }}
                >
                  ✓ Add to instant rules
                </button>
                <button
                  onClick={() => reject(p.proposal_id)}
                  className="flex-1 py-1.5 rounded text-[10px] font-bold border transition-colors"
                  style={{ background: C.redDim, borderColor: C.red + '40', color: C.red }}
                >
                  ✕ Skip
                </button>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-center pt-1" style={{ color: C.text3 }}>
            Once added — fires instantly · No cloud · $0.00
          </p>
        </div>
      )}

      {pending.length === 0 && activeCount === 0 && !seeded && (
        <p className="text-[10px] text-center leading-snug py-1" style={{ color: C.text3 }}>
          AI learns your patterns and turns them into instant reactions
        </p>
      )}
    </div>
  );
}

// ── Analytics View ─────────────────────────────────────────────────────────────

function TierCascadePanel({ tierCounts }: { tierCounts: TierCounts }) {
  const total = tierCounts.T0 + tierCounts.T1 + tierCounts.T3 || 1;
  const tiers = [
    { key: 'T0' as const, label: 'Instant — local rules',  color: C.green,  desc: 'commandProcessor.ts',  detail: '<10ms · $0.00 · no model inference' },
    { key: 'T1' as const, label: 'Quick — on-device AI',   color: C.cyan,   desc: 'on-device intent regex', detail: '<100ms · $0.00 · no cloud call' },
    { key: 'T3' as const, label: 'Deep AI — cloud',        color: C.amber,  desc: 'Bedrock Nova Micro',    detail: '0.5–3s · ~$0.00004 · 4-agent chain' },
  ];

  return (
    <div className="p-5 border-b" style={{ borderColor: C.border }}>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-5" style={{ color: C.text3 }}>How AI decides</p>
      <div className="space-y-5">
        {tiers.map(t => {
          const pct = Math.round((tierCounts[t.key] / total) * 100);
          return (
            <div key={t.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded"
                    style={{ color: t.color, background: t.color + '18' }}
                  >
                    {t.key}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: C.text }}>{t.label}</span>
                  <span className="text-xs hidden xl:inline" style={{ color: C.text3 }}>{t.desc}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold" style={{ color: t.color }}>{pct}%</span>
                  <span className="text-xs" style={{ color: C.text3 }}>({tierCounts[t.key]})</span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${t.color}60, ${t.color})` }}
                />
              </div>
              <p className="text-[10px] mt-1" style={{ color: C.text3 }}>{t.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventFeedPanel({ events }: { events: LiveEvent[] }) {
  return (
    <div className="p-5 border-b" style={{ borderColor: C.border }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>AI Action Log</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.green }} />
          <span className="text-xs" style={{ color: C.green }}>Live</span>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="py-6 text-center border border-dashed rounded-xl" style={{ borderColor: C.border }}>
          <p className="text-xs" style={{ color: C.text3 }}>No events yet</p>
          <p className="text-[10px] mt-1" style={{ color: C.text3 }}>Run a scenario to see the AI in action</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
          {events.map(e => (
            <div
              key={e.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border"
              style={{ background: C.card, borderColor: C.border }}
            >
              <p className="flex-1 text-xs truncate" style={{ color: C.text2 }}>{e.description}</p>
              <span className="text-[10px] shrink-0" style={{ color: C.text3 }}>{e.time}</span>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
                style={{
                  color: e.tier === 'T3' ? C.amber : C.green,
                  background: e.tier === 'T3' ? C.amberDim : C.greenDim,
                }}
              >
                {e.tier}
              </span>
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
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>Room status</p>
        {twinData && <span className="text-xs" style={{ color: C.text3 }}>{twinData.current_mode} mode</span>}
      </div>
      {!twinData?.rooms?.length ? (
        <p className="text-xs" style={{ color: C.text3 }}>Backend offline — start backend to see live room status</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {twinData.rooms.map(room => {
            const pct = room.device_count > 0 ? Math.round((room.on_count / room.device_count) * 100) : 0;
            return (
              <div key={room.id} className="p-3 rounded-xl border" style={{ background: C.card, borderColor: C.border }}>
                <p className="text-xs font-semibold truncate mb-1.5" style={{ color: C.text }}>{room.name}</p>
                <div className="flex items-center justify-between text-[10px] mb-2">
                  <span style={{ color: C.text3 }}>{room.on_count}/{room.device_count} on</span>
                  <span style={{ color: pct > 0 ? C.green : C.text3 }}>{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: C.green }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function DemoDashboard() {
  useSimulation(2000);
  const { subscribe } = useWebSocket();

  const [view, setView] = useState<'3d' | 'analytics'>('3d');
  const [tierCounts, setTierCounts] = useState<TierCounts>({ T0: 8, T1: 3, T3: 1 });
  const [costSaved, setCostSaved] = useState(0.00044);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [showBanner, setShowBanner] = useState(false);
  const [overlay, setOverlay] = useState<OverlayInfo | null>(null);
  const [showFullAlexa, setShowFullAlexa] = useState(false);
  const [showTour, setShowTour] = useState(true);

  useEffect(() => {
    const unsub = subscribe(msg => {
      if (msg.type === 'event_result' && msg.payload) {
        const tier = (msg.payload.tier as string) ?? 'T0';
        const desc = ((msg.payload.description as string) ?? (msg.payload.message as string) ?? 'Event processed').substring(0, 80);
        const id = `${Date.now()}-${Math.random()}`;
        setEvents(prev => [
          { id, time: new Date().toLocaleTimeString(), tier, description: desc },
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
      { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), tier, description },
      ...prev.slice(0, 19),
    ]);
  }, []);

  const handleOverlay = useCallback((info: OverlayInfo) => setOverlay(info), []);
  const dismissOverlay = useCallback(() => setOverlay(null), []);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: C.bg }}>
      {showBanner && <OnboardingBanner onDismiss={() => setShowBanner(false)} />}
      <DemoHeader tierCounts={tierCounts} costSaved={costSaved} onTour={() => setShowTour(true)} />

      <div className="flex flex-1 overflow-hidden">

        {/* Left column — Alexa panel */}
        <div className="w-[252px] shrink-0 border-r overflow-y-auto" style={{ borderColor: C.border }}>
          <CompactAlexaView events={events} onOpenFullApp={() => setShowFullAlexa(true)} />
        </div>

        {/* Center — 3D twin or Analytics */}
        <div className="flex-1 overflow-hidden relative">
          {view === '3d' ? (
            <div className="w-full h-full relative" style={{ background: '#07080F' }}>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div
                      className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                      style={{ borderColor: C.cyan, borderTopColor: 'transparent' }}
                    />
                    <p className="text-xs" style={{ color: C.text3 }}>Loading 3D Twin...</p>
                  </div>
                </div>
              }>
                <DigitalTwinCanvas />
              </Suspense>
              {overlay && <AiDecisionOverlay overlay={overlay} onDismiss={dismissOverlay} />}
              <button
                onClick={() => setView('analytics')}
                className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors backdrop-blur-sm"
                style={{
                  background: 'rgba(9,10,19,0.75)',
                  borderColor: C.border,
                  color: C.text3,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.text;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.borderHover;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = C.text3;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
                }}
              >
                Analytics →
              </button>
            </div>
          ) : (
            <div className="w-full h-full overflow-y-auto" style={{ background: C.surface }}>
              <div
                className="px-5 py-3.5 border-b flex items-center gap-4 sticky top-0 z-10"
                style={{ background: C.surface, borderColor: C.border }}
              >
                <button
                  onClick={() => setView('3d')}
                  className="flex items-center gap-1.5 text-xs transition-colors"
                  style={{ color: C.text2 }}
                >
                  ← Back to Home
                </button>
                <div className="h-3 w-px" style={{ background: C.border }} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: C.text3 }}>Technical Analytics</p>
                <p className="text-[10px] ml-auto" style={{ color: C.text3 }}>For Amazon SDE judges</p>
              </div>
              <TierCascadePanel tierCounts={tierCounts} />
              <EventFeedPanel events={events} />
              <RoomStatusGrid />
            </div>
          )}
        </div>

        {/* Right column — scenarios + AI panels */}
        <div
          className="w-[288px] shrink-0 border-l flex flex-col overflow-y-auto"
          style={{ borderColor: C.border, background: C.bg }}
        >
          <ScenarioPanel onRun={handleScenarioRun} onOverlay={handleOverlay} />
          <HomeModePanel />
          <AiComingUpPanel />
          <AiLearningPanel />
        </div>
      </div>

      {/* Guided tour overlay */}
      {showTour && <DemoTour onClose={() => setShowTour(false)} />}

      {/* Full Alexa App modal */}
      {showFullAlexa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(5,6,14,0.92)' }}
          onClick={() => setShowFullAlexa(false)}
        >
          <div
            className="w-80 h-[640px] rounded-2xl overflow-hidden relative border shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{
              borderColor: C.borderHover,
              boxShadow: `0 0 80px ${C.cyan}18, 0 32px 80px rgba(0,0,0,0.7)`,
            }}
          >
            <button
              onClick={() => setShowFullAlexa(false)}
              className="absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full border flex items-center justify-center text-xs transition-colors"
              style={{ background: C.card, borderColor: C.borderHover, color: C.text2 }}
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
