import { Suspense, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CuteAlexaModel } from './CuteAlexaModel';
import { useTourStore } from '../../store/tourStore';
import { useWebSocket } from '../../hooks/useWebSocket';

/**
 * Small persistent HUD avatar — NOT CuteAlexaCanvas (that one hardcodes
 * OrbitControls + full shadow-mapped lighting + a pedestal for the standalone
 * /cartoon lab page; too heavy to run a second full 3D scene continuously
 * next to the digital twin's own WebGL context). This is a passive, driven
 * component: no interaction, no local expression toggles — every visual cue
 * comes from tourStore, which is itself driven by real voice events.
 */
export function CartoonHudAvatar() {
  const isSpeaking = useTourStore((s) => s.isSpeaking);
  const isListening = useTourStore((s) => s.isListening);
  const lastReply = useTourStore((s) => s.lastReply);
  const { isConnected } = useWebSocket();

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

  const expression = isSpeaking ? 'happy' : isListening ? 'curious' : isSinging ? 'happy' : 'resting';
  const ledMode = isSpeaking ? 'wave' : isListening ? 'pulse' : isSinging ? 'wave' : 'solid';
  const bubbleText = !isConnected
    ? 'Reconnecting…'
    : isSpeaking && lastReply
    ? lastReply
    : null;

  return (
    <div style={{ position: 'relative', width: 160, height: 160 }}>
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

      {bubbleText && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: 8,
            maxWidth: 220,
            padding: '10px 14px',
            borderRadius: 'var(--r-md)',
            backgroundColor: 'var(--glass-bg)',
            border: `1px solid ${!isConnected ? 'var(--ember-500)' : 'var(--glass-border)'}`,
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--text-primary)',
            pointerEvents: 'none',
          }}
        >
          {bubbleText}
        </div>
      )}
    </div>
  );
}

export default CartoonHudAvatar;
