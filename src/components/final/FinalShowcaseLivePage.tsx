import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { FinalAlexaCanvas } from './FinalAlexaCanvas';
import { LAYER_DETAILS } from './FinalLayerGroup';
import { SmartphoneWidget, DEFAULT_SUMMARIES, type ChatSummary } from '../phone/SmartphoneWidget';
import { Canvas3DBoundary } from '../shared/Canvas3DBoundary';

type ExpressionType = 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
type LedModeType = 'solid' | 'pulse' | 'wave' | 'off';

const TIER_COLOR: Record<string, string> = {
  'T0·local': '#3bf574',
  'T1·local': '#3da5e0',
  'T3·cloud': '#ff3333',
};
const DEFAULT_LED_COLOR = '#00f3ff';

// Sequential-reveal timing: how long each layer stays lifted (with its
// text visible) before the next one takes over.
const LAYER_HOLD_MS = 1600;
// Fixed cpuScrollProgress the CPU sits at for the whole per-layer reveal —
// inside the existing splay band so the stack is visibly separated from
// the body without fighting the continuous scroll-phase math.
const REVEAL_SCROLL_PROGRESS = 0.45;

/**
 * Reactive twin of FinalShowcasePage. A live phone request drives a
 * sequential per-layer reveal: layer 0 lifts with its explanation visible,
 * settles, layer 1 does the same, and so on through all 6 hardware layers
 * — then the CPU folds back into Alexa's body and she reassembles, reusing
 * the same "Go to Joined State"/assemble machinery the manual buttons use.
 */
export function FinalShowcaseLivePage() {
  const [expression, setExpression] = useState<ExpressionType>('resting');
  const [bodyColor] = useState<string>('#e2d5c3');
  const [ledColor, setLedColor] = useState<string>(DEFAULT_LED_COLOR);
  const [ledMode] = useState<LedModeType>('pulse');
  const [outlineThickness] = useState<number>(1.3);
  const [explodedProgress, setExplodedProgress] = useState<number>(0.0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isSpeaking] = useState<boolean>(false);
  const [isSinging] = useState<boolean>(false);

  const [isExploding, setIsExploding] = useState(false);

  // ── Dismantle Sequence state (shared by manual buttons + auto reveal) ────
  const [dismantleSequenceActive, setDismantleSequenceActive] = useState(false);
  const [cpuScrollProgress, setCpuScrollProgress] = useState(0);
  const [isCpuPlaying, setIsCpuPlaying] = useState<boolean>(false);
  const [cpuTargetProgress, setCpuTargetProgress] = useState<number | null>(null);
  const cpuScrollContainerRef = useRef<HTMLDivElement>(null);
  const [cameraResetSignal, setCameraResetSignal] = useState<number | undefined>(undefined);
  const [alexaOpacityOverride, setAlexaOpacityOverride] = useState<number | null>(null);

  // ── Sequential per-layer reveal state ─────────────────────────────────────
  const [focusLayerIndex, setFocusLayerIndex] = useState<number | null>(null);
  const sequenceTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Phone bridge ──────────────────────────────────────────────────────────
  const [summaries, setSummaries] = useState<ChatSummary[]>(DEFAULT_SUMMARIES);
  const [externalCommand, setExternalCommand] = useState('');
  const lastSeenIdRef = useRef<string | null>(null);

  const clearSequenceTimeouts = () => {
    sequenceTimeoutsRef.current.forEach(clearTimeout);
    sequenceTimeoutsRef.current = [];
  };

  // Function to trigger animation to a specific progress
  const animateToProgress = (target: number) => {
    setDismantleSequenceActive(true);
    setCpuTargetProgress(target);
    setIsCpuPlaying(true);
  };

  // Manual state buttons interrupt any in-flight per-layer reveal so the
  // two driving mechanisms (fixed reveal progress vs. tweened progress)
  // never fight over cpuScrollProgress at the same time.
  const goToManualState = (target: number) => {
    clearSequenceTimeouts();
    setFocusLayerIndex(null);
    animateToProgress(target);
  };

  // Sequential per-layer reveal: step focusLayerIndex 0..5, each held for
  // LAYER_HOLD_MS, then hand off to the existing assemble tween (0.0) for
  // "CPU returns into Alexa and she closes up".
  const runLayerSequence = () => {
    clearSequenceTimeouts();
    setIsCpuPlaying(false);
    setCpuTargetProgress(null);
    setDismantleSequenceActive(true);
    setCpuScrollProgress(REVEAL_SCROLL_PROGRESS);
    setExpression('curious');

    LAYER_DETAILS.forEach((_, idx) => {
      const t = setTimeout(() => setFocusLayerIndex(idx), idx * LAYER_HOLD_MS);
      sequenceTimeoutsRef.current.push(t);
    });

    const finish = setTimeout(() => {
      setFocusLayerIndex(null);
      animateToProgress(0.0);
    }, LAYER_DETAILS.length * LAYER_HOLD_MS);
    sequenceTimeoutsRef.current.push(finish);
  };

  // Every new phone response (identity-based, not count-based — immune to
  // any accidental double-count) restarts the reveal, interrupting whatever
  // was mid-flight rather than silently dropping the new command.
  useEffect(() => {
    const latestId = summaries[0]?.id ?? null;
    if (latestId === null || latestId === lastSeenIdRef.current) return;
    lastSeenIdRef.current = latestId;

    const latest = summaries[0];
    setLedColor((latest && TIER_COLOR[latest.tier ?? '']) || DEFAULT_LED_COLOR);
    runLayerSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaries]);

  useEffect(() => clearSequenceTimeouts, []);

  const debugCpuOffsetY = 1.05;
  const debugCpuPhase2Y = 1.18;
  const debugCpuRestingY = 0.0;
  const debugCamPanX = 0.0;
  const debugCamOffsetY = 0.0;
  const debugCamPanZ = 0.0;
  const debugCamZoom = 200;
  const debugCamYaw = 0.0;
  const debugCamPitch = 0.0;

  const currentExplodedProgress = useMemo(() => {
    if (!dismantleSequenceActive) return explodedProgress;
    const s = cpuScrollProgress;
    if (s < 0.10) {
      return 0.0;
    } else if (s < 0.25) {
      return (s - 0.10) / 0.15;
    } else if (s < 0.60) {
      return 1.0;
    } else {
      return Math.max(0, 1.0 - (s - 0.60) / 0.15);
    }
  }, [dismantleSequenceActive, cpuScrollProgress, explodedProgress]);

  useEffect(() => {
    let frameId: number;
    if (isExploding) {
      const animate = () => {
        setExplodedProgress((prev) => {
          if (prev >= 1.0) {
            setIsExploding(false);
            return 1.0;
          }
          frameId = requestAnimationFrame(animate);
          return Math.min(1.0, prev + 0.015);
        });
      };
      frameId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(frameId);
  }, [isExploding]);

  const triggerAssemble = () => {
    setIsExploding(false);
    const animate = () => {
      setExplodedProgress((prev) => {
        if (prev <= 0.0) {
          return 0.0;
        }
        requestAnimationFrame(animate);
        return Math.max(0.0, prev - 0.015);
      });
    };
    requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (cpuScrollProgress >= 1.0 && dismantleSequenceActive) {
      setAlexaOpacityOverride(0);

      const delayTimer = setTimeout(() => {
        let startTime = performance.now();
        const duration = 1500;

        const animateFade = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          setAlexaOpacityOverride(progress);

          if (progress < 1) {
            requestAnimationFrame(animateFade);
          } else {
            setTimeout(() => {
              setDismantleSequenceActive(false);
              setCpuScrollProgress(0);
              triggerAssemble();
              setExpression('dizzy');
              setAlexaOpacityOverride(null);
              if (cpuScrollContainerRef.current) {
                cpuScrollContainerRef.current.scrollTop = 0;
              }
            }, 1200);
          }
        };

        requestAnimationFrame(animateFade);
      }, 1000);

      return () => clearTimeout(delayTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuScrollProgress, dismantleSequenceActive]);

  useEffect(() => {
    if (!isCpuPlaying || cpuTargetProgress === null) return;
    let animFrameId: number;
    const startTime = performance.now();
    const startProgress = cpuScrollProgress;
    const targetProgress = cpuTargetProgress;
    const duration = targetProgress === 1.0
      ? 7000
      : (targetProgress === 0.50 && startProgress > 0.60 ? 4500 : 2500);

    const animateCpu = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const nextProgress = startProgress + (targetProgress - startProgress) * easedT;

      setCpuScrollProgress(nextProgress);
      if (cpuScrollContainerRef.current) {
        const el = cpuScrollContainerRef.current;
        el.scrollTop = nextProgress * (el.scrollHeight - el.clientHeight);
      }

      if (t < 1) {
        animFrameId = requestAnimationFrame(animateCpu);
      } else {
        setIsCpuPlaying(false);
        setCpuTargetProgress(null);
        if (targetProgress === 0.0) {
          setDismantleSequenceActive(false);
          setCpuScrollProgress(0);
          triggerAssemble();
          setExpression('happy');
        }
      }
    };

    animFrameId = requestAnimationFrame(animateCpu);
    return () => cancelAnimationFrame(animFrameId);
  }, [isCpuPlaying, cpuTargetProgress]);

  const dynamicTheme = useMemo(() => {
    if (!dismantleSequenceActive) {
      return {
        bg: '#161514',
        text: '#e0dbd5',
        subText: '#8e867b',
        border: 'rgba(255, 255, 255, 0.12)',
        panelBg: 'rgba(15, 15, 17, 0.65)',
        gridDot: 'rgba(68, 68, 68, 0.08)',
        t: 0,
      };
    }
    const s = cpuScrollProgress;
    let t = 0;
    if (s >= 0.25) {
      if (s < 0.35) {
        t = (s - 0.25) / 0.10;
      } else if (s < 0.60) {
        t = 1.0;
      } else if (s < 0.66) {
        t = 1.0 - (s - 0.60) / 0.06;
      }
    }

    const bgCol = new THREE.Color('#161514').lerp(new THREE.Color('#ffffff'), t);
    const textCol = new THREE.Color('#e0dbd5').lerp(new THREE.Color('#1a1816'), t);
    const subTextCol = new THREE.Color('#8e867b').lerp(new THREE.Color('#7a7168'), t);
    const borderCol = new THREE.Color('rgba(255, 255, 255, 0.12)').lerp(new THREE.Color('rgba(74, 65, 55, 0.15)'), t);
    const panelBg = t < 0.1
      ? 'rgba(15, 15, 17, 0.65)'
      : `rgba(${Math.round(15 + (255 - 15) * t)}, ${Math.round(15 + (255 - 15) * t)}, ${Math.round(17 + (255 - 17) * t)}, ${0.65 - 0.2 * t})`;
    const gridDot = new THREE.Color('#444444').lerp(new THREE.Color('#b4afa4'), t);

    return {
      bg: bgCol.getStyle(),
      text: textCol.getStyle(),
      subText: subTextCol.getStyle(),
      border: borderCol.getStyle(),
      panelBg,
      gridDot: `rgba(${Math.round(gridDot.r * 255)}, ${Math.round(gridDot.g * 255)}, ${Math.round(gridDot.b * 255)}, ${t > 0.5 ? 0.12 : 0.08})`,
      t
    };
  }, [dismantleSequenceActive, cpuScrollProgress]);

  const focusedLayer = focusLayerIndex !== null ? LAYER_DETAILS[focusLayerIndex] : null;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-150"
      style={{ backgroundColor: dynamicTheme.bg, color: dynamicTheme.text }}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <header className="absolute top-0 left-0 right-0 z-40 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 pointer-events-none md:px-8">
        <div className="flex items-center space-x-3 pointer-events-auto w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: ledColor }} />
            <span className="text-xs font-bold tracking-[0.2em] font-mono" style={{ color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#7A7168' : '#B8AFA4' }}>
              ALEXA.SHOWCASE — LIVE
            </span>
          </div>
          <Link
            to="/"
            className="md:hidden flex items-center space-x-2 px-3 py-1 text-[10px] font-mono tracking-wider transition-all duration-200 border border-[#4a4137]/30 bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662]"
            style={{
              borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(0,0,0,0.15)' : '#4a4137',
              color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#161514' : '#F2EDE6',
            }}
          >
            <span>← BACK</span>
          </Link>
        </div>

        {/* Manual state buttons — interrupt any in-flight per-layer reveal */}
        <div className="pointer-events-auto flex items-center bg-black/65 backdrop-blur-md px-2.5 py-1.5 border rounded-full shadow-lg transition-all duration-300 gap-1.5"
          style={{
            borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(74, 65, 55, 0.25)' : 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <button
            onClick={() => goToManualState(0.0)}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${
              !dismantleSequenceActive || cpuScrollProgress < 0.05
                ? 'bg-[#3a7ca5] text-white font-bold shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Assembled
          </button>

          <div className="h-3 w-[1px] bg-white/20" />

          <button
            onClick={() => goToManualState(0.50)}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${
              dismantleSequenceActive && focusLayerIndex === null && Math.abs(cpuScrollProgress - 0.50) < 0.1
                ? 'bg-[#3a7ca5] text-white font-bold shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Collapse to Split View
          </button>

          <div className="h-3 w-[1px] bg-white/20" />

          <button
            onClick={() => {
              if (cpuScrollProgress > 0.60) {
                goToManualState(0.50);
              } else {
                goToManualState(1.0);
              }
            }}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${
              dismantleSequenceActive && cpuScrollProgress > 0.60
                ? 'bg-[#3bf574]/20 border border-[#3bf574]/50 text-[#3bf574] font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {cpuScrollProgress > 0.60 ? 'Back to Split View' : 'Go to Joined State'}
          </button>
        </div>

        <div className="pointer-events-auto flex items-center space-x-3">
          <Link
            to="/"
            className="hidden md:flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[#4a4137] bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
            style={{
              borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(0,0,0,0.15)' : '#4a4137',
              color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#161514' : '#F2EDE6',
            }}
          >
            <span>← BACK TO DASHBOARD</span>
          </Link>
        </div>
      </header>

      {/* 3D WebGL Canvas Area */}
      <div className="relative w-full h-full flex items-center justify-center z-10">
        <div className="absolute inset-0">
          <Canvas3DBoundary>
            <FinalAlexaCanvas
              expression={expression}
              bodyColor={bodyColor}
              ledColor={ledColor}
              ledMode={ledMode}
              outlineThickness={outlineThickness}
              explodedProgress={currentExplodedProgress}
              isPanelOpen={isPanelOpen}
              setIsPanelOpen={setIsPanelOpen}
              isSpeaking={isSpeaking}
              isSinging={isSinging}
              dismantleMode={dismantleSequenceActive}
              cpuScrollProgress={cpuScrollProgress}
              focusLayerIndex={focusLayerIndex}
              resetSignal={cameraResetSignal}
              debugCpuOffsetY={debugCpuOffsetY}
              debugCpuPhase2Y={debugCpuPhase2Y}
              debugCpuRestingY={debugCpuRestingY}
              debugCamPanX={debugCamPanX}
              debugCamOffsetY={debugCamOffsetY}
              debugCamPanZ={debugCamPanZ}
              debugCamZoom={debugCamZoom}
              debugCamYaw={debugCamYaw}
              debugCamPitch={debugCamPitch}
              alexaOpacityOverride={alexaOpacityOverride ?? undefined}
            />
          </Canvas3DBoundary>
        </div>

        <div
          className="absolute top-20 left-6 z-20 px-3 py-1.5 border border-[#3b3a37] bg-black/40 rounded-md pointer-events-none transition-all duration-300"
          style={{ opacity: dismantleSequenceActive ? 0 : 1 }}
        >
          <div className="text-[9px] font-mono text-[#7A7168] uppercase tracking-wider mb-0.5">STATUS</div>
          <div className="text-sm font-semibold tracking-wider font-mono text-[#e9b44c]">
            {summaries.length === 0 ? 'Send a command from the phone →' : `${summaries.length} command${summaries.length === 1 ? '' : 's'} processed`}
          </div>
        </div>

        {!dismantleSequenceActive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <span className="text-[11px] font-mono bg-black/50 border border-[#3a7ca5]/30 text-[#B8AFA4] px-5 h-9 rounded-full shadow-lg flex items-center">
              Send a phone command to trigger the reveal · Drag to orbit
            </span>
            <button
              onClick={() => setCameraResetSignal((n) => (n ?? 0) + 1)}
              className="text-[11px] font-mono bg-black/50 hover:bg-white/10 border border-white/20 hover:border-white/40 text-[#F2EDE6] transition-all duration-200 px-4 h-9 rounded-full shadow-lg"
            >
              Reset Camera
            </button>
          </div>
        )}
      </div>

      {/* ── Per-layer reveal card — bound to whichever layer is currently lifted ── */}
      {focusedLayer && (
        <div
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 p-6 max-w-md w-[90%] backdrop-blur-md border rounded-xl transition-all duration-300 pointer-events-none shadow-lg"
          style={{
            borderColor: 'rgba(217, 169, 138, 0.25)',
            backgroundColor: 'rgba(12, 11, 10, 0.88)',
            color: '#e0dbd5',
          }}
        >
          <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: ledColor }}>
            LAYER {focusLayerIndex} / {LAYER_DETAILS.length - 1}
          </span>
          <h2 className="text-xl font-bold leading-tight mb-3 text-white">
            {focusedLayer.title}
          </h2>
          <p className="text-xs font-mono leading-relaxed text-[#a8a198]">
            {focusedLayer.desc}
          </p>
          <div className="flex gap-1.5 mt-4">
            {LAYER_DETAILS.map((_, idx) => (
              <div
                key={idx}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: idx <= (focusLayerIndex ?? -1) ? ledColor : 'rgba(255,255,255,0.12)' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Live trace log — summaries is newest-first (SmartphoneWidget prepends) */}
      <div className="absolute top-20 right-6 z-20 w-72 max-h-[50vh] overflow-y-auto flex flex-col gap-2 pointer-events-none">
        {summaries.slice(0, 8).map((s) => (
          <div
            key={s.id}
            className="pointer-events-auto rounded-md border p-2.5 text-[11px] font-mono backdrop-blur-md"
            style={{
              borderColor: `${TIER_COLOR[s.tier ?? ''] ?? DEFAULT_LED_COLOR}55`,
              backgroundColor: 'rgba(12, 11, 10, 0.75)',
              color: '#e0dbd5',
            }}
          >
            <div className="flex justify-between opacity-70">
              <span>{s.tier ?? '—'}</span>
              <span>{s.latency}ms · ${s.cost.toFixed(4)}</span>
            </div>
            <div className="mt-1 opacity-90">{s.utterance}</div>
            <div className="mt-0.5" style={{ color: TIER_COLOR[s.tier ?? ''] ?? DEFAULT_LED_COLOR }}>
              {s.response}
            </div>
          </div>
        ))}
      </div>

      {/* Smartphone corner widget — every request it sends drives the reveal above */}
      <div className="absolute bottom-6 right-6 z-40">
        <SmartphoneWidget
          wallpaperGradient="from-[#050505] to-[#121110]"
          customSummaries={summaries}
          onSummariesChange={setSummaries}
          externalCommand={externalCommand}
          onClearExternalCommand={() => setExternalCommand('')}
        />
      </div>
    </div>
  );
}
export default FinalShowcaseLivePage;
