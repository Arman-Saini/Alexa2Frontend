import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { FinalAlexaCanvas } from './FinalAlexaCanvas';

type ExpressionType = 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
type LedModeType = 'solid' | 'pulse' | 'wave' | 'off';

interface ColorOption {
  name: string;
  value: string;
}

const BODY_COLORS: ColorOption[] = [
  { name: 'Matte Charcoal', value: '#2e323b' },
  { name: 'Ghibli Forest', value: '#244d47' },
  { name: 'Doraemon Blue', value: '#3a7ca5' },
  { name: 'Pippo Yellow', value: '#e9b44c' },
  { name: 'Retro Cream', value: '#e2d5c3' },
  { name: 'Sakura Pink', value: '#e2959d' },
];

const LED_COLORS: ColorOption[] = [
  { name: 'Alexa Aqua', value: '#00f3ff' },
  { name: 'Ember Orange', value: '#ff9233' },
  { name: 'Forest Green', value: '#3bf574' },
  { name: 'Void Violet', value: '#d254ff' },
  { name: 'Sakura Pink', value: '#ff66b2' },
];

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

export function FinalPage() {
  const [expression, setExpression] = useState<ExpressionType>('resting');
  const [bodyColor, setBodyColor] = useState<string>('#e2d5c3');
  const [ledColor, setLedColor] = useState<string>('#00f3ff');
  const [ledMode, setLedMode] = useState<LedModeType>('pulse');
  const [outlineThickness, setOutlineThickness] = useState<number>(1.3);
  const [explodedProgress, setExplodedProgress] = useState<number>(0.0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSinging, setIsSinging] = useState<boolean>(false);

  // Auto-explode animation state
  const [isExploding, setIsExploding] = useState(false);

  // ── Dismantle Sequence state ─────────────────────────────────────────────
  const [dismantleSequenceActive, setDismantleSequenceActive] = useState(false);
  const [cpuScrollProgress, setCpuScrollProgress] = useState(0);
  const [isCpuPlaying, setIsCpuPlaying] = useState<boolean>(false);
  const [cpuPlayDirection, setCpuPlayDirection] = useState<'forward' | 'backward'>('backward');
  const cpuScrollContainerRef = useRef<HTMLDivElement>(null);

  // ── Coordinates Debug Tuning State (mirrored from cpuanimation) ─────────────
  const debugCpuOffsetY = 1.05;
  const debugCpuPhase2Y = 1.18;
  const debugCpuRestingY = 0.0;
  const debugCamPanX = 0.0;
  const debugCamOffsetY = 0.0;
  const debugCamPanZ = 0.0;
  const debugCamZoom = 200;
  const debugCamYaw = 0.0;
  const debugCamPitch = 0.0;

  // Dynamic explodedProgress tied to unified scroll progress when sequence is active
  const currentExplodedProgress = useMemo(() => {
    if (!dismantleSequenceActive) return explodedProgress;
    const s = cpuScrollProgress;
    if (s < 0.20) {
      return s / 0.20;
    } else if (s < 0.80) {
      return 1.0;
    } else {
      return Math.max(0, 1.0 - (s - 0.80) / 0.20);
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

  // When cpuScrollProgress hits 1: close Alexa into dizzy state, reset sequence
  useEffect(() => {
    if (cpuScrollProgress >= 1.0 && dismantleSequenceActive) {
      // Short delay before closing so user can see the final CPU state
      const timer = setTimeout(() => {
        setDismantleSequenceActive(false);
        setCpuScrollProgress(0);
        triggerAssemble();
        setExpression('dizzy');
        if (cpuScrollContainerRef.current) {
          cpuScrollContainerRef.current.scrollTop = 0;
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuScrollProgress, dismantleSequenceActive]);

  // CPU Animation autoplay effect for Collapse & Remake buttons
  useEffect(() => {
    if (!isCpuPlaying) return;
    let animFrameId: number;
    const startTime = performance.now();
    const startProgress = cpuScrollProgress;
    const targetProgress = cpuPlayDirection === 'forward' ? 1.0 : 0.0;
    const duration = 4000; // 4 seconds autoplay

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
  }, [isCpuPlaying, cpuPlayDirection]);

  // Pipeline labels mirrored from CpuAnimationPage for the liquid glass HUD
  const pipelineSteps = useMemo(() => [
    { label: 'L1: PERCEPTION',         title: 'T1 Acoustic Embeddings' },
    { label: 'L2: MCP INTERPOSER',     title: 'Interposer Telemetry' },
    { label: 'L3: EDGE SLM & CACHE',   title: 'Local Recall & T2 Cache' },
    { label: 'L4: ONTOLOGY SHIELD',    title: 'Deterministic Safety Gate' },
    { label: 'L5: BEDROCK AGENTS',     title: 'T3 Reasoning & Compiler' },
  ], []);

  const currentStepIdx = useMemo(() => {
    if (cpuScrollProgress < 0.84) return 0;
    if (cpuScrollProgress < 0.88) return 1;
    if (cpuScrollProgress < 0.92) return 2;
    if (cpuScrollProgress < 0.96) return 3;
    return 4;
  }, [cpuScrollProgress]);

  // Find names for current colors
  const activeBodyColorName = BODY_COLORS.find((c) => c.value === bodyColor)?.name || 'Custom';
  const activeLedColorName = LED_COLORS.find((c) => c.value === ledColor)?.name || 'Custom';

  // Dynamically computed colors for dark-to-light theme inversion
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
    // Transition starts at scroll 0.45, peaks at 0.51, stays light until 0.84, returns to dark by 0.90
    if (s >= 0.45) {
      if (s < 0.51) {
        t = (s - 0.45) / 0.06;
      } else if (s < 0.84) {
        t = 1.0;
      } else if (s < 0.90) {
        t = 1.0 - (s - 0.84) / 0.06;
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
      className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row select-none font-sans transition-colors duration-150"
      style={{ backgroundColor: dynamicTheme.bg, color: dynamicTheme.text }}
    >
      {/* 1. Background Paper Texture Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 2. Top-Left Header */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none md:px-8">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3a7ca5] animate-pulse" />
          <span className="text-xs font-bold tracking-[0.2em] font-mono" style={{ color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#7A7168' : '#B8AFA4' }}>
            ALEXA.INTEGRATED
          </span>
        </div>
        <Link
          to="/"
          className="pointer-events-auto flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[#4a4137] bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
          style={{
            borderColor: dismantleSequenceActive && cpuScrollProgress > 0.35 ? 'rgba(0,0,0,0.15)' : '#4a4137',
            color: dismantleSequenceActive && cpuScrollProgress > 0.35 ? '#161514' : '#F2EDE6',
          }}
        >
          <span>← BACK TO DASHBOARD</span>
        </Link>
      </header>

      {/* 3. 3D WebGL Canvas Area */}
      <div
        className="relative h-[50vh] md:h-full flex items-center justify-center z-10 transition-all duration-700 ease-in-out"
        style={{ width: dismantleSequenceActive ? '100%' : '60%' }}
      >
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
            debugCpuOffsetY={debugCpuOffsetY}
            debugCpuPhase2Y={debugCpuPhase2Y}
            debugCpuRestingY={debugCpuRestingY}
            debugCamPanX={debugCamPanX}
            debugCamOffsetY={debugCamOffsetY}
            debugCamPanZ={debugCamPanZ}
            debugCamZoom={debugCamZoom}
            debugCamYaw={debugCamYaw}
            debugCamPitch={debugCamPitch}
          />
        </div>


        {/* Floating Singing Notes */}
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

        {/* Floating Sleepy Zzzs */}
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

        {/* Floating Speaking Bubble */}
        {isSpeaking && (
          <div className="absolute top-[22%] right-[8%] z-20 max-w-[240px] px-4 py-3 border border-[#3da5e0] bg-[#0c1620]/95 text-[#F2EDE6] rounded-xl font-mono text-xs shadow-lg animate-bounce pointer-events-none">
            <div className="text-[10px] text-[#3da5e0] mb-1 font-bold">ALEXA SPEAKING:</div>
            <div className="leading-relaxed">"Beep boop! Hello human! I am your cute mecha twin, ready for smart home commands! ✦"</div>
          </div>
        )}

        {/* Floating Singing Bubble */}
        {isSinging && (
          <div className="absolute top-[22%] right-[8%] z-20 max-w-[240px] px-4 py-3 border border-[#f1c40f] bg-[#1f190a]/95 text-[#F2EDE6] rounded-xl font-mono text-xs shadow-lg animate-bounce pointer-events-none">
            <div className="text-[10px] text-[#f1c40f] mb-1 font-bold">ALEXA SINGING:</div>
            <div className="leading-relaxed">"♪ La la la~ Beep boop! Do re mi fa sol~ ♬"</div>
          </div>
        )}

        {/* Viewport Floating Info */}
        <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-mono text-[#7A7168] pointer-events-none">
          <div>DRAG TO ROTATE • SCROLL TO ZOOM</div>
          <div className="text-[#B8AFA4]">
            HOVER MODEL FOR RETRO ANIMATIONS • DRAG TO ORBIT
          </div>
        </div>

        {/* Floating Expression Bubble */}
        <div
          className="absolute top-20 left-6 z-20 px-3 py-1.5 border border-[#3b3a37] bg-black/40 rounded-md pointer-events-none transition-all duration-300"
          style={{ opacity: dismantleSequenceActive ? 0 : 1 }}
        >
          <div className="text-[9px] font-mono text-[#7A7168] uppercase tracking-wider mb-0.5">CURRENT MOOD</div>
          <div className="text-sm font-semibold tracking-wider font-mono text-[#e9b44c]">
            {expression.toUpperCase()} {EXPRESSIONS.find(e => e.type === expression)?.face}
          </div>
        </div>


      </div>

      {/* 4. Controls Sidebar (Glassmorphic scrollable panel) */}
      <div
        className="h-[50vh] md:h-full z-20 flex flex-col border-t md:border-t-0 md:border-l border-[#2E2822] bg-[#121110]/95 backdrop-blur-xl transition-all duration-700 ease-in-out"
        style={{
          width: dismantleSequenceActive ? '0%' : '40%',
          transform: dismantleSequenceActive ? 'translateX(100%)' : 'translateX(0)',
          opacity: dismantleSequenceActive ? 0 : 1,
          overflow: 'hidden',
          minWidth: dismantleSequenceActive ? '0' : '360px',
        }}
      >
        {/* Title */}
        <div className="px-6 pt-20 pb-4 border-b border-[#2E2822]">
          <h1 className="text-3xl font-display text-[#F2EDE6] leading-none mb-1">
            Mecha Twin Lab
          </h1>
          <p className="text-xs font-mono text-[#7A7168] tracking-wide uppercase">
            Future Gadget #008 • Pippo Model
          </p>
        </div>

        {/* Scrollable Control Elements */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 select-none">
          {/* Section A: Expressions Grid */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono text-[#C08662] uppercase tracking-[0.15em] font-semibold">
              1. Synthesizer Expression
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {EXPRESSIONS.map((item) => (
                <button
                  key={item.type}
                  onClick={() => setExpression(item.type)}
                  className={`flex flex-col items-center justify-between p-2 rounded-md border text-center transition-all duration-200 ${
                    expression === item.type
                      ? 'bg-[#C08662]/15 border-[#C08662] text-[#F2EDE6]'
                      : 'bg-black/20 border-[#2E2822] text-[#7A7168] hover:border-[#4a4137] hover:text-[#B8AFA4]'
                  }`}
                >
                  <span className="text-xs font-mono font-bold mb-2">{item.face}</span>
                  <span className="text-[9px] font-mono tracking-wider uppercase">{item.type}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Section B: Customization Laboratory */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono text-[#C08662] uppercase tracking-[0.15em] font-semibold">
              2. Structural Customization
            </h3>

            {/* Body Shell Colors */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">BODY SHELL COLOR</span>
                <span className="text-[#e9b44c] font-bold">{activeBodyColorName.toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {BODY_COLORS.map((col) => (
                  <button
                    key={col.value}
                    onClick={() => setBodyColor(col.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform duration-150 ${
                      bodyColor === col.value ? 'scale-110 border-[#F2EDE6]' : 'border-black/50 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            {/* LED Light Customization */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">LED COLOR RING</span>
                <span className="text-[#e9b44c] font-bold">{activeLedColorName.toUpperCase()}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {LED_COLORS.map((col) => (
                  <button
                    key={col.value}
                    onClick={() => setLedColor(col.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform duration-150 ${
                      ledColor === col.value ? 'scale-110 border-[#F2EDE6]' : 'border-black/50 hover:scale-105'
                    }`}
                    style={{ backgroundColor: col.value }}
                    title={col.name}
                  />
                ))}
              </div>

              {/* LED Ring Mode */}
              <div className="pt-2">
                <div className="text-[10px] font-mono text-[#7A7168] uppercase tracking-wider mb-2">LED GLOW SIGNAL</div>
                <div className="grid grid-cols-4 gap-1.5 font-mono text-[9px] tracking-widest">
                  {(['wave', 'pulse', 'solid', 'off'] as LedModeType[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setLedMode(mode)}
                      className={`py-1.5 border rounded uppercase ${
                        ledMode === mode
                          ? 'border-[#C08662] bg-[#C08662]/10 text-[#F2EDE6]'
                          : 'border-[#2E2822] bg-black/10 text-[#7A7168] hover:text-[#B8AFA4]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section C: Cel Outline & Dismantle Engine */}
          <section className="space-y-4">
            <h3 className="text-xs font-mono text-[#C08662] uppercase tracking-[0.15em] font-semibold">
              3. Blueprint Schematic Controls
            </h3>

            {/* Cel Outline Thickness */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">CARTOON OUTLINE THICKNESS</span>
                <span>{(outlineThickness).toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.1"
                value={outlineThickness}
                onChange={(e) => setOutlineThickness(parseFloat(e.target.value))}
                className="w-full h-1 bg-[#2E2822] rounded-lg appearance-none cursor-pointer"
              />
            </div>
            {/* Electrical Back Panel Door */}
            <div className="space-y-2 pt-1 pb-2">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">ELECTRICAL BACK PANEL</span>
                <span className={isPanelOpen ? 'text-[#e9b44c] font-bold' : 'text-[#7A7168]'}>
                  {isPanelOpen ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              <button
                onClick={() => setIsPanelOpen(!isPanelOpen)}
                className={`w-full py-2 text-xs font-mono border rounded uppercase transition-colors ${
                  isPanelOpen
                    ? 'border-[#e9b44c] bg-[#e9b44c]/10 text-[#F2EDE6]'
                    : 'border-[#2E2822] bg-black/10 text-[#7A7168] hover:text-[#B8AFA4] hover:border-[#4a4137]'
                }`}
              >
                {isPanelOpen ? 'Close Panel Door' : 'Open Panel Door'}
              </button>
            </div>

            {/* Vocal Mimic Speaking */}
            <div className="space-y-2 pt-1 pb-2 border-t border-[#2E2822]">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">VOCAL MIMIC VOICE</span>
                <span className={isSpeaking ? 'text-[#3da5e0] font-bold' : 'text-[#7A7168]'}>
                  {isSpeaking ? 'SPEAKING ACTIVE' : 'SILENT'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsSinging(false);
                  setIsSpeaking(!isSpeaking);
                }}
                className={`w-full py-2 text-xs font-mono border rounded uppercase transition-colors ${
                  isSpeaking
                    ? 'border-[#3da5e0] bg-[#3da5e0]/10 text-[#F2EDE6]'
                    : 'border-[#2E2822] bg-black/10 text-[#7A7168] hover:text-[#B8AFA4] hover:border-[#4a4137]'
                }`}
              >
                {isSpeaking ? 'Stop Speaking' : 'Mimic Speaking Voice'}
              </button>
            </div>

            {/* Vocal Mimic Singing */}
            <div className="space-y-2 pt-1 pb-2 border-t border-[#2E2822]">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">VOCAL MIMIC SINGING</span>
                <span className={isSinging ? 'text-[#f1c40f] font-bold' : 'text-[#7A7168]'}>
                  {isSinging ? 'SINGING ACTIVE' : 'SILENT'}
                </span>
              </div>
              <button
                onClick={() => {
                  setIsSpeaking(false);
                  setIsSinging(!isSinging);
                }}
                className={`w-full py-2 text-xs font-mono border rounded uppercase transition-colors ${
                  isSinging
                    ? 'border-[#f1c40f] bg-[#f1c40f]/10 text-[#F2EDE6]'
                    : 'border-[#2E2822] bg-black/10 text-[#7A7168] hover:text-[#B8AFA4] hover:border-[#4a4137]'
                }`}
              >
                {isSinging ? 'Stop Singing' : 'Mimic Singing Voice'}
              </button>
            </div>

            {/* Exploded View Blueprint */}
            <div className="space-y-3 pt-2 border-t border-[#2E2822]">
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-[#B8AFA4]">EXPLODED BLUEPRINT SHIFT</span>
                <span>{Math.round((dismantleSequenceActive ? cpuScrollProgress : explodedProgress) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={dismantleSequenceActive ? cpuScrollProgress : explodedProgress}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  
                  // Dragging slider activates sequence mode immediately
                  if (!dismantleSequenceActive && val > 0) {
                    setDismantleSequenceActive(true);
                  }

                  if (dismantleSequenceActive || val > 0) {
                    setCpuScrollProgress(val);
                    if (cpuScrollContainerRef.current) {
                      const container = cpuScrollContainerRef.current;
                      container.scrollTop = val * (container.scrollHeight - container.clientHeight);
                    }
                  } else {
                    setIsExploding(false);
                    setExplodedProgress(val);
                  }
                }}
                className="w-full h-1 bg-[#2E2822] rounded-lg appearance-none cursor-pointer"
              />

              {/* Quick Trigger Buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setDismantleSequenceActive(true);
                      setCpuScrollProgress(0);
                      if (cpuScrollContainerRef.current) {
                        cpuScrollContainerRef.current.scrollTop = 0;
                      }
                    }}
                    className={`flex-1 py-2 text-xs font-mono border rounded uppercase transition-colors ${
                      (dismantleSequenceActive ? cpuScrollProgress : explodedProgress) >= 0.95
                        ? 'border-[#7A7168] text-[#7A7168] cursor-not-allowed'
                        : 'border-[#3a7ca5]/50 bg-[#3a7ca5]/10 hover:bg-[#3a7ca5]/20 hover:border-[#3a7ca5] text-[#F2EDE6]'
                    }`}
                    disabled={(dismantleSequenceActive ? cpuScrollProgress : explodedProgress) >= 0.95}
                  >
                    Dismantle Core
                  </button>
                  <button
                    onClick={triggerAssemble}
                    className={`flex-1 py-2 text-xs font-mono border rounded uppercase transition-colors ${
                      explodedProgress <= 0.05
                        ? 'border-[#7A7168] text-[#7A7168] cursor-not-allowed'
                        : 'border-[#C08662]/50 bg-[#C08662]/10 hover:bg-[#C08662]/20 hover:border-[#C08662] text-[#F2EDE6]'
                    }`}
                    disabled={explodedProgress <= 0.05}
                  >
                    Assemble Core
                  </button>
                </div>
                <button
                  onClick={() => {
                    setDismantleSequenceActive(true);
                    setCpuScrollProgress(0.20);
                    setTimeout(() => {
                      if (cpuScrollContainerRef.current) {
                        const container = cpuScrollContainerRef.current;
                        container.scrollTop = 0.20 * (container.scrollHeight - container.clientHeight);
                      }
                    }, 50);
                  }}
                  className="w-full py-2 text-xs font-mono border border-[#e9b44c]/50 bg-[#e9b44c]/10 hover:bg-[#e9b44c]/20 hover:border-[#e9b44c] text-[#F2EDE6] rounded uppercase transition-colors"
                >
                  Troubleshoot: Opened &amp; Flat CPU
                </button>
              </div>
            </div>
          </section>

          {/* Section D: Mecha Blueprint Info Panel */}
          <section className="p-4 border border-[#4a4137]/30 bg-[#1e1c1a]/50 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 pb-1 border-b border-[#2E2822]">
              <svg className="w-3.5 h-3.5 text-[#e9b44c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <h4 className="text-[11px] font-mono text-[#e9b44c] font-bold uppercase tracking-wider">
                System Schematic readouts
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[10px] font-mono text-[#B8AFA4]">
              <div>CLASSIFICATION:</div>
              <div className="text-right text-[#F2EDE6]">Retro-Smart Assistant</div>

              <div>ONTOLOGY CORE:</div>
              <div className="text-right text-[#F2EDE6]">Pippo v0.8.4 (Active)</div>

              <div>CHASSIS COLOR:</div>
              <div className="text-right text-[#F2EDE6] uppercase">{bodyColor}</div>

              <div>LED SYSTEM:</div>
              <div className="text-right text-[#F2EDE6] uppercase">{ledColor} ({ledMode})</div>

              <div>DOCK STAND:</div>
              <div className="text-right text-[#F2EDE6]">Magnetic Riveted Plate</div>

              <div>INTERFACE DRIVER:</div>
              <div className="text-right text-[#F2EDE6]">Positronic Emissive UI</div>
            </div>
          </section>
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 border-t border-[#2E2822] text-center text-[9px] font-mono text-[#7A7168]">
          Ghibli &amp; Doraemon Movie Aesthetic Redesign Project • 2026
        </div>
      </div>

      {/* ── FLOATING EXIT BUTTON & SCRUBBER ───────────────────────────────────── */}
      {dismantleSequenceActive && (
        <div className="fixed top-6 right-6 z-50 flex items-center space-x-3 pointer-events-auto">
          <div className="flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 h-8 border border-white/20 rounded-full shadow-lg">
            <span className="text-[9px] font-mono tracking-widest text-white/70 select-none">SCRUB:</span>
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
          <button
            onClick={() => {
              setCpuPlayDirection('backward');
              setIsCpuPlaying(true);
            }}
            disabled={isCpuPlaying || cpuScrollProgress === 0}
            className="text-[10px] font-mono bg-black/60 hover:bg-[#ff3333]/20 disabled:opacity-40 text-[#ff3333] hover:text-[#ff6666] border border-[#ff3333]/30 hover:border-[#ff3333] transition-all duration-200 px-4 h-8 rounded-full shadow-lg"
          >
            COLLAPSE & REMAKE
          </button>
          <button
            onClick={() => {
              setDismantleSequenceActive(false);
              setCpuScrollProgress(0);
              triggerAssemble();
              setExpression('dizzy');
              if (cpuScrollContainerRef.current) cpuScrollContainerRef.current.scrollTop = 0;
            }}
            className="text-[10px] font-mono bg-black/60 hover:bg-black/90 text-white/80 hover:text-white transition-all duration-200 px-4 h-8 border border-white/20 rounded-full shadow-lg"
          >
            ✕ EXIT
          </button>
        </div>
      )}


      {/* ── NATIVE SCROLL CONTAINER OVERLAY (Right Half Cards) ────────────── */}
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
            <div className="ml-auto w-full md:w-[45%] flex flex-col pointer-events-none pr-8 md:pr-16">
              
              {/* Phase 1 Overlay */}
              <section className="h-screen w-full flex flex-col justify-center font-mono">
                <div 
                  className="p-6 backdrop-blur-md border rounded-xl transition-all duration-300 pointer-events-auto"
                  style={{
                    borderColor: dynamicTheme.border,
                    backgroundColor: dynamicTheme.panelBg,
                    color: dynamicTheme.text,
                  }}
                >
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: dismantleSequenceActive ? '#ff3333' : ledColor }}>
                    PHASE 01 // LOAD SYSTEM
                  </span>
                  <h2 className="text-2xl font-bold leading-none mb-3">
                    Flat Architecture
                  </h2>
                  <p className="text-xs leading-relaxed" style={{ color: dynamicTheme.subText }}>
                    Initially loaded flat on the horizontal XZ plane with the camera perfectly leveled. Scroll down to trigger the elevation sequence.
                  </p>
                </div>
              </section>

              {/* Phase 2 Overlay */}
              <section className="h-screen w-full flex flex-col justify-center font-mono">
                <div 
                  className="p-6 backdrop-blur-md border rounded-xl transition-all duration-300 pointer-events-auto"
                  style={{
                    borderColor: dynamicTheme.border,
                    backgroundColor: dynamicTheme.panelBg,
                    color: dynamicTheme.text,
                  }}
                >
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: dismantleSequenceActive ? '#ff3333' : ledColor }}>
                    PHASE 02 // CAMERA SWEEP
                  </span>
                  <h2 className="text-2xl font-bold leading-none mb-3">
                    Profile Sweep
                  </h2>
                  <p className="text-xs leading-relaxed" style={{ color: dynamicTheme.subText }}>
                    The camera orbits around the Y-axis by 90 degrees to showcase the structural height of the CPU while it begins to separate.
                  </p>
                </div>
              </section>

              {/* Phase 3-6 Spacer */}
              <section className="h-[150vh] w-full" />

              {/* Phase 7 Overlay */}
              <section className="h-screen w-full flex flex-col justify-center font-mono">
                <div 
                  className="p-6 backdrop-blur-md border rounded-xl transition-all duration-300 pointer-events-auto"
                  style={{
                    borderColor: dynamicTheme.border,
                    backgroundColor: dynamicTheme.panelBg,
                    color: dynamicTheme.text,
                  }}
                >
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: dismantleSequenceActive ? '#ff3333' : ledColor }}>
                    PHASE 07 // PIPELINE JOINING
                  </span>
                  <h2 className="text-2xl font-bold leading-none mb-3">
                    Full Stack Assembly
                  </h2>
                  <p className="text-xs leading-relaxed" style={{ color: dynamicTheme.subText }}>
                    The CPU joins back together layer-by-layer. Watch the left panel to trace how queries traverse the completed smart home runtime.
                  </p>
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* ── LEFT-HAND PIPELINE SIDEBAR BOX ────────────────────────────────── */}
      {dismantleSequenceActive && cpuScrollProgress >= 0.80 && (
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

          {/* Mini progress tracker */}
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
export default FinalPage;

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
