import { useState, useEffect } from 'react';
import { C, F } from './ScenarioDefs';
import type { ActiveScenario, CartItem, PersonaKey, IntelTab, TierKey } from './ScenarioDefs';
import { appStoreApi } from '../../api';
import type { GeneratedModule } from '../../api';
import { useAppStore } from '../../store/store';

interface Props {
  activeScenario: ActiveScenario | null;
  persona: PersonaKey;
  awayBranch: 'empty' | 'pet';
  onAwayBranchChange: (b: 'empty' | 'pet') => void;
  cartItems: CartItem[];
  onIntelTabChange: (t: IntelTab) => void;
}

function Eyebrow({ label }: { label: string }) {
  return (
    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: C.text3, padding: '10px 12px 5px' }}>
      {label}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────

function AlertCard({ scenario, awayBranch, onIntelTabChange }: {
  scenario: ActiveScenario;
  awayBranch: 'empty' | 'pet';
  onIntelTabChange: (t: IntelTab) => void;
}) {
  const [timerSecs, setTimerSecs] = useState<number | null>(null);

  useEffect(() => { setTimerSecs(null); }, [scenario.id]);

  useEffect(() => {
    if (!timerSecs || timerSecs <= 0) return;
    const id = setInterval(() => setTimerSecs(s => (s ?? 1) - 1), 1000);
    return () => clearInterval(id);
  }, [timerSecs]);

  // Away scenario text branches based on pet/empty toggle
  const ac = scenario.id === 'away' && awayBranch === 'empty'
    ? {
        ...scenario.alertCard,
        badgeLabel: '[T3 BEDROCK] GEOFENCE EXIT',
        badgeColor: C.cyan,
        badgeBg: C.cyanBg,
        text: '"You\'ve left the geofence. Should I power down the ACs, secure the LPG valve, and activate the security watchdog?"',
        primaryAction: 'Yes, secure home',
      }
    : scenario.alertCard;

  const handlePrimary = () => {
    if (ac.actionType === 'timer') setTimerSecs(300);
    if (ac.actionType === 'ltm')   onIntelTabChange('memory');
  };

  return (
    <div style={{
      border: `1px solid ${ac.badgeColor}30`, borderRadius: 4, padding: '9px 10px',
      background: `${ac.badgeBg}20`,
    }}>
      <div style={{
        display: 'inline-block', fontSize: 7, fontWeight: 700,
        padding: '2px 6px', borderRadius: 3, marginBottom: 6,
        color: ac.badgeColor, background: ac.badgeBg, letterSpacing: '0.06em',
      }}>
        {ac.badgeLabel}
      </div>
      <div style={{ fontSize: 9, color: C.text, lineHeight: 1.55, marginBottom: 7 }}>{ac.text}</div>

      {timerSecs !== null && timerSecs > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7,
          padding: '5px 8px', border: `1px solid ${C.cyanDim}`, borderRadius: 3, background: C.cyanBg,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.cyan, fontFamily: 'monospace' }}>
            {String(Math.floor(timerSecs / 60)).padStart(2, '0')}:{String(timerSecs % 60).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 8, color: C.text2 }}>Break timer active</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button
          onClick={handlePrimary}
          style={{ fontSize: 8, color: C.green, fontWeight: 700, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          {ac.primaryAction}
        </button>
        <span style={{ fontSize: 8, color: C.text3, cursor: 'pointer' }}>Dismiss</span>
      </div>
    </div>
  );
}

// ── Nightly Miner ─────────────────────────────────────────────────────────────

type MinerPhase = 'idle' | 'mining' | 'proposed' | 'confirmed';

const LTM_BARS = [35, 48, 40, 55, 44, 50, 38, 52, 44, 58, 42, 50, 46];
const PATTERN_IDX = new Set([6, 7, 8, 12]);

function NightlyMiner() {
  const [phase, setPhase] = useState<MinerPhase>('idle');
  const addNotification   = useAppStore(s => s.addNotification);

  const runMining = () => {
    setPhase('mining');
    setTimeout(() => setPhase('proposed'), 2200);
  };

  const confirm = () => {
    setPhase('confirmed');
    addNotification('Routine written to T0 rule engine , now fires in <10ms, no cloud cost', 'success');
  };

  return (
    <div style={{ margin: '0 10px 8px', border: `1px solid ${C.greenDim}`, borderRadius: 4, padding: 9, background: '#010C08' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: C.green, letterSpacing: '0.08em' }}>NIGHTLY BATCH MINER</div>
        {phase === 'idle' && (
          <button
            onClick={runMining}
            style={{
              fontSize: 7, fontWeight: 700, padding: '2px 8px', borderRadius: 3, cursor: 'pointer',
              border: `1px solid ${C.greenDim}`, color: C.green, background: C.greenBg,
            }}
          >
            Run simulation
          </button>
        )}
      </div>

      {phase === 'idle' && (
        <div style={{ fontSize: 8, color: C.text3 }}>No batch run yet , click to simulate 7-day history scan</div>
      )}

      {phase !== 'idle' && (
        <>
          <div style={{ fontSize: 8, color: C.text3, marginBottom: 5 }}>
            {phase === 'mining' ? 'Reading Timestream history...' : 'Pattern analysis complete'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, marginBottom: 6 }}>
            {LTM_BARS.map((h, i) => {
              const isPattern = phase !== 'mining' && PATTERN_IDX.has(i);
              return (
                <div key={i} style={{
                  flex: 1, borderRadius: '1px 1px 0 0',
                  height: `${h}%`,
                  background: isPattern ? C.cyan : C.green,
                  opacity:    isPattern ? 0.9 : 0.35,
                  transition: 'background .5s, opacity .5s',
                }} />
              );
            })}
          </div>
        </>
      )}

      {(phase === 'proposed' || phase === 'confirmed') && (
        <div style={{ border: `1px solid ${C.greenDim}`, borderRadius: 4, padding: '7px 9px', background: C.card }}>
          <div style={{
            display: 'inline-block', fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
            marginBottom: 5, letterSpacing: '0.06em', color: C.green, background: C.greenBg,
          }}>
            [PATTERN FOUND] T3 → T0 TRANSITION
          </div>

          {phase === 'proposed' ? (
            <>
              <div style={{ fontSize: 9, color: C.text, lineHeight: 1.55, marginBottom: 6 }}>
                "I noticed you turn on the Master Bedroom AC 10 minutes before bedtime every night. Want me to create a free local routine for this?"
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={confirm}
                  style={{
                    padding: '3px 9px', borderRadius: 3, fontSize: 8, fontWeight: 700, cursor: 'pointer',
                    border: `1px solid ${C.greenDim}`, background: C.greenBg, color: C.green,
                  }}
                >
                  Confirm , Write to T0
                </button>
                <button
                  onClick={() => setPhase('idle')}
                  style={{
                    padding: '3px 9px', borderRadius: 3, fontSize: 8, cursor: 'pointer',
                    border: `1px solid ${C.border}`, background: C.card2, color: C.text3,
                  }}
                >
                  Skip
                </button>
              </div>
            </>
          ) : (
            <div style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>
              Rule written to T0 engine , fires in &lt;10ms, $0.00
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MCP Wizard ────────────────────────────────────────────────────────────────

const MOCK_MODULE: GeneratedModule = {
  module_id: 'kirloskar_pump_v1',
  name: 'Kirloskar 1.5HP Water Pump',
  is_mock: true,
  message: 'Generated by Bedrock zero-shot inference',
  draft: {
    module_id: 'kirloskar_pump_v1',
    name: 'Kirloskar 1.5HP Water Pump',
    version: '1.0.0',
    author: 'Bedrock Zero-Shot',
    category: 'water_motor',
    tags: ['water', 'pump', 'hindi'],
    device_type: 'water_motor',
    downloads: 0,
    verified: false,
    published_at: new Date().toISOString(),
    safety_class: 'CRITICAL',
    t1_intents: ['paani ki motor band karo', 'motor chalu karo'],
    auto_t0_rules: [{ description: 'dead_man_timer_min: 45 , auto-cutoff if no hub heartbeat' }],
  },
};

function MCPWizard() {
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [loading,    setLoading]    = useState(false);
  const [module,     setModule]     = useState<GeneratedModule | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installed,  setInstalled]  = useState(false);
  const addNotification = useAppStore(s => s.addNotification);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await appStoreApi.generateModule('Kirloskar 1.5HP Water Pump', 'water_motor', 'Kirloskar');
      setModule(res);
    } catch {
      setModule(MOCK_MODULE);
    } finally {
      setLoading(false);
      setStep(2);
    }
  };

  const install = async () => {
    if (!module) return;
    setInstalling(true);
    try {
      await appStoreApi.installModule(module.module_id);
    } catch { /* offline , proceed visually */ }
    await new Promise(r => setTimeout(r, 900));
    setInstalled(true);
    setInstalling(false);
    setStep(3);
    addNotification('Kirloskar Pump module installed , T0 rule active', 'success');
  };

  const m = module?.draft;

  return (
    <div style={{ margin: '0 10px 10px', border: `1px solid ${C.violetDim}`, borderRadius: 4, padding: 9, background: '#0A0718' }}>
      <div style={{ fontSize: 8, fontWeight: 700, color: C.violet, marginBottom: 7, letterSpacing: '0.08em' }}>
        MCP MODULE APP STORE
      </div>

      {/* Step 1 */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 7, fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em', color: step === 1 ? C.violet : C.text3 }}>
          STEP 1 , REGISTER APPLIANCE
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <input
            readOnly defaultValue="Kirloskar 1.5HP Water Pump"
            style={{
              flex: 1, background: C.card, border: `1px solid ${C.border2}`, borderRadius: 3,
              padding: '3px 7px', fontSize: 8, color: C.text, fontFamily: 'inherit',
            }}
          />
          {step === 1 && (
            <button
              onClick={generate} disabled={loading}
              style={{
                padding: '3px 9px', borderRadius: 3, fontSize: 8, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                border: `1px solid ${C.violetDim}`, background: C.violetBg, color: C.violet,
              }}
            >
              {loading ? '...' : 'Generate Module'}
            </button>
          )}
        </div>
      </div>

      {/* Step 2 , JSON preview */}
      {step >= 2 && m && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 7, fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em', color: step === 2 ? C.violet : C.text3 }}>
            STEP 2 , ZERO-SHOT BEDROCK OUTPUT
          </div>
          <div style={{
            background: C.bg, border: `1px solid ${C.border}`, borderRadius: 3,
            padding: '7px 9px', fontFamily: 'Courier New, monospace', fontSize: 8, lineHeight: 1.65, color: C.text2,
          }}>
            {'{\n'}
            {'  "module_id": '}<span style={{ color: C.violet }}>"{m.module_id}"</span>{',\n'}
            {'  "nlu_intent": '}<span style={{ color: C.violet }}>"{m.t1_intents?.[0] ?? 'paani ki motor band karo'}"</span>{',\n'}
            {'  "dead_man_timer_min": '}<span style={{ color: C.cyan }}>45</span>{',\n'}
            {'  "tier_override": '}<span style={{ color: C.green }}>"T0"</span>{',\n'}
            {'  "safety_class": '}<span style={{ color: C.red }}>"CRITICAL"\n</span>
            {'}'}
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step >= 2 && (
        <div>
          <div style={{ fontSize: 7, fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em', color: step === 3 ? C.green : C.text3 }}>
            STEP 3 , CONFIRM INSTALL
          </div>
          {!installed ? (
            <button
              onClick={install} disabled={installing}
              style={{
                width: '100%', padding: '5px', borderRadius: 3, fontSize: 8, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${C.violetDim}`,
                background: installing ? C.bg : C.violetBg,
                color: C.violet,
              }}
            >
              {installing ? 'Compiling...' : 'Compile + Attach to Local Hub'}
            </button>
          ) : (
            <div style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>
              Module installed · Kirloskar Pump now at T0
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Commerce layer ────────────────────────────────────────────────────────────

const UTILITY_BILLS = [
  { name: 'Electricity bill', amt: '₹1,840', status: 'Paid', ok: true  },
  { name: 'Piped gas',        amt: '₹620',   status: 'Due',  ok: false },
];

function CommerceLayer({ cartItems }: { cartItems: CartItem[] }) {
  const total = cartItems.reduce((sum, i) => {
    const n = parseInt(i.priceINR.replace('₹', '').replace(',', ''), 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  return (
    <div style={{ margin: '0 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
      {/* Amazon Pay */}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', background: C.card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>amazon pay</span>
          <span style={{ fontSize: 7, color: C.text3 }}>Auto-scheduled</span>
        </div>
        {UTILITY_BILLS.map(b => (
          <div key={b.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '3px 0', borderTop: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 9, color: C.text2 }}>{b.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.green }}>{b.amt}</span>
              <span style={{
                fontSize: 7, padding: '1px 5px', borderRadius: 2,
                background: b.ok ? C.greenBg : C.amberBg,
                color:      b.ok ? C.green   : C.amber,
              }}>{b.status}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Amazon Now auto-cart */}
      {cartItems.length > 0 && (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 4, padding: '8px 10px', background: C.card }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>
              amazon <span style={{ color: C.green }}>now</span>
            </span>
            <span style={{ fontSize: 7, color: C.text3 }}>Sensor-triggered</span>
          </div>
          {cartItems.map(item => (
            <div key={item.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '3px 0', borderTop: `1px solid ${C.border}`,
              animation: 'cartFadeIn .4s ease',
            }}>
              <div>
                <div style={{ fontSize: 9, color: C.text }}>{item.name}</div>
                <span style={{
                  fontSize: 7, padding: '1px 5px', borderRadius: 2, display: 'inline-block', marginTop: 2,
                  background: item.badge === 'AUTO-ADDED' ? C.amberBg : C.card2,
                  color:      item.badge === 'AUTO-ADDED' ? C.amber   : C.text3,
                }}>
                  {item.badge}
                </span>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.amber }}>{item.priceINR}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '5px 0 0', borderTop: `1px solid ${C.border}`, marginTop: 3,
          }}>
            <span style={{ fontSize: 8, color: C.text3 }}>{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.amber }}>₹{total}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes cartFadeIn {
          from { opacity: 0; transform: translateY(-3px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ColC_EcosystemPayoff({ activeScenario, awayBranch, onAwayBranchChange, cartItems, onIntelTabChange }: Props) {
  const lastCloudCommand = useAppStore(s => s.lastCloudCommand);
  const lastSpecialist   = useAppStore(s => s.lastSpecialist);
  return (
    <div style={{ background: C.bg }}>

      {/* ── Privacy promise ─────────────────────────────── */}
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: F.hero, color: C.gold, fontWeight: 700, lineHeight: 1 }}>
          0
        </div>
        <div style={{ fontSize: F.sm, color: C.text2, marginTop: 4 }}>
          times your voice left this home
        </div>
        <div style={{ fontSize: F.badge, color: C.green, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>✓</span> Everything processed locally
        </div>
      </div>

      {/* ── How your home thinks ─────────────────────────── */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: F.sm, color: C.text3, marginBottom: 8 }}>How your home thinks</div>
        {[
          { key: 'T0', icon: '⚡', color: C.green,  title: 'Instant reflex',   desc: 'Counts whistles. Trips circuits. On your device, <10ms, free.' },
          { key: 'T1', icon: '🧠', color: C.cyan,   title: 'Learned pattern',  desc: 'Heard this before. Recognized it. Also free.' },
          { key: 'T2', icon: '💬', color: C.violet, title: 'Understands you',  desc: 'Parsed your words locally. No cloud.' },
          { key: 'T3', icon: '☁️', color: C.amber,  title: 'Deep thinking',    desc: 'Asked the cloud once. Costs less than a paisa.' },
        ].map(row => {
          const isActive = activeScenario?.tier === (row.key as TierKey);
          return (
            <div key={row.key} style={{
              display: 'flex', gap: 10, padding: '7px 8px', borderRadius: 6, marginBottom: 2,
              background: isActive ? row.color + '14' : 'transparent',
              border: `1px solid ${isActive ? row.color + '40' : 'transparent'}`,
              transition: 'background 0.4s, border-color 0.4s',
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{row.icon}</span>
              <div>
                <div style={{ fontSize: F.sm, color: isActive ? row.color : C.text2, fontWeight: 600 }}>{row.title}</div>
                <div style={{ fontSize: F.badge, color: C.text3, lineHeight: 1.4 }}>{row.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alexa proactive alert */}
      <Eyebrow label="Proactive Alerts" />
      <div style={{ margin: '0 10px 6px', border: `1px solid ${C.border}`, borderRadius: 4, padding: '9px 10px', background: C.card }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            border: `1.5px solid ${C.cyan}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.cyan }} />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text }}>Alexa+</div>
            <div style={{ fontSize: 8, color: C.text3 }}>
              {activeScenario?.roomGlow === 'kitchen'  ? 'Kitchen' :
               activeScenario?.roomGlow === 'bathroom' ? 'Bathroom' :
               activeScenario?.roomGlow === 'pooja'    ? 'Pooja Room' :
               'Living Room'}
            </div>
          </div>
          {activeScenario && (
            <div style={{
              marginLeft: 'auto', fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 3,
              border: `1px solid ${C.cyanDim}`, color: C.cyan, background: C.cyanBg,
            }}>
              {activeScenario.tier} Active
            </div>
          )}
        </div>

        {activeScenario ? (
          <AlertCard scenario={activeScenario} awayBranch={awayBranch} onIntelTabChange={onIntelTabChange} />
        ) : (
          <div style={{ fontSize: 9, color: C.text3, textAlign: 'center', padding: '8px 0' }}>
            Run a scenario to see proactive alerts
          </div>
        )}
      </div>

      {/* Away mode branch toggle (only for 'away' scenario) */}
      {activeScenario?.id === 'away' && (
        <>
          <Eyebrow label="Presence Logic , Branch Toggle" />
          <div style={{ margin: '0 10px 6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            {(['pet', 'empty'] as const).map(b => {
              const on = awayBranch === b;
              return (
                <button key={b} onClick={() => onAwayBranchChange(b)} style={{
                  padding: '6px 8px', borderRadius: 4, textAlign: 'center', cursor: 'pointer',
                  border: `1px solid ${on ? C.cyanDim : C.border2}`,
                  background: on ? C.cyanBg : C.card2,
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: on ? C.cyan : C.text2 }}>
                    Branch {b === 'pet' ? 'A , Pet Detected' : 'B , Empty Home'}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Multi-agent tree */}
      <Eyebrow label="Cloud Escalation (T3)" />
      <div style={{
        margin: '0 10px 6px',
        border: `1px solid ${(activeScenario?.tier === 'T3' || lastCloudCommand) ? C.amberDim : C.border}`,
        borderRadius: 4, padding: '8px 10px',
        background: (activeScenario?.tier === 'T3' || lastCloudCommand) ? '#0A0800' : C.card,
      }}>
        {lastCloudCommand && (
          <div style={{ marginBottom: 7, padding: '5px 8px', background: C.amberBg, borderRadius: 3, border: `1px solid ${C.amberDim}` }}>
            <div style={{ fontSize: 7, color: C.amber, fontWeight: 700, marginBottom: 2 }}>LAST CLOUD COMMAND · {lastCloudCommand.time}</div>
            <div style={{ fontSize: 9, color: C.text }}>&ldquo;{lastCloudCommand.text}&rdquo;</div>
          </div>
        )}
        {(activeScenario?.tier === 'T3' || lastCloudCommand) ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: 8, fontWeight: 700, padding: '4px 8px', borderRadius: 3, whiteSpace: 'nowrap',
                border: `1px solid ${C.amberDim}`, background: C.amberBg, color: C.amber,
              }}>
                T3 SUPERVISOR
              </div>
              <div style={{ fontSize: 7, color: C.text3, marginTop: 2 }}>Bedrock · triage</div>
            </div>
            <div style={{ color: C.border2, fontSize: 11, lineHeight: 1.9, paddingTop: 2 }}>
              ├<br />├<br />└
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {(() => {
                const AGENTS = [
                  { label: 'Commerce Agent',     key: 'COMMERCE'     },
                  { label: 'Home-Control Agent', key: 'HOME_CONTROL' },
                  { label: 'Tutor Agent',        key: 'KNOWLEDGE'    },
                ];
                const active = lastSpecialist ?? '';
                const sorted = [...AGENTS].sort((a, b) =>
                  a.key === active ? -1 : b.key === active ? 1 : 0
                );
                return sorted.map(a => {
                  const isActive = a.key === active;
                  return (
                    <div key={a.key} style={{
                      fontSize: 8, padding: '3px 7px', borderRadius: 3, whiteSpace: 'nowrap',
                      border: `1px solid ${isActive ? C.amber : C.border}`,
                      background: isActive ? C.amberBg : C.card,
                      color: isActive ? C.amber : C.text2,
                      fontWeight: isActive ? 700 : 400,
                    }}>
                      {a.label}{isActive ? ' ✓' : ''}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 9, color: C.text3 }}>No cloud escalation yet — all commands handled locally</div>
        )}
      </div>

      {/* Nightly Miner */}
      <Eyebrow label="Learning Plane" />
      <div style={{ margin: '0 10px 4px', fontSize: 8, color: C.text3, lineHeight: 1.5 }}>
        Alexa+ India analyzes your device usage nightly. When it finds a pattern you repeat — like turning on the AC before bed — it writes a free T0 rule so that action becomes instant and costs nothing, forever.
      </div>
      <NightlyMiner />

      {/* MCP App Store */}
      <Eyebrow label="MCP Module App Store" />
      <div style={{ margin: '0 10px 4px', fontSize: 8, color: C.text3, lineHeight: 1.5 }}>
        Alexa natively understands Echo, Philips Hue, and standard smart devices. MCP modules extend this for uniquely Indian appliances — Kirloskar water pumps, Crompton geysers, Havells switches — by generating a control module with AI. Once installed, the device becomes a first-class Alexa citizen with T0 local rules.
      </div>
      <MCPWizard />

      {/* Commerce */}
      <div style={{ fontSize: F.sm, color: C.text, fontWeight: 600, padding: '10px 16px 4px' }}>
        Alexa handled it
      </div>
      <CommerceLayer cartItems={cartItems} />

    </div>
  );
}
