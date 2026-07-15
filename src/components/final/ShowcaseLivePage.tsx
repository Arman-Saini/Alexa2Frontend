import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { FinalAlexaCanvas } from './FinalAlexaCanvas';
import { SmartphoneWidget, type ChatSummary } from '../phone/SmartphoneWidget';

type ExpressionType = 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
type LedModeType = 'solid' | 'pulse' | 'wave' | 'off';

const EXPRESSIONS: { type: ExpressionType; label: string; face: string }[] = [
  { type: 'happy',    label: 'Happy',               face: '⌒ ‿ ⌒' },
  { type: 'resting',  label: 'Default Resting Face', face: '・ ‿ ・' },
  { type: 'curious',  label: 'Curious',              face: '・ o ・' },
  { type: 'wink',     label: 'Wink',                 face: '⌒ ‿ o' },
  { type: 'sleepy',   label: 'Sleepy',               face: '＞ ｏ ＞' },
  { type: 'yawning',  label: 'Yawning',              face: '￣ ｏ ￣' },
  { type: 'dizzy',    label: 'Dizzy',                face: 'x ‿ x' },
  { type: 'excited',  label: 'Excited',              face: '^ ‿ ^' },
  { type: 'sad',      label: 'Sad',                  face: '∪ ‿ ∪' },
];

// ── Tier metadata ─────────────────────────────────────────────────────────────
const TIER_INFO = {
  T0: {
    label: 'T0 · REFLEX LAYER',
    latency: '<10ms',
    color: '#3bf574',
    desc: 'Pre-compiled deterministic rules run instantly on-device. Zero cloud cost, zero latency.',
    icon: '⚡',
    progressTarget: null as number | null, // stays assembled
  },
  T1: {
    label: 'T1 · PERCEPTION LAYER',
    latency: '<100ms',
    color: '#3da5e0',
    desc: 'Edge ML offline: wake-word detection, speaker ID, and acoustic event mapping.',
    icon: '🎙️',
    progressTarget: 0.63,
  },
  T2: {
    label: 'T2 · RECALL LAYER',
    latency: '~100–500ms',
    color: '#e9b44c',
    desc: 'Local semantic cache checks paraphrased queries before escalating to cloud.',
    icon: '📦',
    progressTarget: 0.80,
  },
  T3: {
    label: 'T3 · REASONING LAYER',
    latency: '0.5–3s',
    color: '#ff3333',
    desc: 'Cloud (AWS Bedrock). Claude plans novel commands and compiles T0 rules for next time.',
    icon: '🧠',
    progressTarget: 0.95,
  },
} as const;

type TierKey = keyof typeof TIER_INFO;

const SUMMARY_TIER_MAP: Record<NonNullable<ChatSummary['tier']>, TierKey> = {
  'T0·local': 'T0',
  'T1·local': 'T1',
  'T3·cloud': 'T3',
};

function buildFlowSequence(finalTier: TierKey): TierKey[] {
  if (finalTier === 'T0') return ['T0'];
  if (finalTier === 'T1') return ['T0', 'T1'];
  return ['T0', 'T1', 'T2', 'T3']; // T3·cloud escalates through all tiers
}

// ── Tier Overlay Card ─────────────────────────────────────────────────────────
function TierOverlayCard({ tier }: { tier: TierKey }) {
  const info = TIER_INFO[tier];
  return (
    <motion.div
      key={tier}
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{    opacity: 0, y: -16, scale: 0.96 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="pointer-events-none"
      style={{
        background: 'rgba(8, 8, 10, 0.92)',
        border: `1.5px solid ${info.color}`,
        borderRadius: 16,
        padding: '20px 28px',
        minWidth: 320,
        maxWidth: 420,
        boxShadow: `0 0 40px ${info.color}22, 0 20px 60px rgba(0,0,0,0.7)`,
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{info.icon}</span>
        <div>
          <div
            className="text-xs font-mono font-bold tracking-[0.2em] uppercase"
            style={{ color: info.color }}
          >
            ACTIVE LAYER
          </div>
          <div className="text-white font-bold text-lg leading-tight font-mono">
            {info.label}
          </div>
        </div>
        <div
          className="ml-auto text-xs font-mono font-bold px-2 py-1 rounded"
          style={{ color: info.color, background: `${info.color}18`, border: `1px solid ${info.color}40` }}
        >
          {info.latency}
        </div>
      </div>
      <p className="text-sm text-white/70 leading-relaxed font-sans">
        {info.desc}
      </p>
      <div className="mt-3 flex gap-1">
        {(['T0', 'T1', 'T2', 'T3'] as TierKey[]).map((t) => (
          <div
            key={t}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              background: t === tier ? info.color : 'rgba(255,255,255,0.1)',
              boxShadow: t === tier ? `0 0 6px ${info.color}` : 'none',
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Timeline Scrubber (copied from FinalShowcasePage) ─────────────────────────
function AnimeTimelineScrubber({
  progress,
  onScrub,
}: {
  progress: number;
  onScrub: (progress: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [localProgress, setLocalProgress] = useState(progress);

  useEffect(() => {
    if (!isDragging.current) setLocalProgress(progress);
  }, [progress]);

  const updateProgress = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const padding = 16;
    const x = clientX - rect.left - padding;
    const width = rect.width - padding * 2;
    const newProgress = Math.max(0, Math.min(1, x / width));
    setLocalProgress(newProgress);
    onScrub(newProgress);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    updateProgress(e.clientX);
    const handleMouseMove = (ev: MouseEvent) => {
      if (isDragging.current) updateProgress(ev.clientX);
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      className="pointer-events-auto flex items-center justify-between px-4 h-6 bg-[#141312] border border-[#4a4137]/35 rounded-full cursor-ew-resize select-none relative"
      style={{ width: '180px' }}
    >
      <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          return (
            <div
              key={i}
              className="w-[1.2px]"
              style={{
                height: isMajor ? '8px' : '4px',
                backgroundColor: isMajor ? '#ECE6DF' : 'rgba(74, 65, 55, 0.4)',
              }}
            />
          );
        })}
      </div>
      <div
        className="absolute w-[2px] h-[12px] bg-[#ff3333] pointer-events-none transition-all duration-75"
        style={{
          left: `calc(16px + ${localProgress * (180 - 32 - 2)}px)`,
          boxShadow: '0 0 6px rgba(255, 51, 51, 0.75)',
        }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ShowcaseLivePage() {
  const [expression, setExpression] = useState<ExpressionType>('resting');
  const [bodyColor] = useState<string>('#e2d5c3');
  const [ledColor] = useState<string>('#00f3ff');
  const [ledMode] = useState<LedModeType>('pulse');
  const [outlineThickness] = useState<number>(1.3);
  const [explodedProgress, setExplodedProgress] = useState<number>(0.0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isSpeaking] = useState<boolean>(false);
  const [isSinging] = useState<boolean>(false);
  const [isExploding, setIsExploding] = useState(false);

  // Dismantle sequence state
  const [dismantleSequenceActive, setDismantleSequenceActive] = useState(false);
  const [cpuScrollProgress, setCpuScrollProgress] = useState(0);
  const [isCpuPlaying, setIsCpuPlaying] = useState<boolean>(false);
  const [cpuTargetProgress, setCpuTargetProgress] = useState<number | null>(null);
  const cpuScrollContainerRef = useRef<HTMLDivElement>(null);
  const [cameraResetSignal, setCameraResetSignal] = useState<number | undefined>(undefined);
  const [alexaOpacityOverride, setAlexaOpacityOverride] = useState<number | null>(null);

  // Tier flow state
  const [phoneSummaries, setPhoneSummaries] = useState<ChatSummary[]>([]);
  const [activeTierOverlay, setActiveTierOverlay] = useState<TierKey | null>(null);
  const [lastResolvedTier, setLastResolvedTier] = useState<TierKey | null>(null);
  const [isFlowPlaying, setIsFlowPlaying] = useState(false);

  // Refs for rAF animations (avoid stale closures)
  const progressRef = useRef(0);
  const isFlowPlayingRef = useRef(false);
  const prevSummariesRef = useRef<ChatSummary[]>([]);
  const flowTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flowRafRef = useRef<number | null>(null);

  // Keep progressRef in sync when external things set cpuScrollProgress
  const setProgress = useCallback((p: number) => {
    progressRef.current = p;
    setCpuScrollProgress(p);
  }, []);

  // ── Dismantle helpers (same as FinalShowcasePage) ─────────────────────────
  const animateToProgress = (target: number) => {
    setDismantleSequenceActive(true);
    setCpuTargetProgress(target);
    setIsCpuPlaying(true);
  };

  const startDismantleFromScroll = (deltaY: number) => {
    if (isFlowPlayingRef.current) return; // block wheel during tier flow
    if (dismantleSequenceActive || deltaY <= 0) return;
    setDismantleSequenceActive(true);
    setCpuScrollProgress(0);
    progressRef.current = 0;
    requestAnimationFrame(() => {
      if (cpuScrollContainerRef.current) cpuScrollContainerRef.current.scrollTop = 0;
    });
  };

  const debugCpuOffsetY  = 1.05;
  const debugCpuPhase2Y  = 1.18;
  const debugCpuRestingY = 0.0;
  const debugCamPanX     = 0.0;
  const debugCamOffsetY  = 0.0;
  const debugCamPanZ     = 0.0;
  const debugCamZoom     = 200;
  const debugCamYaw      = 0.0;
  const debugCamPitch    = 0.0;

  const currentExplodedProgress = useMemo(() => {
    if (!dismantleSequenceActive) return explodedProgress;
    const s = cpuScrollProgress;
    if (s < 0.10)       return 0.0;
    else if (s < 0.25)  return (s - 0.10) / 0.15;
    else if (s < 0.60)  return 1.0;
    else                return Math.max(0, 1.0 - (s - 0.60) / 0.15);
  }, [dismantleSequenceActive, cpuScrollProgress, explodedProgress]);

  useEffect(() => {
    let frameId: number;
    if (isExploding) {
      const animate = () => {
        setExplodedProgress((prev) => {
          if (prev >= 1.0) { setIsExploding(false); return 1.0; }
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
        if (prev <= 0.0) return 0.0;
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
        const startTime = performance.now();
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
              setProgress(0);
              triggerAssemble();
              setExpression('dizzy');
              setAlexaOpacityOverride(null);
              if (cpuScrollContainerRef.current) cpuScrollContainerRef.current.scrollTop = 0;
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
    const startTime    = performance.now();
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
      setProgress(nextProgress);
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
          setProgress(0);
          triggerAssemble();
          setExpression('happy');
        }
      }
    };
    animFrameId = requestAnimationFrame(animateCpu);
    return () => cancelAnimationFrame(animFrameId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCpuPlaying, cpuTargetProgress]);

  const pipelineSteps = useMemo(() => [
    { label: 'L1: PERCEPTION',       title: 'T1 Acoustic Embeddings' },
    { label: 'L2: MCP INTERPOSER',   title: 'Interposer Telemetry' },
    { label: 'L3: EDGE SLM & CACHE', title: 'Local Recall & T2 Cache' },
    { label: 'L4: ONTOLOGY SHIELD',  title: 'Deterministic Safety Gate' },
    { label: 'L5: BEDROCK AGENTS',   title: 'T3 Reasoning & Compiler' },
  ], []);

  const currentStepIdx = useMemo(() => {
    if (cpuScrollProgress < 0.68) return 0;
    if (cpuScrollProgress < 0.76) return 1;
    if (cpuScrollProgress < 0.84) return 2;
    if (cpuScrollProgress < 0.92) return 3;
    return 4;
  }, [cpuScrollProgress]);

  const dynamicTheme = useMemo(() => {
    if (!dismantleSequenceActive) {
      return {
        bg: '#161514', text: '#e0dbd5', subText: '#8e867b',
        border: 'rgba(255, 255, 255, 0.12)', panelBg: 'rgba(15, 15, 17, 0.65)',
        gridDot: 'rgba(68, 68, 68, 0.08)', t: 0,
      };
    }
    const s = cpuScrollProgress;
    let t = 0;
    if (s >= 0.25) {
      if (s < 0.35)      t = (s - 0.25) / 0.10;
      else if (s < 0.60) t = 1.0;
      else if (s < 0.66) t = 1.0 - (s - 0.60) / 0.06;
    }
    const bgCol      = new THREE.Color('#161514').lerp(new THREE.Color('#ffffff'), t);
    const textCol    = new THREE.Color('#e0dbd5').lerp(new THREE.Color('#1a1816'), t);
    const subTextCol = new THREE.Color('#8e867b').lerp(new THREE.Color('#7a7168'), t);
    const borderCol  = new THREE.Color('rgba(255, 255, 255, 0.12)').lerp(new THREE.Color('rgba(74, 65, 55, 0.15)'), t);
    const panelBg = t < 0.1
      ? 'rgba(15, 15, 17, 0.65)'
      : `rgba(${Math.round(15 + (255 - 15) * t)}, ${Math.round(15 + (255 - 15) * t)}, ${Math.round(17 + (255 - 17) * t)}, ${0.65 - 0.2 * t})`;
    const gridDot = new THREE.Color('#444444').lerp(new THREE.Color('#b4afa4'), t);
    return {
      bg: bgCol.getStyle(), text: textCol.getStyle(), subText: subTextCol.getStyle(),
      border: borderCol.getStyle(), panelBg,
      gridDot: `rgba(${Math.round(gridDot.r * 255)}, ${Math.round(gridDot.g * 255)}, ${Math.round(gridDot.b * 255)}, ${t > 0.5 ? 0.12 : 0.08})`,
      t,
    };
  }, [dismantleSequenceActive, cpuScrollProgress]);

  // ── NEW: Fast jump for tier flow (no conflict with isCpuPlaying) ──────────
  const jumpToProgress = useCallback((target: number, onDone?: () => void) => {
    if (target > 0) setDismantleSequenceActive(true);

    if (flowRafRef.current !== null) {
      cancelAnimationFrame(flowRafRef.current);
      flowRafRef.current = null;
    }

    const startVal  = progressRef.current;
    const startTime = performance.now();
    const dist      = Math.abs(target - startVal);
    const duration  = dist < 0.04 ? 200 : 900;

    const tick = (now: number) => {
      const raw   = Math.min(1, (now - startTime) / duration);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - (-2 * raw + 2) ** 2 / 2;
      const p     = startVal + (target - startVal) * eased;
      progressRef.current = p;
      setCpuScrollProgress(p);

      if (cpuScrollContainerRef.current) {
        const el = cpuScrollContainerRef.current;
        el.scrollTop = p * (el.scrollHeight - el.clientHeight);
      }

      if (raw < 1) {
        flowRafRef.current = requestAnimationFrame(tick);
      } else {
        flowRafRef.current = null;
        onDone?.();
      }
    };

    flowRafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── NEW: Sequence through all tiers for a given final tier ────────────────
  const playTierFlow = useCallback((finalTier: TierKey) => {
    if (isFlowPlayingRef.current) return;
    isFlowPlayingRef.current = true;
    setIsFlowPlaying(true);

    // Cancel any running animation
    if (flowRafRef.current !== null) {
      cancelAnimationFrame(flowRafRef.current);
      flowRafRef.current = null;
    }
    flowTimersRef.current.forEach(clearTimeout);
    flowTimersRef.current = [];

    const sequence = buildFlowSequence(finalTier);
    let stepIdx = 0;

    const runStep = () => {
      if (stepIdx >= sequence.length) {
        setActiveTierOverlay(null);
        const t = window.setTimeout(() => {
          jumpToProgress(0.0, () => {
            setDismantleSequenceActive(false);
            progressRef.current = 0;
            setCpuScrollProgress(0);
            isFlowPlayingRef.current = false;
            setIsFlowPlaying(false);
          });
        }, 500);
        flowTimersRef.current.push(t);
        return;
      }

      const tier   = sequence[stepIdx++];
      const info   = TIER_INFO[tier];
      setActiveTierOverlay(tier);

      const holdMs = tier === 'T3' ? 2500 : 1800;

      if (info.progressTarget === null) {
        // T0: no dismantle needed, just show overlay
        const t = window.setTimeout(runStep, holdMs);
        flowTimersRef.current.push(t);
      } else {
        jumpToProgress(info.progressTarget, () => {
          const t = window.setTimeout(runStep, holdMs);
          flowTimersRef.current.push(t);
        });
      }
    };

    runStep();
  }, [jumpToProgress]);

  // ── NEW: Detect when phone resolves a command and which tier handled it ────
  const handleSummariesChange = useCallback((newSummaries: ChatSummary[]) => {
    setPhoneSummaries(newSummaries);

    const prev = prevSummariesRef.current;
    for (const s of newSummaries) {
      if (s.tier && s.status !== 'info') {
        const prevEntry = prev.find((p) => p.id === s.id);
        if (!prevEntry?.tier) {
          const key = SUMMARY_TIER_MAP[s.tier];
          if (key) {
            setLastResolvedTier(key);
            playTierFlow(key);
          }
          break;
        }
      }
    }

    prevSummariesRef.current = newSummaries;
  }, [playTierFlow]);

  // Cleanup timers and rAFs on unmount
  useEffect(() => {
    return () => {
      flowTimersRef.current.forEach(clearTimeout);
      if (flowRafRef.current !== null) cancelAnimationFrame(flowRafRef.current);
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-150"
      style={{ backgroundColor: dynamicTheme.bg, color: dynamicTheme.text }}
      onWheel={(e) => startDismantleFromScroll(e.deltaY)}
    >
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-40 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 pointer-events-none md:px-8">
        <div className="flex items-center space-x-3 pointer-events-auto w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#3a7ca5] animate-pulse" />
            <span
              className="text-xs font-bold tracking-[0.2em] font-mono"
              style={{ color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#7A7168' : '#B8AFA4' }}
            >
              ALEXA.LIVE
            </span>
            {/* Live badge */}
            <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border border-[#3bf574]/30 text-[#3bf574] bg-[#3bf574]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3bf574] animate-pulse" />
              LIVE
            </span>
          </div>
          <Link
            to="/showcase"
            className="md:hidden flex items-center space-x-2 px-3 py-1 text-[10px] font-mono tracking-wider transition-all duration-200 border border-[#4a4137]/30 bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662]"
            style={{
              borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(0,0,0,0.15)' : '#4a4137',
              color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#161514' : '#F2EDE6',
            }}
          >
            ← BACK
          </Link>
        </div>

        {/* Center nav buttons */}
        <div
          className="pointer-events-auto flex items-center bg-black/65 backdrop-blur-md px-2.5 py-1.5 border rounded-full shadow-lg transition-all duration-300 gap-1.5"
          style={{
            borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(74, 65, 55, 0.25)' : 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <button
            onClick={() => !isFlowPlaying && animateToProgress(0.0)}
            disabled={isFlowPlaying}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 disabled:opacity-40 ${
              !dismantleSequenceActive || cpuScrollProgress < 0.05
                ? 'bg-[#3a7ca5] text-white font-bold shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Assembled
          </button>
          <div className="h-3 w-[1px] bg-white/20" />
          <button
            onClick={() => !isFlowPlaying && animateToProgress(0.50)}
            disabled={isFlowPlaying}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 disabled:opacity-40 ${
              dismantleSequenceActive && Math.abs(cpuScrollProgress - 0.50) < 0.1
                ? 'bg-[#3a7ca5] text-white font-bold shadow'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            Split View
          </button>
          <div className="h-3 w-[1px] bg-white/20" />
          <button
            onClick={() => {
              if (isFlowPlaying) return;
              if (cpuScrollProgress > 0.60) animateToProgress(0.50);
              else animateToProgress(1.0);
            }}
            disabled={isFlowPlaying}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 disabled:opacity-40 ${
              dismantleSequenceActive && cpuScrollProgress > 0.60
                ? 'bg-[#3bf574]/20 border border-[#3bf574]/50 text-[#3bf574] font-bold'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            {cpuScrollProgress > 0.60 ? 'Back to Split' : 'Joined State'}
          </button>
        </div>

        {/* Right: back button */}
        <div className="pointer-events-auto flex items-center space-x-3">
          <Link
            to="/showcase"
            className="hidden md:flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[#4a4137] bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
            style={{
              borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(0,0,0,0.15)' : '#4a4137',
              color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#161514' : '#F2EDE6',
            }}
          >
            ← BACK TO SHOWCASE
          </Link>
        </div>
      </header>

      {/* 3D Canvas */}
      <div className="relative w-full h-full flex items-center justify-center z-10">
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes floatNote1 {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.8; }
            100% { transform: translate(-60px, -200px) scale(1.3) rotate(-30deg); opacity: 0; }
          }
          @keyframes floatNote2 {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.8; }
            100% { transform: translate(80px, -220px) scale(1.3) rotate(45deg); opacity: 0; }
          }
          @keyframes floatNote3 {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.8; }
            100% { transform: translate(-30px, -240px) scale(1.2) rotate(15deg); opacity: 0; }
          }
          .singing-note-1 { animation: floatNote1 1.2s infinite linear; }
          .singing-note-2 { animation: floatNote2 1.5s infinite linear; }
          .singing-note-3 { animation: floatNote3 1.0s infinite linear; }
          @keyframes floatZzz1 {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.8; }
            100% { transform: translate(60px, -180px) scale(1.4) rotate(15deg); opacity: 0; }
          }
          @keyframes floatZzz2 {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
            20% { opacity: 1; }
            80% { opacity: 0.8; }
            100% { transform: translate(90px, -220px) scale(1.5) rotate(35deg); opacity: 0; }
          }
          @keyframes floatZzz3 {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
            15% { opacity: 1; }
            85% { opacity: 0.8; }
            100% { transform: translate(35px, -140px) scale(1.2) rotate(-10deg); opacity: 0; }
          }
          .sleepy-zzz-1 { animation: floatZzz1 2.2s infinite linear; }
          .sleepy-zzz-2 { animation: floatZzz2 2.6s infinite linear; }
          .sleepy-zzz-3 { animation: floatZzz3 1.8s infinite linear; }
        `}} />

        <div className="absolute inset-0">
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
        </div>

        {/* Singing notes */}
        {isSinging && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="relative w-10 h-10 -translate-y-16">
              <span className="absolute text-2xl text-[#f1c40f] singing-note-1 select-none font-bold" style={{ animationDelay: '0s' }}>♪</span>
              <span className="absolute text-3xl text-[#3da5e0] singing-note-2 select-none font-bold" style={{ animationDelay: '0.8s' }}>♫</span>
              <span className="absolute text-2xl text-[#e05353] singing-note-3 select-none font-bold" style={{ animationDelay: '1.5s' }}>♬</span>
            </div>
          </div>
        )}

        {/* Sleepy zzz */}
        {(expression === 'yawning' || expression === 'sleepy') && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="relative w-10 h-10 -translate-y-24 translate-x-12">
              <span className="absolute text-xl text-[#3da5e0] sleepy-zzz-1 select-none font-mono font-bold" style={{ animationDelay: '0s' }}>Z</span>
              <span className="absolute text-2xl text-[#cce6ff] sleepy-zzz-2 select-none font-mono font-bold" style={{ animationDelay: '0.7s' }}>z</span>
              <span className="absolute text-sm text-[#00f3ff] sleepy-zzz-3 select-none font-mono font-bold" style={{ animationDelay: '1.4s' }}>z</span>
            </div>
          </div>
        )}

        {/* Current mood badge */}
        <div
          className="absolute top-20 left-6 z-20 px-3 py-1.5 border border-[#3b3a37] bg-black/40 rounded-md pointer-events-none transition-all duration-300"
          style={{ opacity: dismantleSequenceActive ? 0 : 1 }}
        >
          <div className="text-[9px] font-mono text-[#7A7168] uppercase tracking-wider mb-0.5">CURRENT MOOD</div>
          <div className="text-sm font-semibold tracking-wider font-mono text-[#e9b44c]">
            {expression.toUpperCase()} {EXPRESSIONS.find((e) => e.type === expression)?.face}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-mono text-[#7A7168] pointer-events-none">
          <div>DRAG TO ROTATE • SCROLL TO DISMANTLE</div>
          <div className="text-[#B8AFA4]">SPEAK OR TYPE ON THE PHONE TO TRIGGER LAYER FLOW</div>
        </div>

        {/* Bottom center controls — hidden once a command has resolved (flow button takes over) */}
        {!dismantleSequenceActive && !isFlowPlaying && !lastResolvedTier && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <span className="text-[11px] font-mono bg-black/50 border border-[#3a7ca5]/30 text-[#B8AFA4] px-5 h-9 rounded-full shadow-lg flex items-center">
              Scroll to dismantle ↓ · Drag to orbit
            </span>
            <button
              onClick={() => setCameraResetSignal((n) => (n ?? 0) + 1)}
              className="text-[11px] font-mono bg-black/50 hover:bg-white/10 border border-white/20 hover:border-white/40 text-[#F2EDE6] transition-all duration-200 px-4 h-9 rounded-full shadow-lg"
            >
              Reset Camera
            </button>
          </div>
        )}

        {/* "Show Command Flow" button — appears after a command resolves */}
        {lastResolvedTier && !isFlowPlaying && !dismantleSequenceActive && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <button
              onClick={() => playTierFlow(lastResolvedTier)}
              className="text-[11px] font-mono flex items-center gap-2 px-5 h-9 rounded-full shadow-lg border transition-all duration-200 hover:scale-105"
              style={{
                background: `${TIER_INFO[lastResolvedTier].color}18`,
                borderColor: `${TIER_INFO[lastResolvedTier].color}60`,
                color: TIER_INFO[lastResolvedTier].color,
              }}
            >
              <span>▶</span>
              <span>Show Command Flow · {lastResolvedTier}</span>
            </button>
            <button
              onClick={() => setCameraResetSignal((n) => (n ?? 0) + 1)}
              className="text-[11px] font-mono bg-black/50 hover:bg-white/10 border border-white/20 hover:border-white/40 text-[#F2EDE6] transition-all duration-200 px-4 h-9 rounded-full shadow-lg"
            >
              Reset Camera
            </button>
          </div>
        )}

        {/* "Playing flow" indicator */}
        {isFlowPlaying && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center gap-2 text-[11px] font-mono bg-black/60 border border-white/15 text-white/60 px-5 h-9 rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#3bf574] animate-pulse" />
              Playing layer flow...
            </div>
          </div>
        )}
      </div>

      {/* ── TIER OVERLAY — centered, above everything ─────────────────────── */}
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <AnimatePresence mode="wait">
          {activeTierOverlay && <TierOverlayCard key={activeTierOverlay} tier={activeTierOverlay} />}
        </AnimatePresence>
      </div>

      {/* ── TIMELINE SCRUBBER ────────────────────────────────────────────────── */}
      {dismantleSequenceActive && !isFlowPlaying && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <div className="flex items-center space-x-2.5 bg-black/60 backdrop-blur-md px-4 py-2 border border-white/20 rounded-full shadow-lg">
            <span className="text-[9px] font-mono tracking-widest text-[#B8AFA4] select-none font-bold">SCRUB TIMELINE:</span>
            <AnimeTimelineScrubber
              progress={cpuScrollProgress}
              onScrub={(prog) => {
                if (isFlowPlayingRef.current) return;
                setProgress(prog);
                if (cpuScrollContainerRef.current) {
                  const el = cpuScrollContainerRef.current;
                  el.scrollTop = prog * (el.scrollHeight - el.clientHeight);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── NATIVE SCROLL CONTAINER OVERLAY ──────────────────────────────────── */}
      {dismantleSequenceActive && (
        <div
          ref={cpuScrollContainerRef}
          onScroll={(e) => {
            if (isFlowPlayingRef.current) return; // block manual scroll during flow
            const el = e.currentTarget;
            const prog = el.scrollTop / (el.scrollHeight - el.clientHeight);
            setProgress(Math.min(1, prog));
          }}
          className="absolute inset-0 overflow-y-auto pointer-events-auto scrollbar-none z-30"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="w-full flex flex-col" style={{ height: '450vh' }}>
            <div className="w-full flex flex-col items-center pointer-events-none px-6 md:px-16">
              <section className="h-[175vh] w-full flex flex-col justify-center items-center font-mono" />
              <section className="h-screen w-full flex flex-col justify-center items-center font-mono" />
              <section className="h-[75vh] w-full" />
              <section className="h-screen w-full flex flex-col justify-center items-center font-mono" />
            </div>
          </div>
        </div>
      )}

      {/* ── SYSTEM PIPELINE RUNTIME CARD (JOINING PHASE) ─────────────────────── */}
      {dismantleSequenceActive && cpuScrollProgress >= 0.60 && (
        <div
          className="fixed left-6 md:left-12 top-[20%] w-[90%] max-w-[340px] p-5 md:p-6 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl z-30"
          style={{
            borderColor: activeTierOverlay
              ? TIER_INFO[activeTierOverlay].color + '60'
              : 'rgba(217, 169, 138, 0.25)',
            backgroundColor: 'rgba(12, 11, 10, 0.88)',
            color: '#e0dbd5',
            boxShadow: activeTierOverlay
              ? `0 10px 30px rgba(0,0,0,0.7), 0 0 20px ${TIER_INFO[activeTierOverlay].color}22`
              : '0 10px 30px rgba(0,0,0,0.7)',
          }}
        >
          <span
            className="text-[9px] font-mono tracking-[0.2em] font-bold block mb-1 transition-colors duration-300"
            style={{ color: activeTierOverlay ? TIER_INFO[activeTierOverlay].color : ledColor }}
          >
            SYSTEM PIPELINE RUNTIME
          </span>
          <h3 className="text-xl font-display font-bold leading-none mb-3 text-white">
            {pipelineSteps[currentStepIdx].title}
          </h3>
          <p className="text-xs font-mono leading-relaxed mb-4 text-[#a8a198]">
            {currentStepIdx === 0 && 'Zero-shot sound discovery detects signature acoustic events and triggers BLE/Voice identity mapping.'}
            {currentStepIdx === 1 && 'Aggregates long-tail appliances into unified, type-safe MCP capability interfaces.'}
            {currentStepIdx === 2 && 'Checks local cache. If query hits a compiled rule, runs locally at <120ms without consuming cloud tokens.'}
            {currentStepIdx === 3 && 'Policy authorization gate filters LLM action plans, checks principal access, and blocks unsafe actuation at the plug.'}
            {currentStepIdx === 4 && 'Distributes target command payloads to corresponding smart home devices using optimal transport protocols.'}
          </p>
          <div className="flex flex-col space-y-1.5 font-mono text-[9px] border-t border-[#4a4137]/30 pt-3">
            {pipelineSteps.map((step, idx) => {
              const isActive    = currentStepIdx === idx;
              const isCompleted = currentStepIdx > idx;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between"
                  style={{
                    color: isActive
                      ? (activeTierOverlay ? TIER_INFO[activeTierOverlay].color : ledColor)
                      : (isCompleted ? '#3bf574' : '#6a5f52'),
                    fontWeight: isActive ? 700 : 400,
                  }}
                >
                  <span>{step.label}</span>
                  <span>{isActive ? '▶ ACTIVE' : isCompleted ? '✓ OK' : 'PENDING'}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SMARTPHONE WIDGET — fixed bottom-left like on "/" ─────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--space-6, 24px)',
          left: 'var(--space-6, 24px)',
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        <SmartphoneWidget
          customSummaries={phoneSummaries}
          onSummariesChange={handleSummariesChange}
          showExitButton={false}
        />
      </div>
    </div>
  );
}

export default ShowcaseLivePage;
