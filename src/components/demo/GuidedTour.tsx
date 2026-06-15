// GuidedTour , element-aware walkthrough overlay.
// Each step finds its target via data-tour-id, measures it with
// getBoundingClientRect(), and renders a box-shadow spotlight exactly over it.
// The explanation card auto-positions to avoid viewport edges.

import { useState, useEffect, useLayoutEffect } from 'react';
import { C, F } from './ScenarioDefs';

// ── Step definitions ──────────────────────────────────────────────────────────

interface TourStep {
  id: string;
  targetId?: string;   // data-tour-id value; omit for a centered modal step
  title: string;
  body: string;
  badge?: string;
  badgeColor?: string;
}

const STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Alexa+ India , Smart Home AI',
    body: 'This is a live digital twin of a smart Indian home. Every panel here connects to a real backend. You\'ll learn what each part does and why , click Next or press the right arrow key.',
    badge: 'WELCOME',
    badgeColor: C.cyan,
  },
  {
    id: 'waveform',
    targetId: 'tour-waveform',
    title: 'Acoustic Core , Live Waveform',
    body: 'This shows the live audio signal coming from the home\'s microphone array. At rest it\'s a gentle idle wave. When a sound event fires , jeera burning, a pressure cooker whistle, or a power cut , the waveform spikes and changes color to reflect what the AI heard.',
    badge: 'AUDIO',
    badgeColor: C.cyan,
  },
  {
    id: 'scenarios',
    targetId: 'tour-scenario-sandbox',
    title: 'Scenario Sandbox , click any button',
    body: 'Six real Indian home scenarios live here. Click any one to trigger a live simulation:\n\n• T0 Reflex (<10ms) , jeera burning, pressure whistle, grid failure, geyser\n• T1 Edge ML (<80ms) , audio embeddings\n• T2 Local SLM (<300ms) , temporal regime shifts\n• T3 Bedrock (~1s) , away mode with pet presence fusion\n\nWatch the 3D house and waveform react when you click.',
    badge: 'TRY IT',
    badgeColor: C.green,
  },
  {
    id: 'house',
    targetId: 'tour-canvas',
    title: 'Interactive 3D Digital Twin',
    body: 'The 3D house mirrors the physical home in real time. Click any room to zoom in. Click any device to toggle it. Drag an asset from the library panel to place it on the floor.\n\nWhen a scenario fires, the relevant room lights up: burners glow orange, the diya brightens during pooja, the whole house goes dark on a grid failure, and BLE beacons pulse in the living room when you\'re away.',
    badge: '3D',
    badgeColor: C.violet,
  },
  {
    id: 'intelligence',
    targetId: 'tour-intelligence',
    title: 'Intelligence Layer',
    body: 'This shows how each decision was made:\n\n• Compute Cascade , animated pulse showing which tier (T0→T3) handled the request\n• Memory Vaults , STM holds the last 12 events; LTM builds usage patterns over weeks. The geyser scenario fires because LTM noticed the 45-min anomaly.\n• Agent Tree , T3 tasks split into sub-agents (geo, inventory, safety)\n• Knowledge Base , domain vocabulary the SLM was fine-tuned on',
    badge: 'INTELLIGENCE',
    badgeColor: C.violet,
  },
  {
    id: 'chain',
    targetId: 'tour-right-panel',
    title: 'T0 Chain , Add Rules Live',
    body: 'Switch to the "T0 Chain" tab here. It shows every active reflex rule with its trigger and action.\n\nClick "Mine Patterns" to have the AI analyze recent events and propose new rules. Confirm or skip each proposal , confirmed rules become permanent reflexes that run in under 10 milliseconds with zero cloud cost.\n\nThis is how your home literally learns from your behavior.',
    badge: 'CHAIN',
    badgeColor: C.green,
  },
  {
    id: 'mic',
    targetId: 'tour-alexa-mic',
    title: 'Voice , Talk to Alexa',
    body: 'Yeh hai Alexa ka mic button , tap karo aur seedha baat karo. Kuch bhi bolo:\n\n• "Turn on the lights"\n• "Jeera is burning"\n• "I\'m leaving"\n• "Sleep mode"\n• "LPG level kya hai?"\n\nAapki awaaz locally transcribe hoti hai, fir T0→T3 compute cascade se route hoti hai. Response Alexa bolegi , aur response card pe dikhega.\n\nTop-right mein speaker button se Alexa ko mute kar sakte ho.',
    badge: 'VOICE',
    badgeColor: C.amber,
  },
  {
    id: 'done',
    title: "You're all set",
    body: 'Click any scenario button on the left to start a live demo. Watch the 3D house, waveform, and intelligence layer react together.\n\nYou can re-open this tour anytime from the "Tour" button in the header. Keyboard: ← → arrows to navigate, Esc to close.',
    badge: 'GO',
    badgeColor: C.cyan,
  },
];

const TOUR_KEY = 'alexa-tour-seen-v2';

// ── Spotlight + card positioning ──────────────────────────────────────────────

interface TargetRect { top: number; left: number; width: number; height: number }

function useTargetRect(targetId: string | undefined, step: number): TargetRect | null {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useLayoutEffect(() => {
    if (!targetId) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector(`[data-tour-id="${targetId}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    // Retry once after paint in case layout hasn't settled
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [targetId, step]);

  return rect;
}

function cardPosition(rect: TargetRect | null): React.CSSProperties {
  const CARD_W = 420;
  const MARGIN = 20;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    // Centered modal
    return {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: CARD_W,
    };
  }

  // Try right of target
  const rightLeft = rect.left + rect.width + MARGIN;
  if (rightLeft + CARD_W < vw - MARGIN) {
    return {
      position: 'fixed',
      left: rightLeft,
      top: Math.min(Math.max(rect.top, MARGIN), vh - 380),
      width: CARD_W,
    };
  }

  // Try left of target
  const leftLeft = rect.left - CARD_W - MARGIN;
  if (leftLeft >= MARGIN) {
    return {
      position: 'fixed',
      left: leftLeft,
      top: Math.min(Math.max(rect.top, MARGIN), vh - 380),
      width: CARD_W,
    };
  }

  // Fall back: center horizontally, below target
  const top = Math.min(rect.top + rect.height + MARGIN, vh - 380);
  return {
    position: 'fixed',
    left: Math.max(MARGIN, (vw - CARD_W) / 2),
    top: Math.max(MARGIN, top),
    width: Math.min(CARD_W, vw - MARGIN * 2),
  };
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export function GuidedTour({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current   = STEPS[step];
  const isLast    = step === STEPS.length - 1;
  const targetRect = useTargetRect(current.targetId, step);
  const cardStyle  = cardPosition(targetRect);

  const next = () => {
    if (isLast) { onClose(); localStorage.setItem(TOUR_KEY, '1'); }
    else setStep(s => s + 1);
  };
  const prev = () => setStep(s => Math.max(0, s - 1));
  const skip = () => { onClose(); localStorage.setItem(TOUR_KEY, '1'); };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [step]);

  const PAD = 6; // spotlight padding around target

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, pointerEvents: 'none' }}>

      {/* Dim overlay , click-through except on the card */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', pointerEvents: 'auto' }}
        onClick={skip}
      />

      {/* Spotlight: box-shadow punches a hole exactly over the target */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top:    targetRect.top  - PAD,
            left:   targetRect.left - PAD,
            width:  targetRect.width  + PAD * 2,
            height: targetRect.height + PAD * 2,
            borderRadius: 6,
            // The massive box-shadow darkens everything outside this rect
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.72), 0 0 0 2px ${C.cyan}`,
            outline: `2px solid ${C.cyan}`,
            outlineOffset: 2,
            pointerEvents: 'none',
            zIndex: 9002,
            transition: 'top 0.35s ease, left 0.35s ease, width 0.35s ease, height 0.35s ease',
          }}
        />
      )}

      {/* Connector arrow , a simple chevron pointing from card toward spotlight */}
      {targetRect && (() => {
        const CARD_W = typeof cardStyle.width === 'number' ? cardStyle.width : 420;
        const cardLeft = typeof cardStyle.left === 'number' ? cardStyle.left : 0;
        const cardTop  = typeof cardStyle.top  === 'number' ? cardStyle.top  : 0;
        const isRight  = cardLeft > targetRect.left + targetRect.width;
        const isLeft   = (cardLeft + CARD_W) < targetRect.left;

        if (!isRight && !isLeft) return null;

        const arrowX = isRight
          ? cardLeft - 10
          : cardLeft + CARD_W + 2;
        const arrowY = cardTop + 60;
        const dir    = isRight ? '▸' : '◂';

        return (
          <div style={{
            position: 'fixed',
            left: arrowX, top: arrowY,
            fontSize: 18, color: C.cyan,
            pointerEvents: 'none', zIndex: 9003,
            textShadow: `0 0 8px ${C.cyan}`,
          }}>
            {dir}
          </div>
        );
      })()}

      {/* Explanation card */}
      <div
        style={{
          ...cardStyle,
          zIndex: 9003,
          background: C.surface,
          border: `1px solid ${C.border2}`,
          borderRadius: 10,
          boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px ${C.border}`,
          pointerEvents: 'auto',
          maxHeight: '82vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Pinned header */}
        <div style={{ padding: '22px 24px 0', flexShrink: 0 }}>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                onClick={() => setStep(i)}
                style={{
                  height: 5, borderRadius: 3,
                  width: i === step ? 20 : 5,
                  background: i === step ? C.cyan : i < step ? C.cyanDim : C.border,
                  transition: 'width 0.2s, background 0.2s',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>

          {/* Badge */}
          {current.badge && (
            <div style={{
              display: 'inline-block', marginBottom: 8,
              fontSize: F.badge, fontWeight: 700, padding: '2px 8px', borderRadius: 3,
              background: `${current.badgeColor ?? C.cyan}18`,
              border: `1px solid ${current.badgeColor ?? C.cyan}44`,
              color: current.badgeColor ?? C.cyan,
              letterSpacing: '0.10em',
            }}>
              {current.badge}
            </div>
          )}

          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8, lineHeight: 1.35 }}>
            {current.title}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '0 24px', overflowY: 'auto', flexGrow: 1, minHeight: 0 }}>
          <div style={{ fontSize: F.xs, color: C.text2, lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {current.body}
          </div>
        </div>

        {/* Pinned footer */}
        <div style={{ padding: '12px 24px 18px', flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          {/* Step counter */}
          <div style={{ fontSize: F.tiny, color: C.text3, marginBottom: 10 }}>
            Step {step + 1} of {STEPS.length}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={skip} style={{ fontSize: F.tiny, color: C.text3, background: 'none', border: 'none', cursor: 'pointer' }}>
              Skip tour
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              {step > 0 && (
                <button
                  onClick={prev}
                  style={{
                    fontSize: F.xs, fontWeight: 600, padding: '6px 14px', borderRadius: 5,
                    background: C.card, border: `1px solid ${C.border}`, color: C.text2, cursor: 'pointer',
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={next}
                style={{
                  fontSize: F.xs, fontWeight: 700, padding: '6px 18px', borderRadius: 5,
                  background: C.cyan, border: 'none', color: '#fff', cursor: 'pointer',
                  boxShadow: `0 0 14px ${C.cyan}55`,
                }}
              >
                {isLast ? 'Start exploring' : 'Next →'}
              </button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 8, fontSize: F.badge, color: C.text3 }}>
            ← → arrow keys · Esc to close
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowTour(): boolean {
  try { return !localStorage.getItem(TOUR_KEY); } catch { return false; }
}
