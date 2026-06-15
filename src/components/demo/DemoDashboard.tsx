import { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { C, F, SCENARIOS } from './ScenarioDefs';
import { ChainBuilder }           from './ChainBuilder';
import { EventFeed }              from './EventFeed';
import { AppStorePanel }          from './AppStorePanel';
import { GuidedTour, shouldShowTour } from './GuidedTour';
import { useLiveBackend }         from '../../hooks/useLiveBackend';
import { usePollyTTS }            from '../../hooks/usePollyTTS';
import { useMic }                 from '../../hooks/useMic';
import { interpretCommand }       from '../../hooks/useVoiceCommands';
import { fetchWeather }           from '../../hooks/useWeather';
import type { WeatherInfo }       from '../../hooks/useWeather';
import type { ActiveScenario, TierKey, RoomTarget, IntelTab, CartItem } from './ScenarioDefs';
import { AlexaMomentCard } from './AlexaMomentCard';
import { AlexaAppSimView } from '../panels/AlexaAppSimView';
import { ColB_RoomGlows }         from './ColB_RoomGlows';
import { ColB_IntelligenceLayer } from './ColB_IntelligenceLayer';
import type { TierCounts, LiveEvent } from './ColB_IntelligenceLayer';
import { ColC_EcosystemPayoff }   from './ColC_EcosystemPayoff';
import { PrivacyDrawer }          from './PrivacyDrawer';
import { useAppStore }            from '../../store/store';
import { useSimulation }          from '../../hooks/useSimulation';
import { useWebSocket }           from '../../hooks/useWebSocket';

const DigitalTwinCanvas = lazy(() =>
  import('../canvas/DigitalTwinCanvas').then(m => ({ default: m.DigitalTwinCanvas }))
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAmbientTone(): { bg: string; greeting: string } {
  const h = new Date().getHours();
  if (h >= 5  && h < 8)  return { bg: '#141414', greeting: 'Good morning' };
  if (h >= 8  && h < 12) return { bg: '#111111', greeting: 'Good morning' };
  if (h >= 12 && h < 17) return { bg: '#111111', greeting: 'Good afternoon' };
  if (h >= 17 && h < 21) return { bg: '#0E0E0E', greeting: 'Good evening' };
  return { bg: '#0A0A0A', greeting: 'Good night' };
}

const REGIME_OPTIONS = [
  { value: 'normal',   label: 'Normal',   color: C.green  },
  { value: 'festival', label: 'Festival', color: C.amber  },
  { value: 'guest',    label: 'Guest',    color: C.cyan   },
  { value: 'sleep',    label: 'Sleep',    color: C.violet },
  { value: 'away',     label: 'Away',     color: C.red    },
];

// ── Mic overlay ───────────────────────────────────────────────────────────────

interface VoiceState {
  liveText:   string;
  response:   string;
  tier:       string;
  isListening: boolean;
  isThinking: boolean;
}


// ── Header ────────────────────────────────────────────────────────────────────

function DashHeader({ regime, connected, ambientGreeting, onOpenConstruct }: {
  regime: { current_regime?: string } | null;
  connected: boolean;
  ambientGreeting: string;
  onOpenConstruct?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 24px', background: C.surface, borderBottom: `1px solid ${C.border}`,
      flexShrink: 0, minHeight: 58,
    }}>
      {/* Left: Home identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Alexa ring */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          border: '2.5px solid #00BFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 10px #00BFFF44',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00BFFF' }} />
        </div>
        <div>
          <div style={{ fontFamily: 'Encode Sans, var(--font-display)', fontSize: 18, color: C.text, fontWeight: 600, lineHeight: 1.2, letterSpacing: '0.02em' }}>
            Sharma Residence
          </div>
          <div style={{ fontSize: F.badge, color: C.text3, letterSpacing: '0.04em', marginTop: 2, fontFamily: 'Work Sans, sans-serif' }}>1 BHK · Pune</div>
        </div>
      </div>

      {/* Center: Greeting */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 22, color: C.text2,
        letterSpacing: '0.03em', lineHeight: 1.2,
      }}>
        {ambientGreeting}, Sharma Ji
      </div>

      {/* Right: Status + Build button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: connected ? C.green : C.red,
            boxShadow: connected ? `0 0 6px ${C.green}` : 'none',
          }} />
          <span style={{ fontSize: F.badge, color: C.text3 }}>
            {connected ? 'Home is online' : 'Demo mode'}
          </span>
        </div>
        {regime?.current_regime && (
          <span style={{
            fontSize: F.badge, color: C.gold, fontWeight: 600,
            padding: '2px 8px', background: C.goldBg, borderRadius: 4,
            border: `1px solid ${C.goldDim}`,
          }}>
            {regime.current_regime}
          </span>
        )}
        {onOpenConstruct && (
          <button
            onClick={onOpenConstruct}
            style={{
              fontSize: F.badge, fontWeight: 700, padding: '4px 10px', borderRadius: 4,
              background: C.violetBg, border: `1px solid ${C.violetDim}`, color: C.violet,
              cursor: 'pointer',
            }}
          >
            Build Scenario
          </button>
        )}
      </div>
    </div>
  );
}

// ── Canvas HUD ────────────────────────────────────────────────────────────────

// ── Right tab types ───────────────────────────────────────────────────────────

type RightTab = 'ecosystem' | 'chain' | 'events' | 'store';
const RIGHT_TABS: { key: RightTab; label: string }[] = [
  { key: 'ecosystem', label: 'Ecosystem' },
  { key: 'chain',     label: 'T0 Chain'  },
  { key: 'events',    label: 'Events'    },
  { key: 'store',     label: 'Store'     },
];

// ── Main component ────────────────────────────────────────────────────────────

export function DemoDashboard({ onOpenConstruct }: { onOpenConstruct?: () => void } = {}) {
  useSimulation(2000);
  const { subscribe }       = useWebSocket();
  const addNotification     = useAppStore(s => s.addNotification);
  const setActiveScenarioId = useAppStore(s => s.setActiveScenarioId);
  const setActiveRoom       = useAppStore(s => s.setActiveRoom);
  const lastCloudCommand    = useAppStore(s => s.lastCloudCommand);

  const tts  = usePollyTTS();
  const live = useLiveBackend();

  // Sync backend device states into the 3D canvas store
  useEffect(() => {
    if (!live.devices.length) return;
    const store = useAppStore.getState();
    for (const dev of live.devices) {
      const match = store.placedObjects.find(o =>
        (o.alexaDeviceId && o.alexaDeviceId === dev.id) ||
        (o.deviceName && dev.friendly_name && o.deviceName.toLowerCase() === dev.friendly_name.toLowerCase())
      );
      if (!match) continue;
      const devState: Record<string, unknown> | undefined = dev.state;
      if (!devState) continue;
      const patch: Partial<import('../../types').AlexaDeviceState> = {};
      if (devState.is_on       !== undefined) patch.isOn        = devState.is_on as boolean;
      if (devState.brightness  !== undefined) patch.brightness  = devState.brightness as number;
      if (devState.temperature !== undefined) patch.temperature = devState.temperature as number;
      if (devState.volume      !== undefined) patch.volume      = devState.volume as number;
      if (devState.speed       !== undefined) patch.speed       = devState.speed as number;
      if (devState.is_locked   !== undefined) patch.isLocked    = devState.is_locked as boolean;
      if (Object.keys(patch).length) store.updateAlexaState(match.id, patch);
    }
  }, [live.devices]);

  // ── Weather ───────────────────────────────────────────────────────────────────
  const weatherRef = useRef<WeatherInfo | null>(null);
  useEffect(() => { fetchWeather().then(w => { weatherRef.current = w; }).catch(() => {}); }, []);

  // ── Auto-seed on first connect ────────────────────────────────────────────────
  const seededRef = useRef(false);
  useEffect(() => {
    if (!live.connected || seededRef.current) return;
    if (live.devices.length > 0) { seededRef.current = true; return; }
    seededRef.current = true;
    live.seedHome().then(() => live.seedHistory()).catch(() => {});
  }, [live.connected, live.devices.length]); // eslint-disable-line

  // ── Interactive rule confirmation ─────────────────────────────────────────────
  const [pendingConfirm, setPendingConfirm] = useState<{
    question: string;
    onYes: () => void;
    onNo: () => void;
  } | null>(null);

  // ── Voice state ──────────────────────────────────────────────────────────────
  const [_voiceState, setVoiceState] = useState<VoiceState>({
    liveText: '', response: '', tier: 'T0', isListening: false, isThinking: false,
  });
  const runScenarioRef = useRef<((s: ActiveScenario, voiceTriggered?: boolean) => void) | null>(null);
  const forceRegimeRef = useRef<((r: string) => void) | null>(null);

  // Called by AlexaAppSimView after it has already handled backend + TTS
  // DemoDashboard only updates UI state — no extra backend or TTS calls here
  const handleTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setVoiceState(vs => ({ ...vs, liveText: text, isListening: false, isThinking: false }));

    // Local NLU for UI state only (scenario triggers, momentCard, etc.)
    const localResult = interpretCommand(text);
    const finalTier = localResult.tier as TierKey;
    const action = localResult.action;

    // Weather injection for "I'm back"
    let finalResponse = localResult.response;
    if (/i('?m| am) back|coming home/i.test(text) && weatherRef.current) {
      const { temp_c, desc } = weatherRef.current;
      const suggestion = temp_c > 32 ? 'AC is on at 24°C for you.' : temp_c < 20 ? 'Geyser is warming up.' : 'Home temperature is comfortable.';
      finalResponse = `Welcome home, Sharma Ji! It's ${temp_c}°C and ${desc} outside. ${suggestion}`;
    }

    setVoiceState(vs => ({ ...vs, response: finalResponse, tier: finalTier }));
    setMomentCard({ message: finalResponse, tier: finalTier as TierKey, room: null });

    // Execute local action if any
    if (action) {
      if (action.type === 'scenario') {
        const sc = SCENARIOS.find(s => s.id === action.id);
        if (sc) setTimeout(() => runScenarioRef.current?.(sc, true), 600);
      } else if (action.type === 'regime') {
        setTimeout(() => forceRegimeRef.current?.(action.value), 300);
      }
    }

    // Add to event feed
    setEvents(prev => [{
      id: `voice-${Date.now()}`,
      time: new Date().toLocaleTimeString(),
      tier: finalTier,
      description: `Voice: "${text.substring(0, 50)}"`,
    }, ...prev.slice(0, 19)]);
    setTierCounts(prev => ({ ...prev, [finalTier]: (prev[finalTier as TierKey] ?? 0) + 1 }));
  }, [tts]);

  const mic = useMic(handleTranscript);

  const handleMicToggle = useCallback(() => {
    if (mic.listening) {
      mic.stop(true);
    } else {
      tts.stop();
      setVoiceState({ liveText: '', response: '', tier: 'T0', isListening: true, isThinking: false });
      mic.start();
    }
  }, [mic, tts]);
  void handleMicToggle;

  // Keep live text in sync with mic
  useEffect(() => {
    setVoiceState(vs => ({
      ...vs,
      liveText:    mic.liveText || vs.liveText,
      isListening: mic.listening,
    }));
  }, [mic.liveText, mic.listening]);

  // ── Dashboard state ──────────────────────────────────────────────────────────
  const [activeScenario, setActiveScenario] = useState<ActiveScenario | null>(null);
  const [persona,        setPersona]        = useState<'dadi' | 'parent' | 'child'>('dadi');
  const [awayBranch,     setAwayBranch]     = useState<'empty' | 'pet'>('pet');
  const [intelTab,       setIntelTab]       = useState<IntelTab>('cascade');
  const [tierCounts,     setTierCounts]     = useState<TierCounts>({ T0: 8, T1: 3, T2: 1, T3: 0 });
  const [events,         setEvents]         = useState<LiveEvent[]>([]);
  const [cartItems,      setCartItems]      = useState<CartItem[]>([]);
  const [whistleCount,   setWhistleCount]   = useState(0);
  const [running,        setRunning]        = useState<string | null>(null);
  const [glowActive,     setGlowActive]     = useState(false);
  const [momentCard,     setMomentCard]     = useState<{ message: string; tier: TierKey; room: RoomTarget } | null>(null);
  const [showTour,       setShowTour]       = useState(() => shouldShowTour());
  const [rightTab,       setRightTab]       = useState<RightTab>('ecosystem');

  const [ambientTone, setAmbientTone] = useState(getAmbientTone);

  useEffect(() => {
    const id = setInterval(() => setAmbientTone(getAmbientTone()), 60_000);
    return () => clearInterval(id);
  }, []);

  // NOTE: auto-play intro scenario removed , Alexa must only speak / show moments when the
  // user actively triggers something (no "creepy" voice firing on its own).

  useEffect(() => {
    if (!activeScenario) return;
    const id = setTimeout(() => { setActiveScenario(null); setActiveScenarioId(null); }, 14000);
    return () => clearTimeout(id);
  }, [activeScenario?.id, setActiveScenarioId]);

  useEffect(() => {
    if (whistleCount === 0) return;
    const id = setTimeout(() => setWhistleCount(0), 8000);
    return () => clearTimeout(id);
  }, [whistleCount]);

  useEffect(() => {
    if (!glowActive) return;
    const id = setTimeout(() => setGlowActive(false), 6500);
    return () => clearTimeout(id);
  }, [glowActive, activeScenario?.id]);

  useEffect(() => {
    return subscribe(msg => {
      if (msg.type === 'event_result' && msg.payload) {
        const tier = (msg.payload.tier as string) ?? 'T0';
        if (tier === 'SYSTEM') return; // connection/handshake messages, not real events
        const desc = ((msg.payload.description as string) ?? (msg.payload.message as string) ?? 'Event').substring(0, 80);
        setEvents(prev => [{ id: `ws-${Date.now()}`, time: new Date().toLocaleTimeString(), tier, description: desc }, ...prev.slice(0, 19)]);
        setTierCounts(prev => ({ ...prev, [tier]: (prev[tier as TierKey] ?? 0) + 1 }));
      }
    });
  }, [subscribe]);

  const runScenario = useCallback(async (scenario: ActiveScenario, voiceTriggered = false) => {
    if (running) return;
    setRunning(scenario.id);
    if (scenario.id === 'pressure') setWhistleCount(p => p + 1);

    const personaMsg = scenario.alexaMessage?.[persona] ?? scenario.narration;

    setActiveScenario(scenario);
    setActiveScenarioId(scenario.id);
    const ROOM_FOCUS: Record<string, string | null> = {
      kitchen: 'kitchen', bathroom: 'bathroom', living: 'living-room',
      office: 'office', pooja: 'master-bedroom', all: null,
    };
    const focus = scenario.roomGlow ? ROOM_FOCUS[scenario.roomGlow] : null;
    if (focus !== undefined) setActiveRoom(focus);
    setMomentCard({ message: personaMsg, tier: scenario.tier, room: scenario.roomGlow });
    setIntelTab(scenario.intelTab);
    setGlowActive(true);

    // Only speak if not voice-triggered — AlexaAppSimView already handled TTS for voice commands
    if (!voiceTriggered) setTimeout(() => tts.speak(personaMsg), 400);

    // Interactive rule confirmation , ask after narration plays
    setTimeout(() => {
      setPendingConfirm({
        question: `Should I ${scenario.alertCard.primaryAction.toLowerCase()}?`,
        onYes: () => {
          tts.speak(`Done. ${scenario.alertCard.primaryAction} applied.`);
          setPendingConfirm(null);
        },
        onNo: () => {
          tts.speak('Understood. I will wait for your instruction.');
          setPendingConfirm(null);
        },
      });
    }, 3500);

    if (scenario.cartItems?.length) {
      setCartItems(prev => {
        const incoming = scenario.cartItems!.filter(ni => !prev.some(p => p.name === ni.name));
        return [...incoming, ...prev];
      });
    }
    setTierCounts(prev => ({ ...prev, [scenario.tier]: (prev[scenario.tier] ?? 0) + 1 }));

    try {
      const data   = await scenario.apiFn() as { message?: string };
      const notice = data.message ?? `${scenario.title} triggered`;
      addNotification(notice, 'success');
      setEvents(prev => [{
        id: `sc-${Date.now()}`, time: new Date().toLocaleTimeString(),
        tier: scenario.tier, description: `${scenario.title}: ${notice.substring(0, 60)}`,
      }, ...prev.slice(0, 19)]);
    } catch {
      addNotification(`${scenario.title} , backend offline (demo mode)`, 'warning');
    } finally {
      setRunning(null);
    }
  }, [running, addNotification, tts, setActiveScenarioId, setActiveRoom, persona]);

  runScenarioRef.current = runScenario;

  const handleRegimeChange = useCallback(async (regime: string) => {
    try {
      await live.forceRegime(regime);
      const opt = REGIME_OPTIONS.find(r => r.value === regime);
      addNotification(`Regime: ${opt?.label ?? regime}`, 'success');
    } catch {
      addNotification('Could not change regime , backend offline', 'warning');
    }
  }, [live, addNotification]);

  forceRegimeRef.current = handleRegimeChange;

  const switchIntelTab = useCallback((t: IntelTab) => setIntelTab(t), []);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: ambientTone.bg }}>
      <DashHeader
        regime={live.regime}
        connected={live.connected}
        ambientGreeting={ambientTone.greeting}
        onOpenConstruct={onOpenConstruct}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Column A ──────────────────────────────────────────────────────── */}
        <div style={{ width: 280, flexShrink: 0, borderRight: `1px solid ${C.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AlexaAppSimView
            demoSections={{
              isListening: mic.listening,
              activeScenarioName: activeScenario?.roomName,
              persona,
              personas: [
                { key: 'dadi',   name: 'Grandparent', lang: 'Hindi'    },
                { key: 'parent', name: 'Parent',      lang: 'Hinglish' },
                { key: 'child',  name: 'Son',         lang: 'English'  },
              ],
              onPersonaChange: (k) => setPersona(k as typeof persona),
              scenarios: SCENARIOS.map(sc => ({
                id: sc.id,
                humanTitle: sc.humanTitle,
                roomName: sc.roomName,
                humanTier: sc.humanTier,
              })),
              filteredScenarioIds: SCENARIOS
                .filter(sc => {
                  const SCENARIO_PERSONAS: Record<string, string[]> = {
                    pooja: ['dadi'], chai: ['dadi'], pressure: ['dadi'], milk_overflow: ['dadi'],
                    geyser: ['dadi','parent'], jeera: ['parent'], grid: ['parent','child'],
                    away: ['parent','child'], guest_doorbell: ['parent','child'],
                    son_study: ['child'], night_check: ['child'],
                  };
                  return (SCENARIO_PERSONAS[sc.id] ?? ['dadi','parent','child']).includes(persona);
                })
                .map(sc => sc.id),
              onScenarioRun: (id) => { const sc = SCENARIOS.find(s => s.id === id); if (sc) runScenario(sc); },
              running,
            }}
          />
        </div>

        {/* ── Column B ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div data-tour-id="tour-canvas" style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: '#0A0A0A' }}>
            <Suspense fallback={
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            }>
              <DigitalTwinCanvas />
            </Suspense>
            {activeScenario && glowActive && <ColB_RoomGlows scenario={activeScenario} />}
            {momentCard && (
              <AlexaMomentCard
                message={momentCard.message}
                tier={momentCard.tier}
                room={momentCard.room}
                onDismiss={() => setMomentCard(null)}
              />
            )}
          </div>
          <div data-tour-id="tour-intelligence">
            <ColB_IntelligenceLayer
              activeScenario={activeScenario}
              activeTab={intelTab}
              onTabChange={switchIntelTab}
              tierCounts={tierCounts}
              events={events}
            />
          </div>
        </div>

        {/* ── Column C ──────────────────────────────────────────────────────── */}
        <div data-tour-id="tour-right-panel" style={{
          width: 300, flexShrink: 0, borderLeft: `1px solid ${C.border}`,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0, overflowX: 'auto' }}>
            {RIGHT_TABS.map(({ key, label }) => (
              <button key={key} onClick={() => setRightTab(key)} style={{
                flex: '1 0 auto', fontSize: F.badge, fontWeight: 600, padding: '10px 6px',
                background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' as const,
                letterSpacing: '0.05em',
                color: rightTab === key ? C.gold : C.text3,
                borderBottom: rightTab === key ? `2px solid ${C.gold}` : '2px solid transparent',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {rightTab === 'ecosystem' && (
              <ColC_EcosystemPayoff
                activeScenario={activeScenario} persona={persona}
                awayBranch={awayBranch} onAwayBranchChange={setAwayBranch}
                cartItems={cartItems} onIntelTabChange={switchIntelTab}
              />
            )}
            {rightTab === 'chain' && (
              <ChainBuilder
                t0Rules={live.t0Rules} proposedRules={live.proposedRules}
                connected={live.connected} onMine={live.mineRules}
                onConfirm={live.confirmRule} onReject={live.rejectRule}
              />
            )}
            {rightTab === 'events' && (
              <EventFeed
                events={live.eventHistory} anticipations={live.anticipations}
                onSeedHistory={live.seedHistory} connected={live.connected}
              />
            )}
            {rightTab === 'store' && (
              <AppStorePanel
                modules={live.storeModules} onInstall={live.installModule}
                connected={live.connected}
              />
            )}
          </div>
        </div>
      </div>

      <PrivacyDrawer activeScenario={activeScenario} lastVoiceCommand={lastCloudCommand?.text} />

      {/* Interactive rule confirmation overlay */}
      {pendingConfirm && (
        <div style={{
          position: 'absolute', bottom: 60, left: '50%', transform: 'translateX(-50%)',
          zIndex: 8500, background: C.surface, border: `1px solid ${C.border2}`,
          borderRadius: 12, padding: '16px 20px', width: 400,
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}>
          <div style={{ fontSize: F.sm, color: C.text, marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid #00BFFF', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#00BFFF', display: 'block' }} />
              </span>
              <span style={{ fontWeight: 700, color: '#00BFFF', fontSize: F.badge }}>Alexa:</span>
            </span>{' '}{pendingConfirm.question}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={pendingConfirm.onYes}
              style={{ flex: 1, padding: '8px', background: C.greenBg, border: `1px solid ${C.greenDim}`, color: C.green, borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}
            >
              Yes, do it
            </button>
            <button
              onClick={pendingConfirm.onNo}
              style={{ flex: 1, padding: '8px', background: C.surface, border: `1px solid ${C.border}`, color: C.text2, borderRadius: 6, cursor: 'pointer' }}
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {showTour && <GuidedTour onClose={() => setShowTour(false)} />}
    </div>
  );
}
