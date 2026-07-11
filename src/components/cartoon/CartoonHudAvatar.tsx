import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CuteAlexaModel } from './CuteAlexaModel';
import { useTourStore } from '../../store/tourStore';
import { useWebSocket } from '../../hooks/useWebSocket';
import { emitInteraction } from '../../store/interactionEvents';

const SIZE = 260;
const EDGE_PAD = 24;

// Shown when nothing real has happened yet — rotates so the avatar always
// has something to nudge the user toward trying.
const SUGGESTIONS = [
  'Try: "Turn on Movie Night"',
  'Ask me: "Is the front door locked?"',
  'Try: "Turn off the kitchen light"',
  'If 4 + 5 is odd, turn off the living room light',
  'Ask me: "Deploy the robot vacuum"',
];

/**
 * Small persistent HUD avatar — NOT CuteAlexaCanvas (that one hardcodes
 * OrbitControls + full shadow-mapped lighting + a pedestal for the standalone
 * /cartoon lab page; too heavy to run a second full 3D scene continuously
 * next to the digital twin's own WebGL context). This is a passive, driven
 * component: no interaction, no local expression toggles — every visual cue
 * comes from tourStore, which is itself driven by real voice events.
 *
 * Pinned to the bottom-right corner (draggable if the user wants to move
 * it out of the way). Whenever there's no real phone reply to show, the
 * speech bubble cycles through suggested things to try.
 */
export function CartoonHudAvatar() {
  const isSpeaking = useTourStore((s) => s.isSpeaking);
  const isListening = useTourStore((s) => s.isListening);
  const lastReply = useTourStore((s) => s.lastReply);
  const lastReplyAt = useTourStore((s) => s.lastReplyAt);
  const lastReplySource = useTourStore((s) => s.lastReplySource);
  const { isConnected } = useWebSocket();

  // A real reply sticks around for a bit, then the bubble reverts to
  // rotating suggestions — otherwise the last thing Alexa said would be
  // stuck there forever.
  const [replyExpired, setReplyExpired] = useState(false);
  useEffect(() => {
    setReplyExpired(false);
    if (!lastReplyAt) return;
    const id = setTimeout(() => setReplyExpired(true), 15000);
    return () => clearTimeout(id);
  }, [lastReplyAt]);

  // Occasional idle personality quirk: a brief spontaneous singing burst
  // every so often while nothing else is going on. Purely cosmetic, local
  // to this component — not driven by tourStore since nothing else needs
  // to react to it.
  const [isSinging, setIsSinging] = useState(false);
  const isSpeakingRef = useRef(isSpeaking);
  isSpeakingRef.current = isSpeaking;
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  useEffect(() => {
    let scheduleTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      const delay = 20000 + Math.random() * 25000; // every 20-45s
      scheduleTimer = setTimeout(() => {
        if (!isSpeakingRef.current && !isListeningRef.current) {
          setIsSinging(true);
          hideTimer = setTimeout(() => setIsSinging(false), 4000 + Math.random() * 2000);
        }
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    return () => {
      clearTimeout(scheduleTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Rotating "try this" suggestions — only meaningful once nothing real
  // (a genuine phone reply) has shown up yet.
  const [suggestionIdx, setSuggestionIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSuggestionIdx((i) => (i + 1) % SUGGESTIONS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const expression = isSpeaking ? 'happy' : isListening ? 'curious' : isSinging ? 'happy' : 'resting';
  const ledMode = isSpeaking ? 'wave' : isListening ? 'pulse' : isSinging ? 'wave' : 'solid';

  const hasRealReply = lastReplySource === 'phone' && !!lastReply && !replyExpired;
  const bubbleText = !isConnected
    ? 'Reconnecting…'
    : hasRealReply
    ? lastReply
    : SUGGESTIONS[suggestionIdx];
  const bubbleLabel = !isConnected ? 'OFFLINE' : hasRealReply ? 'ALEXA REPLIED' : 'TRY SAYING';
  const accent = !isConnected ? '#e06b4a' : hasRealReply ? '#c08662' : '#2e2a26';

  // Wanders the corner region near its bottom-right home — never far enough
  // to lose track of, just enough to feel alive. Dragging overrides it.
  const homeAnchor = () => ({
    left: window.innerWidth - SIZE - EDGE_PAD,
    top: window.innerHeight - SIZE - EDGE_PAD,
  });
  const wanderAnchor = () => {
    const home = homeAnchor();
    const range = 160;
    return {
      left: Math.min(window.innerWidth - SIZE - 8, Math.max(8, home.left - Math.random() * range)),
      top: Math.min(window.innerHeight - SIZE - 8, Math.max(8, home.top - Math.random() * range)),
    };
  };

  const [anchor, setAnchor] = useState(() =>
    typeof window === 'undefined' ? { left: 0, top: 0 } : homeAnchor()
  );
  const isDraggingRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!isDraggingRef.current) setAnchor(wanderAnchor());
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);

  const clickTimesRef = useRef<number[]>([]);
  const pointerDownAtRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origLeft: anchor.left, origTop: anchor.top };
    isDraggingRef.current = true;
    setIsDragging(true);
    pointerDownAtRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, origLeft, origTop } = dragRef.current;
    setAnchor({ left: origLeft + (e.clientX - startX), top: origTop + (e.clientY - startY) });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);

    const down = pointerDownAtRef.current;
    pointerDownAtRef.current = null;
    if (!down) return;
    const movedPx = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const heldMs = performance.now() - down.time;
    if (movedPx > 6 || heldMs > 250) return; // was a drag, not a click

    const now = performance.now();
    clickTimesRef.current = [...clickTimesRef.current.filter((t) => now - t < 2000), now];
    if (clickTimesRef.current.length >= 5) {
      clickTimesRef.current = [];
      emitInteraction({ type: 'easter-egg:avatar-tickle' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        left: anchor.left,
        top: anchor.top,
        zIndex: 45,
        width: SIZE,
        height: SIZE,
        transition: isDragging ? 'none' : 'left 2.4s ease-in-out, top 2.4s ease-in-out',
        pointerEvents: 'none',
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'absolute',
          left: SIZE * 0.2,
          top: SIZE * 0.2,
          width: SIZE * 0.6,
          height: SIZE * 0.6,
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          pointerEvents: 'auto',
        }}
      >
      <Canvas
        camera={{ position: [0, 0.6, 6.5], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, powerPreference: 'low-power' }}
      >
        <ambientLight intensity={0.8} color="#fffcf5" />
        <directionalLight position={[3, 5, 3]} intensity={1.0} color="#fff5e6" />
        <Suspense fallback={null}>
          <CuteAlexaModel
            expression={expression}
            bodyColor="#2e323b"
            ledColor="#00f3ff"
            ledMode={ledMode}
            outlineThickness={1.3}
            explodedProgress={0}
            isHovered={false}
            isClicked={false}
            isPanelOpen={false}
            setIsPanelOpen={() => {}}
            isSpeaking={isSpeaking}
            isSinging={isSinging}
          />
        </Suspense>
      </Canvas>
      </div>

      {bubbleText && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 10,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              minWidth: 180,
              maxWidth: 240,
              padding: '10px 14px',
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.96)',
              border: `2px solid ${accent}`,
              boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '0.12em',
                color: hasRealReply ? '#c08662' : '#8a8378',
                marginBottom: 4,
                fontWeight: 800,
              }}
            >
              {bubbleLabel}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                lineHeight: 1.35,
                color: '#211f1c',
              }}
            >
              {bubbleText}
            </div>
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: -6,
              right: 24,
              width: 12,
              height: 12,
              backgroundColor: 'rgba(255,255,255,0.96)',
              borderRight: `2px solid ${accent}`,
              borderBottom: `2px solid ${accent}`,
              transform: 'rotate(45deg)',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default CartoonHudAvatar;
