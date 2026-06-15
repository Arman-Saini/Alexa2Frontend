import { useState, useRef, useCallback } from 'react';
import { C, F, SCENARIOS, IDLE_WAVEFORM } from './ScenarioDefs';
import type { ActiveScenario, PersonaKey } from './ScenarioDefs';
import { WaveformCanvas } from './WaveformCanvas';
import type { LiveEvent } from './ColB_IntelligenceLayer';
import { useBackendOnline } from '../../hooks/useBackendOnline';

const PERSONAS: { key: PersonaKey; name: string; lang: string }[] = [
  { key: 'dadi',   name: 'Grandparent', lang: 'Hindi'    },
  { key: 'parent', name: 'Parent',      lang: 'Hinglish' },
  { key: 'child',  name: 'Son',         lang: 'English'  },
];

// Which moments are relevant to whom , Grandparent sees daily-home/safety moments,
// Parent sees household-management moments, Son sees study/social/late-night moments.
const SCENARIO_PERSONAS: Record<string, PersonaKey[]> = {
  pooja:          ['dadi'],
  chai:           ['dadi'],
  pressure:       ['dadi'],
  milk_overflow:  ['dadi'],
  geyser:         ['dadi', 'parent'],
  jeera:          ['parent'],
  grid:           ['parent', 'child'],
  away:           ['parent', 'child'],
  guest_doorbell: ['parent', 'child'],
  son_study:      ['child'],
  night_check:    ['child'],
};
const ALL_PERSONAS: PersonaKey[] = ['dadi', 'parent', 'child'];

// Self-contained voice ring — owns its own SpeechRecognition so the prop
// relay through DemoDashboard can't silently drop transcripts.
function AlexaVoiceRing({ isThinking, voiceResponse, voiceTier, onTranscript }: {
  isThinking: boolean;
  voiceResponse?: string;
  voiceTier?: string;
  onTranscript: (text: string) => void;
}) {
  const [listening, setListening]   = useState(false);
  const [liveText,  setLiveText]    = useState('');
  const [micError,  setMicError]    = useState<string | null>(null);
  const recRef      = useRef<SpeechRecognition | null>(null);
  const activeRef   = useRef(false);
  const bufferRef   = useRef('');
  const onTxRef     = useRef(onTranscript);
  onTxRef.current   = onTranscript;
  const backendOnline = useBackendOnline();

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();

  function buildRec(): SpeechRecognition | null {
    const w = window as typeof window & { webkitSpeechRecognition?: new () => SpeechRecognition; SpeechRecognition?: new () => SpeechRecognition };
    const Ctor = w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
    if (!Ctor) return null;
    const r = new Ctor();
    r.lang = 'en-US'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    return r;
  }

  const attachHandlers = useCallback((rec: SpeechRecognition) => {
    rec.onstart = () => setListening(true);
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) bufferRef.current += seg + ' ';
        else interim += seg;
      }
      setLiveText(bufferRef.current + interim);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      // "network" is transient (Google speech service hiccup) — let onend restart it
      if (e.error === 'network') return;
      setMicError(e.error === 'not-allowed' ? 'Mic access denied' : `Speech error: ${e.error}`);
      activeRef.current = false;
      setListening(false);
    };
    rec.onend = () => {
      if (!activeRef.current) return;
      recRef.current = null;
      const fresh = buildRec();
      if (!fresh) return;
      attachHandlers(fresh);
      recRef.current = fresh;
      // Small delay before restart to avoid rapid-fire loops on persistent network errors
      setTimeout(() => { if (activeRef.current) try { fresh.start(); } catch { /* ignore */ } }, 300);
    };
  }, []);

  const start = useCallback(async () => {
    if (activeRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      s.getTracks().forEach(t => t.stop());
    } catch {
      setMicError('Mic access denied'); return;
    }
    const rec = buildRec();
    if (!rec) { setMicError('Speech recognition requires Chrome or Edge'); return; }
    setMicError(null); setLiveText(''); bufferRef.current = '';
    activeRef.current = true;
    attachHandlers(rec);
    recRef.current = rec;
    try { rec.start(); } catch { setMicError('Could not start mic'); activeRef.current = false; }
  }, [attachHandlers]);

  const stop = useCallback(() => {
    activeRef.current = false;
    const rec = recRef.current;
    if (rec) { rec.onend = null; try { rec.stop(); } catch {} recRef.current = null; }
    setListening(false);
    const text = bufferRef.current.trim();
    bufferRef.current = '';
    setLiveText('');
    if (text) onTxRef.current(text);
  }, []);

  const handleClick = () => { if (listening) stop(); else start(); };

  const tierColors: Record<string, string> = { T0: C.green, T1: C.cyan, T2: C.violet, T3: C.amber };

  return (
    <div>
      <style>{`@keyframes loBar{0%,100%{transform:scaleY(0.25)}50%{transform:scaleY(1)}}`}</style>

      {/* Greeting */}
      <div style={{ padding: '16px 16px 12px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{greeting} 👋</div>
        <div style={{ fontSize: F.sm, color: C.text3, marginTop: 2 }}>Smart Home Digital Twin</div>
      </div>

      {/* Ring button */}
      <div style={{ textAlign: 'center', padding: '0 0 8px' }}>
        <div
          onClick={handleClick}
          style={{
            position: 'relative', width: 96, height: 96, borderRadius: '50%',
            background: listening
              ? 'conic-gradient(from 180deg, #00C8FF, #0090C8, #005580, #003355, #0090C8, #00C8FF)'
              : 'conic-gradient(from 180deg, #00C8FF, #0090C8, #005580, #003355, #0090C8, #00C8FF)',
            boxShadow: listening
              ? '0 0 28px rgba(0,168,224,0.6)'
              : '0 0 10px rgba(0,168,224,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', margin: '0 auto',
            transition: 'box-shadow 0.3s',
            transform: listening ? 'scale(1.06)' : 'scale(1)',
          }}
        >
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#0D1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isThinking ? (
              <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid #E8E8E6', borderTopColor: 'transparent', animation: 'spin .7s linear infinite' }} />
            ) : listening ? (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#00C8FF"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#E8E8E6">
                <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zm-7 9a7 7 0 0014 0h2a9 9 0 01-18 0h2z"/>
              </svg>
            )}
          </div>
          {listening && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: '#E8E8E6', opacity: 0.15, animation: 'ping 1.2s ease-out infinite' }} />}
        </div>

        {/* Status + backend badge inline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <span style={{ fontSize: F.sm, color: C.text3 }}>
            {isThinking ? 'Thinking…' : listening ? 'Listening, tap to stop' : 'Tap to speak'}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            border: `1px solid ${backendOnline ? '#2E7D52' : '#5A4A20'}`,
            background: backendOnline ? 'rgba(46,160,90,0.14)' : 'rgba(160,130,40,0.14)',
            color: backendOnline ? '#5BE39A' : '#E0B450',
          }}>● {backendOnline ? 'Cloud' : 'Local'}</span>
        </div>

        {micError && <div style={{ fontSize: F.xs, color: '#F87171', marginTop: 6 }}>{micError}</div>}

        {/* Live interim transcript */}
        {listening && (
          <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: 20 }}>
              {Array.from({ length: 11 }).map((_, i) => (
                <span key={i} style={{ width: 3, height: '100%', borderRadius: 2, transformOrigin: 'bottom', background: 'linear-gradient(#00C8FF,#0080B0)', animation: `loBar ${0.55 + (i % 4) * 0.12}s ease-in-out infinite`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
            <div style={{ fontSize: F.xs, fontStyle: 'italic', color: C.text3, marginTop: 5 }}>
              {liveText ? `"${liveText}"` : 'Listening…'}
            </div>
          </div>
        )}
      </div>

      {/* Response */}
      {(voiceResponse || isThinking) && (
        <div style={{ margin: '0 12px 8px', padding: '10px 12px', borderRadius: 8, background: C.card, border: `1px solid ${C.border2}` }}>
          {isThinking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: C.cyan, fontSize: F.badge }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'spin .6s linear infinite' }} />
              Thinking…
              <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes ping{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.5);opacity:0}}`}</style>
            </div>
          )}
          {voiceResponse && !isThinking && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.cyan }} />
                <span style={{ fontSize: F.badge, color: C.text3, letterSpacing: '0.08em' }}>ALEXA</span>
                {voiceTier && (
                  <span style={{ fontSize: F.badge, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${tierColors[voiceTier] ?? C.cyan}18`, border: `1px solid ${tierColors[voiceTier] ?? C.cyan}44`, color: tierColors[voiceTier] ?? C.cyan }}>
                    {voiceTier}
                  </span>
                )}
              </div>
              <div style={{ fontSize: F.xs, color: C.text2, lineHeight: 1.6 }}>{voiceResponse}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface Props {
  activeScenario: ActiveScenario | null;
  persona: PersonaKey;
  onPersonaChange: (p: PersonaKey) => void;
  onScenarioRun: (s: ActiveScenario) => void;
  running: string | null;
  whistleCount: number;
  onMicToggle?: () => void;
  isListening?: boolean;
  isThinking?: boolean;
  voiceResponse?: string;
  voiceTier?: string;
  voiceLiveText?: string;
  onVoiceText?: (t: string) => void;
}

export function ColA_AmbientEngine({ activeScenario, persona, onPersonaChange, onScenarioRun, running, whistleCount, events = [], isThinking = false, voiceResponse, voiceTier, onVoiceText }: Props & { events?: LiveEvent[] }) {
  const profile = activeScenario?.waveformProfile ?? IDLE_WAVEFORM;

  void whistleCount;

  return (
    <div style={{ background: 'transparent', display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 1. ALEXA RING , hero element (self-contained mic + greeting) */}
      <AlexaVoiceRing
        isThinking={isThinking}
        voiceResponse={voiceResponse}
        voiceTier={voiceTier}
        onTranscript={onVoiceText ?? (() => {})}
      />

      {/* 2. WHO'S HOME */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ fontSize: F.badge, color: C.text3, textAlign: 'center', marginBottom: 8 }}>
          Who's home right now?
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {PERSONAS.map(p => (
            <button key={p.key} onClick={() => onPersonaChange(p.key)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', border: 'none',
              background: persona === p.key ? C.goldBg : C.card,
              outline: persona === p.key ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
            }}>
              <div style={{ fontSize: F.xs, fontWeight: 600, color: persona === p.key ? C.gold : C.text2 }}>{p.name}</div>
              <div style={{ fontSize: F.badge, color: C.text3 }}>{p.lang}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. WAVEFORM , keep it, just retitle */}
      <div style={{ padding: '0 12px 4px' }}>
        <div style={{ fontSize: F.badge, color: C.text3, marginBottom: 4 }}>
          {activeScenario ? `Hearing , ${activeScenario.roomName}` : 'Listening quietly...'}
        </div>
        <div data-tour-id="tour-waveform" style={{ background: '#060A04', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 8px' }}>
          <WaveformCanvas profile={profile} height={32} />
        </div>
        {activeScenario && 'modelExplainer' in activeScenario && (activeScenario as { modelExplainer?: string }).modelExplainer && (
          <div style={{ marginTop: 5, padding: '6px 8px', background: C.card, borderRadius: 5, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: F.badge, color: C.text3, lineHeight: 1.55 }}>
              {(activeScenario as { modelExplainer?: string }).modelExplainer}
            </div>
          </div>
        )}
      </div>

      {/* 4. SIMULATE A MOMENT */}
      <div style={{ padding: '8px 12px 4px' }}>
        <div style={{ fontSize: F.badge, color: C.text3, marginBottom: 6 }}>
          Moments for {PERSONAS.find(p => p.key === persona)?.name ?? 'this home'} →
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SCENARIOS.filter(sc => (SCENARIO_PERSONAS[sc.id] ?? ALL_PERSONAS).includes(persona)).map(sc => (
            <button key={sc.id} onClick={() => onScenarioRun(sc)}
              disabled={!!running}
              style={{
                padding: '9px 11px', borderRadius: 7, cursor: running ? 'default' : 'pointer',
                background: running === sc.id ? C.goldBg : C.card,
                border: `1px solid ${running === sc.id ? C.gold : C.border}`,
                textAlign: 'left', opacity: running && running !== sc.id ? 0.6 : 1,
              }}>
              <div style={{ fontSize: F.sm, color: C.text, fontWeight: 500 }}>
                {sc.humanTitle}
              </div>
              <div style={{ fontSize: F.badge, color: C.text3, marginTop: 2 }}>
                {sc.roomName} · {sc.humanTier}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. MOMENT FEED */}
      {events.length > 0 && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          <div style={{ fontSize: F.badge, color: C.text3, marginBottom: 6 }}>What happened</div>
          {events.slice(0, 6).map(ev => (
            <div key={ev.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', marginTop: 4, flexShrink: 0,
                background: ev.tier === 'T3' ? C.amber : ev.tier === 'T1' ? C.cyan : C.green,
              }} />
              <div>
                <div style={{ fontSize: F.xs, color: C.text, lineHeight: 1.4 }}>{ev.description}</div>
                <div style={{ fontSize: F.badge, color: C.text3, marginTop: 1 }}>{ev.time}</div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
