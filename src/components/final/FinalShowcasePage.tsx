import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { FinalAlexaCanvas } from './FinalAlexaCanvas';

type ExpressionType = 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
type LedModeType = 'solid' | 'pulse' | 'wave' | 'off';

const EXPRESSIONS: { type: ExpressionType; label: string; face: string }[] = [
  { type: 'happy', label: 'Happy', face: '⌒ ‿ ⌒' },
  { type: 'resting', label: 'Default Resting Face', face: '・ ‿ ・' },
  { type: 'curious', label: 'Curious', face: '・ o ・' },
  { type: 'wink', label: 'Wink', face: '⌒ ‿ o' },
  { type: 'sleepy', label: 'Sleepy', face: '＞ ｏ ＞' },
  { type: 'yawning', label: 'Yawning', face: '￣ ｏ ￣' },
  { type: 'dizzy', label: 'Dizzy', face: 'x ‿ x' },
  { type: 'excited', label: 'Excited', face: '^ ‿ ^' },
  { type: 'sad', label: 'Sad', face: '∪ ‿ ∪' },
];

/**
 * Full-screen twin of FinalPage — same 3D mecha-twin + dismantle sequence,
 * no Controls Sidebar. The canvas and the scroll-triggered phase overlay
 * both always take the full viewport instead of sharing it with a 40%-wide
 * panel, since there's no panel to share with here.
 */
export function FinalShowcasePage() {
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

  // ── Dismantle Sequence state ─────────────────────────────────────────────
  const [dismantleSequenceActive, setDismantleSequenceActive] = useState(false);
  const [cpuScrollProgress, setCpuScrollProgress] = useState(0);
  const [isCpuPlaying, setIsCpuPlaying] = useState<boolean>(false);
  const [cpuTargetProgress, setCpuTargetProgress] = useState<number | null>(null);
  const cpuScrollContainerRef = useRef<HTMLDivElement>(null);
  const [cameraResetSignal, setCameraResetSignal] = useState<number | undefined>(undefined);
  const [alexaOpacityOverride, setAlexaOpacityOverride] = useState<number | null>(null);

  // Function to trigger animation to a specific progress
  const animateToProgress = (target: number) => {
    setDismantleSequenceActive(true);
    setCpuTargetProgress(target);
    setIsCpuPlaying(true);
  };

  // Scroll (mouse wheel / two-finger trackpad) starts the dismantle sequence —
  // before that, the same wheel/drag gestures just orbit the camera (see
  // FinalAlexaCanvas: zoom is off outside debug so wheel never fights this).
  const startDismantleFromScroll = (deltaY: number) => {
    if (dismantleSequenceActive || deltaY <= 0) return;
    setDismantleSequenceActive(true);
    setCpuScrollProgress(0);
    requestAnimationFrame(() => {
      if (cpuScrollContainerRef.current) cpuScrollContainerRef.current.scrollTop = 0;
    });
  };

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
    // Increase duration specifically when joining back together or returning to split view
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

  const pipelineSteps = useMemo(() => [
    { label: 'L1: PERCEPTION',         title: 'T1 Acoustic Embeddings' },
    { label: 'L2: MCP INTERPOSER',     title: 'Interposer Telemetry' },
    { label: 'L3: EDGE SLM & CACHE',   title: 'Local Recall & T2 Cache' },
    { label: 'L4: ONTOLOGY SHIELD',    title: 'Deterministic Safety Gate' },
    { label: 'L5: BEDROCK AGENTS',     title: 'T3 Reasoning & Compiler' },
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

  return (
    <div
      className="relative w-screen h-screen overflow-hidden select-none font-sans transition-colors duration-150"
      style={{ backgroundColor: dynamicTheme.bg, color: dynamicTheme.text }}
      onWheel={(e) => startDismantleFromScroll(e.deltaY)}
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
            <div className="w-2.5 h-2.5 rounded-full bg-[#3a7ca5] animate-pulse" />
            <span className="text-xs font-bold tracking-[0.2em] font-mono" style={{ color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#7A7168' : '#B8AFA4' }}>
              ALEXA.INTEGRATED
            </span>
          </div>
          {/* Mobile Back Button */}
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

        {/* Center Navigation - Controls for the mecha twin dismantle & assembly */}
        <div className="pointer-events-auto flex items-center bg-black/65 backdrop-blur-md px-2.5 py-1.5 border rounded-full shadow-lg transition-all duration-300 gap-1.5"
          style={{
            borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(74, 65, 55, 0.25)' : 'rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <button
            onClick={() => animateToProgress(0.0)}
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
            onClick={() => animateToProgress(0.50)}
            className={`px-3 py-1 rounded-full font-mono text-[9px] md:text-[10px] uppercase tracking-wider transition-all duration-200 ${
              dismantleSequenceActive && Math.abs(cpuScrollProgress - 0.50) < 0.1
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
                animateToProgress(0.50); // back to split
              } else {
                animateToProgress(1.0); // to joined
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

        {/* Right buttons: Back to Dashboard */}
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

      {/* 3D WebGL Canvas Area — always full screen, no sidebar to share with */}
      <div className="relative w-full h-full flex items-center justify-center z-10">
        <style dangerouslySetInnerHTML={{__html: `
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

        {isSinging && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="relative w-10 h-10 -translate-y-16">
              <span className="absolute text-2xl text-[#f1c40f] singing-note-1 select-none font-bold" style={{ animationDelay: '0s' }}>♪</span>
              <span className="absolute text-3xl text-[#3da5e0] singing-note-2 select-none font-bold" style={{ animationDelay: '0.8s' }}>♫</span>
              <span className="absolute text-2xl text-[#e05353] singing-note-3 select-none font-bold" style={{ animationDelay: '1.5s' }}>♬</span>
              <span className="absolute text-2xl text-[#27ae60] singing-note-1 select-none font-bold" style={{ animationDelay: '2.0s' }}>♪</span>
              <span className="absolute text-3xl text-[#9b59b6] singing-note-2 select-none font-bold" style={{ animationDelay: '2.5s' }}>♫</span>
            </div>
          </div>
        )}

        {(expression === 'yawning' || expression === 'sleepy') && (
          <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
            <div className="relative w-10 h-10 -translate-y-24 translate-x-12">
              <span className="absolute text-xl text-[#3da5e0] sleepy-zzz-1 select-none font-mono font-bold" style={{ animationDelay: '0s' }}>Z</span>
              <span className="absolute text-2xl text-[#cce6ff] sleepy-zzz-2 select-none font-mono font-bold" style={{ animationDelay: '0.7s' }}>z</span>
              <span className="absolute text-sm text-[#00f3ff] sleepy-zzz-3 select-none font-mono font-bold" style={{ animationDelay: '1.4s' }}>z</span>
              <span className="absolute text-2xl text-[#3da5e0] sleepy-zzz-1 select-none font-mono font-bold" style={{ animationDelay: '2.0s' }}>Z</span>
              <span className="absolute text-xl text-[#cce6ff] sleepy-zzz-2 select-none font-mono font-bold" style={{ animationDelay: '2.7s' }}>z</span>
            </div>
          </div>
        )}

        {isSpeaking && (
          <div className="absolute top-[22%] right-[8%] z-20 max-w-[240px] px-4 py-3 border border-[#3da5e0] bg-[#0c1620]/95 text-[#F2EDE6] rounded-xl font-mono text-xs shadow-lg animate-bounce pointer-events-none">
            <div className="text-[10px] text-[#3da5e0] mb-1 font-bold">ALEXA SPEAKING:</div>
            <div className="leading-relaxed">"Beep boop! Hello human! I am your cute mecha twin, ready for smart home commands! ✦"</div>
          </div>
        )}

        {isSinging && (
          <div className="absolute top-[22%] right-[8%] z-20 max-w-[240px] px-4 py-3 border border-[#f1c40f] bg-[#1f190a]/95 text-[#F2EDE6] rounded-xl font-mono text-xs shadow-lg animate-bounce pointer-events-none">
            <div className="text-[10px] text-[#f1c40f] mb-1 font-bold">ALEXA SINGING:</div>
            <div className="leading-relaxed">"♪ La la la~ Beep boop! Do re mi fa sol~ ♬"</div>
          </div>
        )}

        <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-mono text-[#7A7168] pointer-events-none">
          <div>DRAG TO ROTATE • SCROLL TO ZOOM</div>
          <div className="text-[#B8AFA4]">
            HOVER MODEL FOR RETRO ANIMATIONS • DRAG TO ORBIT
          </div>
        </div>

        <div
          className="absolute top-20 left-6 z-20 px-3 py-1.5 border border-[#3b3a37] bg-black/40 rounded-md pointer-events-none transition-all duration-300"
          style={{ opacity: dismantleSequenceActive ? 0 : 1 }}
        >
          <div className="text-[9px] font-mono text-[#7A7168] uppercase tracking-wider mb-0.5">CURRENT MOOD</div>
          <div className="text-sm font-semibold tracking-wider font-mono text-[#e9b44c]">
            {expression.toUpperCase()} {EXPRESSIONS.find(e => e.type === expression)?.face}
          </div>
        </div>

        {!dismantleSequenceActive && (
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
      </div>

      {/* ── TIMELINE SCRUBBER — bottom centered to prevent overlaps ── */}
      {dismantleSequenceActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <div className="flex items-center space-x-2.5 bg-black/60 backdrop-blur-md px-4 py-2 border border-white/20 rounded-full shadow-lg">
            <span className="text-[9px] font-mono tracking-widest text-[#B8AFA4] select-none font-bold">SCRUB TIMELINE:</span>
            <AnimeTimelineScrubber
              progress={cpuScrollProgress}
              onScrub={(prog) => {
                setCpuScrollProgress(prog);
                if (cpuScrollContainerRef.current) {
                  const el = cpuScrollContainerRef.current;
                  el.scrollTop = prog * (el.scrollHeight - el.clientHeight);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* ── NATIVE SCROLL CONTAINER OVERLAY — full screen, not a right-side rail ── */}
      {dismantleSequenceActive && (
        <div
          ref={cpuScrollContainerRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            const prog = el.scrollTop / (el.scrollHeight - el.clientHeight);
            setCpuScrollProgress(Math.min(1, prog));
          }}
          className="absolute inset-0 overflow-y-auto pointer-events-auto scrollbar-none z-30"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="w-full flex flex-col" style={{ height: '450vh' }}>
            <div className="w-full flex flex-col items-center pointer-events-none px-6 md:px-16">

              {/* Section 1: Initial empty space */}
              <section className="h-[175vh] w-full flex flex-col justify-center items-center font-mono" />

              <section className="h-screen w-full flex flex-col justify-center items-center font-mono">
                {/* Commented out as requested
                <div
                  className="p-6 max-w-xl w-full backdrop-blur-md border rounded-xl transition-all duration-300 pointer-events-auto shadow-lg"
                  style={{
                    borderColor: 'rgba(217, 169, 138, 0.25)',
                    backgroundColor: 'rgba(12, 11, 10, 0.88)',
                    color: '#e0dbd5',
                  }}
                >
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: dismantleSequenceActive ? '#ff3333' : ledColor }}>
                    COMPUTE CASCADE TIERS (T0 - T3)
                  </span>
                  <h2 className="text-xl font-bold leading-none mb-4 text-white">
                    On-Device to Cloud Execution Tiers
                  </h2>
                  <div className="space-y-4 text-xs font-sans">
                    <div className="border-b border-[#4a4137]/15 pb-2.5 text-left">
                      <div className="flex justify-between font-mono font-bold text-[#3bf574]">
                        <span>⚡ T0: REFLEX LAYER</span>
                        <span>&lt;10ms</span>
                      </div>
                      <p className="opacity-85 mt-1 text-[11px] leading-relaxed text-[#a8a198]">
                        <strong>Where:</strong> Local Device/Hub rule engine. Runs pre-compiled deterministic rules & safety shutdowns instantly offline without cloud compute ($0 cost).
                      </p>
                    </div>

                    <div className="border-b border-[#4a4137]/15 pb-2.5 text-left">
                      <div className="flex justify-between font-mono font-bold text-[#3da5e0]">
                        <span>🎙️ T1: PERCEPTION LAYER</span>
                        <span>&lt;100ms</span>
                      </div>
                      <p className="opacity-85 mt-1 text-[11px] leading-relaxed text-[#a8a198]">
                        <strong>Where:</strong> Edge Node ML models. Handles offline audio wake-word detection, speaker ID, and acoustic event mapping (e.g. pressure cooker whistle).
                      </p>
                    </div>

                    <div className="border-b border-[#4a4137]/15 pb-2.5 text-left">
                      <div className="flex justify-between font-mono font-bold text-[#e9b44c]">
                        <span>📦 T2: RECALL LAYER</span>
                        <span>~100–500ms</span>
                      </div>
                      <p className="opacity-85 mt-1 text-[11px] leading-relaxed text-[#a8a198]">
                        <strong>Where:</strong> Home Hub Local Cache. Searches semantic cache & runs small local language models to resolve paraphrased queries without going to cloud.
                      </p>
                    </div>

                    <div className="text-left">
                      <div className="flex justify-between font-mono font-bold text-[#ff3333]">
                        <span>🧠 T3: REASONING LAYER</span>
                        <span>0.5–3s</span>
                      </div>
                      <p className="opacity-85 mt-1 text-[11px] leading-relaxed text-[#a8a198]">
                        <strong>Where:</strong> Cloud (AWS Bedrock). Claude supervisor plans novel commands, delegating to Commerce/Safety agents, then compiles into local T0 rules for next time.
                      </p>
                    </div>
                  </div>
                </div>
                */}
              </section>

              {/* Spacer before next card/phase */}
              <section className="h-[75vh] w-full" />

              {/* Section 3: Joining phase spacer */}
              <section className="h-screen w-full flex flex-col justify-center items-center font-mono" />

            </div>
          </div>
        </div>
      )}

      {/* ── SYSTEM PIPELINE RUNTIME CARD (JOINING PHASE) ── */}
      {dismantleSequenceActive && cpuScrollProgress >= 0.60 && (
        <div
          className="fixed left-6 md:left-12 top-[20%] w-[90%] max-w-[340px] p-5 md:p-6 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-xl z-30"
          style={{
            borderColor: 'rgba(217, 169, 138, 0.25)',
            backgroundColor: 'rgba(12, 11, 10, 0.88)',
            color: '#e0dbd5',
            boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
          }}
        >
          <span className="text-[9px] font-mono tracking-[0.2em] font-bold block mb-1" style={{ color: ledColor }}>
            SYSTEM PIPELINE RUNTIME
          </span>
          <h3 className="text-xl font-display font-bold leading-none mb-3 text-white">
            {pipelineSteps[currentStepIdx].title}
          </h3>
          <p className="text-xs font-mono leading-relaxed mb-4 text-[#a8a198]">
            {currentStepIdx === 0 && "Zero-shot sound discovery detects signature acoustic events and triggers BLE/Voice identity mapping."}
            {currentStepIdx === 1 && "Aggregates long-tail appliances into unified, type-safe MCP capability interfaces."}
            {currentStepIdx === 2 && "Checks local cache. If query hits a compiled rule, runs locally at <120ms without consuming cloud tokens."}
            {currentStepIdx === 3 && "Policy authorization gate filters LLM action plans, checks principal access, and blocks unsafe actuation at the plug."}
            {currentStepIdx === 4 && "Distributes target command payloads to corresponding smart home devices using optimal transport protocols."}
          </p>

          <div className="flex flex-col space-y-1.5 font-mono text-[9px] border-t border-[#4a4137]/30 pt-3">
            {pipelineSteps.map((step, idx) => {
              const isActive = currentStepIdx === idx;
              const isCompleted = currentStepIdx > idx;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between"
                  style={{
                    color: isActive ? ledColor : (isCompleted ? '#3bf574' : '#6a5f52'),
                    fontWeight: isActive ? 700 : 400
                  }}
                >
                  <span>{step.label}</span>
                  <span>{isActive ? '▶ ACTIVE' : (isCompleted ? '✓ OK' : 'PENDING')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
export default FinalShowcasePage;

function AnimeTimelineScrubber({ progress, onScrub }: { progress: number; onScrub: (progress: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [localProgress, setLocalProgress] = useState(progress);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalProgress(progress);
    }
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

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging.current) return;
      updateProgress(event.clientX);
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
