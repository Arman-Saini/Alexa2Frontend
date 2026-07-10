import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HeroCanvas } from './HeroCanvas';
import { createTimeline } from 'animejs';

type ExpressionType = 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
type LedModeType = 'solid' | 'pulse' | 'wave' | 'off';

export function AnimationPage() {
  const [expression, setExpression] = useState<ExpressionType>('resting');
  const [bodyColor, setBodyColor] = useState<string>('#2e323b'); // switches between grey and white
  const [ledColor, setLedColor] = useState<string>('#00f3ff');
  const [ledMode, setLedMode] = useState<LedModeType>('pulse');
  const [outlineThickness] = useState<number>(1.3);
  
  // React state for render-level animations in the model
  const [explodedProgress, setExplodedProgress] = useState<number>(0.0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);

  // Local scrolling container ref to bypass index.css overflow lock
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Cache values to prevent React re-renders on every scroll pixel
  const prevMetricsRef = useRef({
    expression: 'resting' as ExpressionType,
    bodyColor: '#2e323b',
    ledColor: '#00f3ff',
    ledMode: 'pulse' as LedModeType,
  });

  // Ref containing camera and Y rotation values updated by Anime.js timeline
  const animValuesRef = useRef({
    explodedProgress: 0,
    robotRotationY: 0,
    cameraX: 0,
    cameraY: 1.4,
    cameraZ: 5.2,
    lookAtX: 0,
    lookAtY: 0.3,
    lookAtZ: 0,
    panelOpenProgress: 0,
    chipPopProgress: 0,
  });

  useEffect(() => {
    // Setup target object for Anime.js
    const animeTargets = {
      explodedProgress: 0,
      robotRotationY: 0,
      cameraX: 0,
      cameraY: 1.4,
      cameraZ: 5.2,
      lookAtX: 0,
      lookAtY: 0.3,
      lookAtZ: 0,
      panelOpenProgress: 0,
      chipPopProgress: 0,
    };

    // Create the timeline
    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: 'linear' },
      onUpdate: () => {
        // Sync states to trigger React re-renders for positions in JSX
        setExplodedProgress(animeTargets.explodedProgress);
        setIsPanelOpen(animeTargets.panelOpenProgress > 0.5);

        // Sync values to ref for high-performance useFrame updates
        animValuesRef.current.explodedProgress = animeTargets.explodedProgress;
        animValuesRef.current.robotRotationY = animeTargets.robotRotationY;
        animValuesRef.current.cameraX = animeTargets.cameraX;
        animValuesRef.current.cameraY = animeTargets.cameraY;
        animValuesRef.current.cameraZ = animeTargets.cameraZ;
        animValuesRef.current.lookAtX = animeTargets.lookAtX;
        animValuesRef.current.lookAtY = animeTargets.lookAtY;
        animValuesRef.current.lookAtZ = animeTargets.lookAtZ;
        animValuesRef.current.panelOpenProgress = animeTargets.panelOpenProgress;
        animValuesRef.current.chipPopProgress = animeTargets.chipPopProgress;
      }
    });

    // Timeline Choreography:
    // 0 to 400: Explode the mecha robot vertically, rotate Y slightly, camera pans up
    tl.add(animeTargets, {
      explodedProgress: 0.8,
      robotRotationY: Math.PI * 0.12, // slight rotation for isometric depth
      cameraX: 0.8,
      cameraY: 2.0,
      cameraZ: 4.6,
      lookAtX: 0,
      lookAtY: 0.5,
      lookAtZ: 0,
      panelOpenProgress: 0.0,
      chipPopProgress: 0.3,
      duration: 400,
    })
    // 400 to 1000: CPU pops out fully, camera zooms in close looking down
    .add(animeTargets, {
      explodedProgress: 1.0,
      robotRotationY: Math.PI * 0.22,
      cameraX: 1.1,
      cameraY: 2.5,
      cameraZ: 3.8,
      lookAtX: 0,
      lookAtY: 0.7,
      lookAtZ: 0.1,
      panelOpenProgress: 0.0,
      chipPopProgress: 1.0,
      duration: 600,
    });

    const handleScroll = () => {
      const el = scrollContainerRef.current;
      if (!el) return;
      const scrollableHeight = el.scrollHeight - el.clientHeight;
      if (scrollableHeight <= 0) return;
      
      const scrollPercent = el.scrollTop / scrollableHeight;
      tl.seek(scrollPercent * tl.duration);

      // Determine expressions, colors and backgrounds
      let nextExpr: ExpressionType = 'resting';
      let nextBodyColor = '#2e323b'; // grey
      let nextLedColor = '#00f3ff';
      let nextLedMode: LedModeType = 'pulse';
      let nextBgColor = '#161514';
      let nextTextColor = '#F2EDE6';
      let nextSubtextColor = '#B8AFA4';

      if (scrollPercent < 0.25) {
        nextExpr = 'resting';
        nextBodyColor = '#2e323b'; // grey
        nextLedColor = '#00f3ff';
        nextLedMode = 'pulse';
        nextBgColor = '#161514';
        nextTextColor = '#F2EDE6';
        nextSubtextColor = '#B8AFA4';
      } else if (scrollPercent < 0.5) {
        nextExpr = 'curious';
        nextBodyColor = '#2e323b'; // grey
        nextLedColor = '#e9b44c';
        nextLedMode = 'wave';
        nextBgColor = '#161514';
        nextTextColor = '#F2EDE6';
        nextSubtextColor = '#B8AFA4';
      } else if (scrollPercent < 0.75) {
        nextExpr = 'dizzy'; // dizzy face
        nextBodyColor = '#ece6df'; // switches to white
        nextLedColor = '#ff9233';
        nextLedMode = 'solid';
        nextBgColor = '#ECE6DF'; // light theme background
        nextTextColor = '#1a1b20';
        nextSubtextColor = '#5E5A54';
      } else {
        nextExpr = 'dizzy';
        nextBodyColor = '#ffffff'; // pure white
        nextLedColor = '#d254ff';
        nextLedMode = 'pulse';
        nextBgColor = '#ECE6DF';
        nextTextColor = '#1a1b20';
        nextSubtextColor = '#5E5A54';
      }

      // Smoothly update DOM classes/styles directly for high performance
      const pageContainer = document.getElementById('animation-page-container');
      if (pageContainer) {
        pageContainer.style.backgroundColor = nextBgColor;
        pageContainer.style.color = nextTextColor;
        pageContainer.style.setProperty('--theme-subtext', nextSubtextColor);
      }

      // Update React states only when values cross boundaries to avoid lag
      const prev = prevMetricsRef.current;
      if (prev.expression !== nextExpr) {
        prev.expression = nextExpr;
        setExpression(nextExpr);
      }
      if (prev.bodyColor !== nextBodyColor) {
        prev.bodyColor = nextBodyColor;
        setBodyColor(nextBodyColor);
      }
      if (prev.ledColor !== nextLedColor) {
        prev.ledColor = nextLedColor;
        setLedColor(nextLedColor);
      }
      if (prev.ledMode !== nextLedMode) {
        prev.ledMode = nextLedMode;
        setLedMode(nextLedMode);
      }
    };

    const containerEl = scrollContainerRef.current;
    if (containerEl) {
      containerEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    // Initial mapping
    handleScroll();

    return () => {
      if (containerEl) {
        containerEl.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  return (
    <div
      ref={scrollContainerRef}
      id="animation-page-container"
      className="relative w-screen h-screen overflow-y-auto select-none font-sans"
      style={{
        backgroundColor: '#161514',
        color: '#F2EDE6',
        transition: 'background-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), color 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* 1. Background Paper Texture Overlay */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* 2. Top-Left Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none md:px-8">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-[#3a7ca5] animate-pulse" />
          <span
            className="text-xs font-bold tracking-[0.2em] font-mono text-[#B8AFA4]"
            style={{ color: 'var(--theme-subtext, #B8AFA4)' }}
          >
            ALEXA.SYSTEM.CORE
          </span>
        </div>
        <div className="flex items-center space-x-3 pointer-events-auto">
          <Link
            to="/cpuanimation"
            className="flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[var(--copper-700)] bg-[var(--void-900)] hover:bg-[var(--copper-500)]/10 hover:border-[var(--copper-500)] hover:text-[var(--copper-300)]"
          >
            <span>ANIME.JS CPU CASCADE →</span>
          </Link>
          <Link
            to="/"
            className="flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[#4a4137] bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
          >
            <span>← BACK TO CONSOLE</span>
          </Link>
        </div>
      </header>

      {/* 3. Sticky 3D WebGL Canvas Area (Left Side) */}
      <div className="fixed top-0 left-0 w-full md:w-[50%] h-screen z-10 flex items-center justify-center pointer-events-none">
        <div className="w-full h-full pointer-events-auto">
          <HeroCanvas
            expression={expression}
            bodyColor={bodyColor}
            ledColor={ledColor}
            ledMode={ledMode}
            outlineThickness={outlineThickness}
            explodedProgress={explodedProgress}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
            isSpeaking={false}
            isSinging={false}
            animValuesRef={animValuesRef}
          />
        </div>

        {/* Viewport Floating Info */}
        <div
          className="absolute bottom-6 left-6 text-[10px] font-mono pointer-events-none"
          style={{ color: 'var(--theme-subtext, #7A7168)' }}
        >
          SCROLL DOWN TO DECONSTRUCT CORE
        </div>
      </div>

      {/* 4. Scrolling content blocks (Right Side) */}
      <div className="relative ml-auto w-full md:w-[50%] z-20 flex flex-col pointer-events-none">
        
        {/* Section 1: Intro */}
        <section className="h-screen w-full flex flex-col justify-center px-6 md:px-16 border-b border-transparent">
          <div className="max-w-md">
            <span
              className="text-xs font-mono tracking-[0.2em] uppercase mb-2 block"
              style={{ color: ledColor }}
            >
              CHAPTER 01
            </span>
            <h1 className="text-4xl md:text-5xl font-display leading-none mb-6 font-bold">
              Mecha Blueprint
            </h1>
            <p
              className="text-xs md:text-sm font-mono leading-relaxed"
              style={{ color: 'var(--theme-subtext, #B8AFA4)' }}
            >
              Welcome to the digital twin blueprint engine. This model displays the structural mechanics of the Alexa device procedurally. Scroll down to trigger the split-open sequence.
            </p>
          </div>
        </section>

        {/* Section 2: Chassis Breakdown */}
        <section className="h-screen w-full flex flex-col justify-center px-6 md:px-16 border-b border-transparent">
          <div className="max-w-md">
            <span
              className="text-xs font-mono tracking-[0.2em] uppercase mb-2 block"
              style={{ color: ledColor }}
            >
              CHAPTER 02
            </span>
            <h2 className="text-3xl md:text-4xl font-display leading-none mb-6 font-bold">
              Chassis Breakdown
            </h2>
            <p
              className="text-xs md:text-sm font-mono leading-relaxed"
              style={{ color: 'var(--theme-subtext, #B8AFA4)' }}
            >
              As the chassis separates vertically, it exposes internal modules sliding on chrome shafts. Concentric logic gears and the acoustic beamforming iris separate in 3D space.
            </p>
          </div>
        </section>

        {/* Section 3: Color Transformation */}
        <section className="h-screen w-full flex flex-col justify-center px-6 md:px-16 border-b border-transparent">
          <div className="max-w-md">
            <span
              className="text-xs font-mono tracking-[0.2em] uppercase mb-2 block"
              style={{ color: ledColor }}
            >
              CHAPTER 03
            </span>
            <h2 className="text-3xl md:text-4xl font-display leading-none mb-6 font-bold">
              Material Shift
            </h2>
            <p
              className="text-xs md:text-sm font-mono leading-relaxed"
              style={{ color: 'var(--theme-subtext, #B8AFA4)' }}
            >
              The mecha casing transforms from dark grey to a premium retro white. Simultaneously, the screen displays a dizzy debug face and the head hemisphere hinges back.
            </p>
          </div>
        </section>

        {/* Section 4: CPU Core */}
        <section className="h-screen w-full flex flex-col justify-center px-6 md:px-16">
          <div className="max-w-md">
            <span
              className="text-xs font-mono tracking-[0.2em] uppercase mb-2 block"
              style={{ color: ledColor }}
            >
              CHAPTER 04
            </span>
            <h2 className="text-3xl md:text-4xl font-display leading-none mb-6 font-bold">
              Confidenz CPU
            </h2>
            <p
              className="text-xs md:text-sm font-mono leading-relaxed"
              style={{ color: 'var(--theme-subtext, #B8AFA4)' }}
            >
              The core localized coprocessor node pops out of the motherboard housing. A cyan holographic sensor sweeps above the processor, reading state inputs in real-time.
            </p>
          </div>
        </section>

      </div>
    </div>
  );
}

export default AnimationPage;
