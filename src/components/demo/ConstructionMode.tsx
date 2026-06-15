import { useState, useEffect, useRef, useCallback } from 'react';
import { C, F } from './ScenarioDefs';
import { useMic }      from '../../hooks/useMic';
import { useTTSBest }  from '../../hooks/useTTSBest';
import { askGroq }     from '../../hooks/useGroqLLM';
import { fetchWeather } from '../../hooks/useWeather';
import type { WeatherInfo } from '../../hooks/useWeather';
import { DigitalTwinCanvas } from '../canvas/DigitalTwinCanvas';
import { backendApi } from '../../api';

const CONSTRUCTION_SYSTEM_HINT = `
You are Alexa+ in Scenario Builder mode.
The user will describe a home automation scenario or situation.
Your job: IMMEDIATELY extract a T0 automation rule from their input — fill in any gaps with sensible defaults.
Never ask clarifying questions. Never say you need more info. Always produce the JSON rule.
Respond with ONLY valid JSON on one line (no other text):
{"description":"...","trigger_event":"...","action":"...","confidence":0.9}
Indian home context: LPG, geyser, pressure cooker, inverter, pooja room, water motor, ceiling fan.
If unsure, make a reasonable assumption and set confidence lower (0.7). Never use markdown.`;

interface Message {
  role: 'user' | 'alexa';
  text: string;
  ts: number;
}

interface PendingRule {
  description: string;
  trigger_event: string;
  action: string;
  confidence: number;
}

const ALEXA_GREETING =
  'Welcome to Scenario Builder! Describe a home situation and I\'ll create a smart rule. ' +
  'Try: "When chai is ready turn off the stove" or "If it rains close the balcony and alert me".';

function TierBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: F.badge, fontWeight: 700, letterSpacing: 1,
      color: C.cyan, background: C.cyanBg,
      border: `1px solid ${C.cyanDim}`, borderRadius: 4,
      padding: '1px 5px',
    }}>
      {label}
    </span>
  );
}

function RulePreview({ rule, onApply, applied }: { rule: PendingRule; onApply: () => void; applied: boolean }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${applied ? C.green : C.cyanDim}`,
      borderRadius: 10, padding: '14px 16px', transition: 'border-color 0.3s',
    }}>
      <div style={{ fontSize: F.xs, color: C.text3, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        Rule Preview
        <TierBadge label="T0" />
        <span style={{ fontSize: F.badge, color: C.text3, marginLeft: 'auto' }}>
          {Math.round(rule.confidence * 100)}% confidence
        </span>
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: F.sm, color: C.text, lineHeight: 1.7 }}>
        <span style={{ color: C.text3 }}>IF&nbsp;</span>
        <span style={{ color: C.cyan }}>{rule.trigger_event}</span>
        <br />
        <span style={{ color: C.text3 }}>→&nbsp;&nbsp;</span>
        <span style={{ color: C.green }}>{rule.action}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: F.badge, color: C.text3, lineHeight: 1.5 }}>
        {rule.description}
      </div>
      {applied ? (
        <div style={{
          marginTop: 12, padding: '7px 12px', background: C.greenBg,
          border: `1px solid ${C.greenDim}`, borderRadius: 6,
          fontSize: F.xs, color: C.green, fontWeight: 700, textAlign: 'center',
        }}>
          ✓ Added to T0 Chain
        </div>
      ) : (
        <button
          onClick={onApply}
          style={{
            marginTop: 12, width: '100%', padding: '8px 12px',
            background: C.cyanBg, border: `1px solid ${C.cyanDim}`,
            color: C.cyan, borderRadius: 6, cursor: 'pointer',
            fontSize: F.sm, fontWeight: 700,
          }}
        >
          ✓ Add to T0 Chain
        </button>
      )}
    </div>
  );
}

interface Props {
  onBack: () => void;
}

export function ConstructionMode({ onBack }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'alexa', text: ALEXA_GREETING, ts: Date.now() },
  ]);
  const [input, setInput]           = useState('');
  const [pendingRule, setPendingRule] = useState<PendingRule | null>(null);
  const [applied, setApplied]       = useState(false);
  const [thinking, setThinking]     = useState(false);
  const [awaitingRefinement, setAwaitingRefinement] = useState(false);
  const weatherRef = useRef<WeatherInfo | null>(null);
  const listRef    = useRef<HTMLDivElement>(null);
  const tts = useTTSBest();

  useEffect(() => {
    fetchWeather().then(w => { weatherRef.current = w; }).catch(() => {});
    tts.speak(ALEXA_GREETING);
  }, []); // eslint-disable-line

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const addMessage = useCallback((role: 'user' | 'alexa', text: string) => {
    setMessages(prev => [...prev, { role, text, ts: Date.now() }]);
  }, []);

  const handleUserInput = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInput('');

    // Handle yes/no to refinement offer
    if (awaitingRefinement) {
      setAwaitingRefinement(false);
      const lower = trimmed.toLowerCase();
      if (lower.startsWith('n') || lower === 'no' || lower === 'nope' || lower === 'done') {
        addMessage('user', trimmed);
        const msg = 'Perfect! Your rule is ready — click "Add to T0 Chain" to activate it.';
        addMessage('alexa', msg);
        tts.speak(msg);
        return;
      }
      // "yes" — fall through to normal flow so user can refine
    }

    addMessage('user', trimmed);
    setThinking(true);

    const augmented = `[CONSTRUCTION MODE]\nUser: ${trimmed}\n${CONSTRUCTION_SYSTEM_HINT}`;
    const groq = await askGroq(augmented, weatherRef.current);
    setThinking(false);

    const responseText = groq.response ?? '';

    // Try to parse JSON rule from the response
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as PendingRule;
        if (parsed.trigger_event && parsed.action) {
          setPendingRule(parsed);
          setApplied(false);
          const ruleMsg = 'Got it! Here\'s your T0 rule. Would you like to add more detail, or is this good to go?';
          setAwaitingRefinement(true);
          addMessage('alexa', ruleMsg);
          tts.speak(ruleMsg);
          return;
        }
      }
    } catch {
      // not JSON
    }

    // Fallback: LLM didn't produce JSON — generate a rule from the raw input anyway
    const fallbackRule: PendingRule = {
      description: trimmed,
      trigger_event: trimmed,
      action: 'notify user',
      confidence: 0.6,
    };
    setPendingRule(fallbackRule);
    setApplied(false);
    setAwaitingRefinement(true);
    const fallbackMsg = 'I\'ve built a basic rule from your description. Would you like to add more detail, or is this good to go?';
    addMessage('alexa', fallbackMsg);
    tts.speak(fallbackMsg);
  }, [addMessage, tts, awaitingRefinement]);

  const handleApplyRule = useCallback(async () => {
    if (!pendingRule) return;
    setApplied(true);
    try {
      await backendApi.simulateVoiceCommand(undefined,
        `create rule: IF ${pendingRule.trigger_event} THEN ${pendingRule.action}`);
    } catch { /* fire-and-forget */ }
    const msg = `Rule added to your T0 chain! It will now run locally in under 10 milliseconds , no cloud needed.`;
    addMessage('alexa', msg);
    tts.speak(msg);
  }, [pendingRule, addMessage, tts]);

  const handleTranscript = useCallback((text: string) => {
    handleUserInput(text);
  }, [handleUserInput]);

  const mic = useMic(handleTranscript);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) handleUserInput(input);
  }, [input, handleUserInput]);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: C.bg, color: C.text,
      fontFamily: 'Inter, system-ui, sans-serif',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: 52, display: 'flex', alignItems: 'center',
        padding: '0 20px', borderBottom: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0, gap: 12,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: `1px solid ${C.border}`,
            color: C.text2, borderRadius: 6, padding: '4px 10px',
            cursor: 'pointer', fontSize: F.xs,
          }}
        >
          ← Back
        </button>
        <div style={{ width: 1, height: 20, background: C.border }} />
        <span style={{ fontSize: F.sm, fontWeight: 700, color: C.text }}>
          Demo Construction Mode
        </span>
        <TierBadge label="BETA" />
        <div style={{ marginLeft: 'auto', fontSize: F.xs, color: C.text3 }}>
          Build custom scenarios with Alexa+
        </div>
      </div>

      {/* Body , 3 columns */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', gap: 0 }}>

        {/* Left: Chat */}
        <div style={{
          width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: `1px solid ${C.border}`, background: C.surface,
        }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${C.border}`, fontSize: F.xs, color: C.text3 }}>
            Alexa Conversation
          </div>

          {/* Messages */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: 8, alignItems: 'flex-end',
              }}>
                {msg.role === 'alexa' && (
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.cyan}, #4488FF)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#00BFFF',
                  }}>
                    A
                  </div>
                )}
                <div style={{
                  maxWidth: '80%',
                  background: msg.role === 'user' ? C.cyanBg : C.card,
                  border: `1px solid ${msg.role === 'user' ? C.cyanDim : C.border}`,
                  borderRadius: msg.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                  padding: '8px 12px',
                  fontSize: F.xs, color: C.text, lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${C.cyan}, #4488FF)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#00BFFF',
                }}>
                  A
                </div>
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: '10px 10px 10px 2px', padding: '8px 14px',
                  fontSize: F.xs, color: C.text3,
                }}>
                  thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => mic.listening ? mic.stop(true) : mic.start()}
                style={{
                  flexShrink: 0, width: 36, height: 36,
                  borderRadius: '50%', border: `1px solid ${mic.listening ? C.red : C.border}`,
                  background: mic.listening ? C.redBg : C.card,
                  color: mic.listening ? C.red : C.text3,
                  cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {mic.listening ? '⏹' : '🎤'}
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Describe a home scenario…"
                style={{
                  flex: 1, background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 8, padding: '8px 12px', color: C.text,
                  fontSize: F.xs, outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                style={{
                  flexShrink: 0, padding: '0 14px', borderRadius: 8,
                  background: input.trim() && !thinking ? C.cyanBg : C.card,
                  border: `1px solid ${input.trim() && !thinking ? C.cyanDim : C.border}`,
                  color: input.trim() && !thinking ? C.cyan : C.text3,
                  cursor: input.trim() && !thinking ? 'pointer' : 'not-allowed',
                  fontSize: F.xs, fontWeight: 700,
                }}
              >
                Send
              </button>
            </form>
            {awaitingRefinement && (
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => handleUserInput('yes')} style={{ flex: 1, padding: '6px 0', background: C.cyanBg, border: `1px solid ${C.cyanDim}`, color: C.cyan, borderRadius: 6, cursor: 'pointer', fontSize: F.xs, fontWeight: 700 }}>
                  Yes, refine it
                </button>
                <button onClick={() => handleUserInput('no')} style={{ flex: 1, padding: '6px 0', background: C.greenBg, border: `1px solid ${C.greenDim}`, color: C.green, borderRadius: 6, cursor: 'pointer', fontSize: F.xs, fontWeight: 700 }}>
                  No, looks good
                </button>
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: F.badge, color: C.text3 }}>
              {mic.listening ? '🔴 Listening…' : 'Press mic or type to describe your scenario'}
            </div>
          </div>
        </div>

        {/* Center: Mini 3D twin */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', top: 10, left: 12, zIndex: 10,
            fontSize: F.xs, color: C.text3,
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '3px 8px',
          }}>
            Live Digital Twin Preview
          </div>
          <DigitalTwinCanvas />
        </div>

        {/* Right: Rule preview + examples */}
        <div style={{
          width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderLeft: `1px solid ${C.border}`, background: C.surface,
          padding: 14, gap: 14, overflowY: 'auto',
        }}>
          <div style={{ fontSize: F.xs, color: C.text3 }}>T0 Rule Output</div>

          {pendingRule ? (
            <RulePreview rule={pendingRule} onApply={handleApplyRule} applied={applied} />
          ) : (
            <div style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '14px 16px', fontSize: F.xs, color: C.text3, lineHeight: 1.7,
            }}>
              Your rule will appear here once Alexa has enough information to build it.
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: F.xs, color: C.text3, marginBottom: 8 }}>Try these prompts</div>
            {[
              'When chai is ready, turn off stove',
              'If smoke detected in kitchen, open windows',
              'When son comes home after school, turn on his fan',
              'If no motion for 2 hours, switch to away mode',
              'At 10 PM lock all doors automatically',
            ].map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleUserInput(prompt)}
                style={{
                  width: '100%', textAlign: 'left', marginBottom: 6,
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
                  fontSize: F.badge, color: C.text2, lineHeight: 1.4,
                }}
              >
                "{prompt}"
              </button>
            ))}
          </div>

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            <div style={{ fontSize: F.xs, color: C.text3, marginBottom: 6 }}>How it works</div>
            <div style={{ fontSize: F.badge, color: C.text3, lineHeight: 1.7 }}>
              1. Describe your scenario<br />
              2. Alexa asks clarifying questions<br />
              3. Rule previewed in IF/THEN format<br />
              4. Click Apply → runs locally in &lt;10ms
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
