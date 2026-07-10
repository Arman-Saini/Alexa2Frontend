import { Suspense, useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrthographicCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { animate, stagger } from 'animejs';
import { ArchitectureStack } from './ArchitectureStack';

export function CpuAnimationPage() {
  const [ledColor, setLedColor] = useState<string>('#00f3ff');
  const [scrollProgress, setScrollProgress] = useState<number>(0.20);

  // Animation play states
  const [isPlaying, setIsPlaying] = useState(false);
  const [playDirection, setPlayDirection] = useState<'forward' | 'backward'>('forward');

  // Smooth scroll play/pause controller effect
  useEffect(() => {
    if (!isPlaying) return;
    let animFrameId: number;
    const startTime = performance.now();
    const startProgress = scrollProgress;
    const targetProgress = playDirection === 'forward' ? 1.0 : 0.0;
    const duration = 2800; // 2.8 seconds duration

    const animateScroll = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      
      // Easing curve (InOutQuad)
      const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const nextProgress = startProgress + (targetProgress - startProgress) * easedT;

      if (scrollContainerRef.current) {
        const el = scrollContainerRef.current;
        el.scrollTop = nextProgress * (el.scrollHeight - el.clientHeight);
      }
      setScrollProgress(nextProgress);

      if (t < 1) {
        animFrameId = requestAnimationFrame(animateScroll);
      } else {
        setIsPlaying(false);
        setPlayDirection(playDirection === 'forward' ? 'backward' : 'forward');
      }
    };

    animFrameId = requestAnimationFrame(animateScroll);
    return () => cancelAnimationFrame(animFrameId);
  }, [isPlaying, playDirection]);
  
  // HUD state telemetry values
  const [camPos, setCamPos] = useState({ x: 0, y: 0.2, z: 8 });
  const [zoom, setZoom] = useState(90);
  const [activeLayer, setActiveLayer] = useState<number>(-1);

  // References for HTML elements to animate via anime.js
  const hudContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Telemetry updates based on scroll progress
  useEffect(() => {
    // Math logic matching ArchitectureStack phases to display exact stats in UI
    const s = scrollProgress;
    let cx = 0, cy = 0.2, cz = 8;
    let zVal = 90;
    let activeIdx = -1;

    if (s < 0.20) {
      cx = 0; cy = 0.2; cz = 8;
      zVal = 90;
      activeIdx = s < 0.10 ? 0 : 1;
    } else if (s < 0.40) {
      const t = (s - 0.20) / 0.20;
      const angle = t * (Math.PI / 2);
      cx = 8 * Math.sin(angle);
      cy = 0.2 + t * 0.3;
      cz = 8 * Math.cos(angle);
      zVal = 100;
      activeIdx = s < 0.30 ? 1 : 2;
    } else if (s < 0.50) {
      const t = (s - 0.40) / 0.10;
      cx = 8 - t * 8;
      cy = 0.5 + t * 29.5;
      cz = 8 - t * 8;
      zVal = 100 - t * 58;
      activeIdx = s < 0.45 ? 2 : 3;
    } else if (s < 0.80) {
      cx = 0; cy = 30; cz = 0.001;
      zVal = 42;
      if (s < 0.60) activeIdx = 3;
      else if (s < 0.70) activeIdx = 4;
      else activeIdx = 5;
    } else {
      const camT = Math.min(1, (s - 0.80) / 0.05);
      cx = camT * 4.5;
      cy = 30 - camT * 25.0;
      cz = camT * 6.0;
      zVal = 42 + camT * 33;
      activeIdx = s < 0.84 ? 1 : (s < 0.88 ? 2 : (s < 0.92 ? 3 : (s < 0.96 ? 4 : 5)));
    }

    setCamPos({ x: parseFloat(cx.toFixed(2)), y: parseFloat(cy.toFixed(2)), z: parseFloat(cz.toFixed(2)) });
    setZoom(Math.round(zVal));
    setActiveLayer(activeIdx);
  }, [scrollProgress]);

  // Dynamically computed colors for dark-to-light theme inversion
  const dynamicTheme = useMemo(() => {
    // Transition starts at scroll 0.60, peaks at 0.65, stays at 1.0 (light theme) until 0.75, then returns to 0 (dark theme) at 0.80
    let t = 0;
    if (scrollProgress >= 0.60) {
      if (scrollProgress < 0.65) {
        t = (scrollProgress - 0.60) / 0.05;
      } else if (scrollProgress < 0.75) {
        t = 1.0;
      } else if (scrollProgress < 0.80) {
        t = 1.0 - (scrollProgress - 0.75) / 0.05;
      }
    }
    
    // Invert background from solid black (#0a0a0c) to pure white (#ffffff)
    const bgCol = new THREE.Color('#0a0a0c').lerp(new THREE.Color('#ffffff'), t);
    
    // Invert text from light sand-grey (#e0dbd5) to warm dark charcoal (#1a1816)
    const textCol = new THREE.Color('#e0dbd5').lerp(new THREE.Color('#1a1816'), t);
    
    // Sub-label/secondary text color: light-charcoal (#8e867b) to warm-grey (#7a7168)
    const subTextCol = new THREE.Color('#8e867b').lerp(new THREE.Color('#7a7168'), t);
    
    // Border color: thin white/dark borders
    const borderCol = new THREE.Color('rgba(255, 255, 255, 0.12)').lerp(new THREE.Color('rgba(74, 65, 55, 0.15)'), t);
    
    // Glass panel backing: dark glass-black to clean frosted white
    const panelBg = t < 0.1 
      ? 'rgba(15, 15, 17, 0.65)' 
      : `rgba(${Math.round(15 + (255 - 15) * t)}, ${Math.round(15 + (255 - 15) * t)}, ${Math.round(17 + (255 - 17) * t)}, ${0.65 - 0.2 * t})`;

    // Grid dots color
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
  }, [scrollProgress]);

  const pipelineSteps = useMemo(() => [
    {
      label: "L1: PERCEPTION",
      title: "T1 Acoustic Embeddings",
      desc: "Zero-shot sound discovery detects signature acoustic events (purifiers, inverter sags) and triggers BLE/Voice identity mapping."
    },
    {
      label: "L2: MCP DEVICE INTERPOSER",
      title: "Interposer Telemetry",
      desc: "Aggregates long-tail appliances (Kirloskar pumps, geysers) into unified, type-safe MCP capability interfaces."
    },
    {
      label: "L3: EDGE SLM & CACHE",
      title: "Local Recall & T2 Cache",
      desc: "Checks local cache. If query hits a compiled rule, runs locally at <120ms without consuming cloud tokens."
    },
    {
      label: "L4: ONTOLOGY SHIELD",
      title: "Deterministic Safety Gate",
      desc: "Policy authorization gate filters LLM action plans, checks principal access, and blocks unsafe actuation at the plug."
    },
    {
      label: "L5: BEDROCK MULTI-AGENT",
      title: "T3 Reasoning & Compiler",
      desc: "Stateless Bedrock agents plan novel steps and compile new T0 rules to push down to the Layer 3 cache."
    }
  ], []);

  const currentStepIdx = useMemo(() => {
    if (scrollProgress < 0.84) return 0;
    if (scrollProgress < 0.88) return 1;
    if (scrollProgress < 0.92) return 2;
    if (scrollProgress < 0.96) return 3;
    return 4;
  }, [scrollProgress]);

  const pipelineStep = pipelineSteps[currentStepIdx];

  // Entrance animations using Anime.js
  useEffect(() => {
    if (hudContainerRef.current) {
      animate(hudContainerRef.current.querySelectorAll('.hud-element'), {
        opacity: [0, 1],
        translateX: [-20, 0],
        delay: stagger(100),
        duration: 800,
        ease: 'outExpo',
      });
    }
    // Set initial scroll container scroll position to match 0.20 progress
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = 0.20 * (el.scrollHeight - el.clientHeight);
    }
  }, []);

  // Handle manual scrubbing of the native scroll container
  const handleScrub = (progress: number) => {
    if (scrollContainerRef.current) {
      const el = scrollContainerRef.current;
      el.scrollTop = progress * (el.scrollHeight - el.clientHeight);
    }
    setScrollProgress(progress);
  };

  return (
    <div
      className="relative w-screen h-screen overflow-hidden font-sans select-none transition-colors duration-150"
      style={{
        backgroundColor: dynamicTheme.bg,
        color: dynamicTheme.text,
      }}
    >
      {/* 1. Futuristic Grid Overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `radial-gradient(${dynamicTheme.gridDot} 1.2px, transparent 1.2px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* 2. Top Navigation Bar */}
      <header 
        className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 border-b backdrop-blur-md transition-colors duration-150"
        style={{
          backgroundColor: dynamicTheme.panelBg,
          borderBottomColor: dynamicTheme.border,
        }}
      >
        <div className="flex items-center space-x-3">
          <span 
            className="telemetry-dot w-2 h-2 rounded-full" 
            style={{ backgroundColor: ledColor }}
          />
          <span className="text-xs font-mono font-bold tracking-[0.25em]" style={{ color: dynamicTheme.text }}>
            ANIME.V4 // ARCHITECTURE
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {/* LED Color Picker */}
          <div 
            className="flex items-center space-x-2 border px-3 py-1 rounded-[var(--r-sm)] transition-colors duration-150"
            style={{
              borderColor: dynamicTheme.border,
              backgroundColor: dynamicTheme.bg,
            }}
          >
            <span className="text-[10px] font-mono" style={{ color: dynamicTheme.subText }}>SYS_GLOW:</span>
            {['#00f3ff', '#ff4b82', '#3bf574', '#e9b44c'].map((color) => (
              <button
                key={color}
                className="w-3.5 h-3.5 rounded-full border transition-transform hover:scale-125 focus:outline-none"
                style={{
                  backgroundColor: color,
                  borderColor: dynamicTheme.border,
                  transform: ledColor === color ? 'scale(1.2)' : 'none',
                  boxShadow: ledColor === color ? `0 0 8px ${color}` : 'none',
                }}
                onClick={() => setLedColor(color)}
              />
            ))}
          </div>
          <Link
            to="/animation"
            className="flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border"
            style={{
              borderColor: dynamicTheme.border,
              color: dynamicTheme.text,
            }}
          >
            <span>← COMPANION STACK</span>
          </Link>
        </div>
      </header>

      {/* 3. Left Side: Real-time Telemetry Dashboard (Fixed HUD) */}
      <div
        ref={hudContainerRef}
        className="fixed top-20 left-6 w-[280px] bottom-6 z-20 hidden lg:flex flex-col justify-between pointer-events-none transition-all duration-300"
        style={{
          opacity: 1 - dynamicTheme.t,
          visibility: dynamicTheme.t > 0.9 ? 'hidden' : 'visible'
        }}
      >
        {/* Upper Telemetry Block */}
        <div className="flex flex-col space-y-4">
          <div 
            className="hud-element p-4 border backdrop-blur-md rounded-[var(--r-md)] transition-colors duration-150"
            style={{
              borderColor: dynamicTheme.border,
              backgroundColor: dynamicTheme.panelBg,
            }}
          >
            <div className="text-[10px] font-mono mb-1" style={{ color: dynamicTheme.subText }}>SYSTEM INSTANCE</div>
            <div className="text-sm font-bold tracking-wider font-mono" style={{ color: dynamicTheme.text }}>CORE_STACK_V4</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div>
                <span style={{ color: dynamicTheme.subText }}>SCROLL: </span>
                <span className="font-bold" style={{ color: ledColor }}>{(scrollProgress * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span style={{ color: dynamicTheme.subText }}>FPS: </span>
                <span className="text-green-600 font-bold">60.00</span>
              </div>
              <div className="col-span-2">
                <span style={{ color: dynamicTheme.subText }}>CAM_POS: </span>
                <span style={{ color: dynamicTheme.text }}>[{camPos.x}, {camPos.y}, {camPos.z}]</span>
              </div>
              <div>
                <span style={{ color: dynamicTheme.subText }}>ZOOM: </span>
                <span style={{ color: dynamicTheme.text }}>{zoom}</span>
              </div>
              <div>
                <span style={{ color: dynamicTheme.subText }}>LIGHTS: </span>
                <span className="text-green-600">NOMINAL</span>
              </div>
            </div>
          </div>

          {/* Interactive Stack Visualizer */}
          <div 
            className="hud-element p-4 border backdrop-blur-md rounded-[var(--r-md)] transition-colors duration-150"
            style={{
              borderColor: dynamicTheme.border,
              backgroundColor: dynamicTheme.panelBg,
            }}
          >
            <div className="text-[10px] font-mono mb-3" style={{ color: dynamicTheme.subText }}>LAYERS DECONSTRUCTION</div>
            <div className="flex flex-col space-y-2">
              {[
                { name: 'Layer 5: Cloud Reasoning', desc: 'Bedrock Multi-Agent' },
                { name: 'Layer 4: Metal Gateway', desc: 'Ontology Adapter Shield' },
                { name: 'Layer 3: Local Brain', desc: 'Edge SLM & Rule Engine' },
                { name: 'Layer 2: Capability Plane', desc: 'MCP Service Interposer' },
                { name: 'Layer 1: Perception Plane', desc: 'Acoustic Embeddings' },
                { name: 'Layer 0: Socket Base', desc: 'Always-On Substrate' },
              ].map((layer, idx) => {
                const isSelected = activeLayer === (5 - idx);
                return (
                  <div
                    key={idx}
                    className="flex items-center space-x-3 p-2 rounded-[var(--r-sm)] border transition-all duration-200"
                    style={{
                      borderColor: isSelected ? ledColor : dynamicTheme.border,
                      backgroundColor: isSelected ? (scrollProgress < 0.6 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(74, 65, 55, 0.08)') : 'transparent',
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: isSelected ? ledColor : (scrollProgress < 0.6 ? '#55555c' : '#cbd5e1'),
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div 
                        className="text-[11px] font-mono font-bold truncate"
                        style={{ color: isSelected ? dynamicTheme.text : dynamicTheme.subText }}
                      >
                        {layer.name}
                      </div>
                      <div className="text-[9px] font-mono truncate" style={{ color: dynamicTheme.subText }}>{layer.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Lower System Logs */}
        <div 
          className="hud-element p-4 border backdrop-blur-md rounded-[var(--r-md)] font-mono text-[9px] flex flex-col space-y-1 transition-colors duration-150"
          style={{
            borderColor: dynamicTheme.border,
            backgroundColor: dynamicTheme.panelBg,
            color: dynamicTheme.subText,
          }}
        >
          <div>&gt; INITIALIZING PROCEDURAL ENGINE...</div>
          <div>&gt; DETECTING ORTHOGRAPHIC MATRIX...</div>
          <div>&gt; CAMERA VECTOR SYNCED</div>
          <div>&gt; LIQUID GLASS EMISSION MAP LOADED</div>
          <div style={{ color: dynamicTheme.text }}>&gt; SHADERS COMPILED SUCCESSFULLY</div>
        </div>
      </div>

      {/* 4. Canvas Section */}
      <div id="canvas-container" className="absolute inset-0 z-10 pointer-events-none">
        <Canvas
          shadows
          gl={{ powerPreference: 'high-performance', antialias: true }}
          style={{ background: 'transparent' }}
        >
          {/* Ambient light for subtle shadow fills */}
          <ambientLight intensity={0.4} color="#f0f4f8" />
          
          {/* Main directional light casting sharp shadows */}
          <directionalLight
            position={[5, 10, -5]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
            shadow-bias={-0.0002}
            color="#fffdfa"
          />

          {/* Soft fill bounce light */}
          <directionalLight position={[-6, -4, 4]} intensity={0.5} color="#cbdff0" />

          {/* Studio HDRI Environment Reflection Map */}
          <Suspense fallback={null}>
            <Environment preset="city" />
            <OrthographicCamera makeDefault position={[0, 0.2, 8]} zoom={90} />
            <ArchitectureStack ledColor={ledColor} scrollProgress={scrollProgress} />
          </Suspense>
        </Canvas>
      </div>

      {/* 6. Native Scroll Container Overlay (Scroll captures fall through to Canvas) */}
      <div
        ref={scrollContainerRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const progress = el.scrollTop / (el.scrollHeight - el.clientHeight);
          setScrollProgress(progress);
        }}
        className="absolute inset-0 overflow-y-auto pointer-events-auto scrollbar-none"
        style={{ zIndex: 25, scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="w-full flex flex-col" style={{ height: '450vh' }}>
          <div className="ml-auto w-full md:w-[50%] flex flex-col pointer-events-none">
            
            {/* Phase 1 Overlay */}
            <section className="h-screen w-full flex flex-col justify-center px-8 md:px-16 font-sans">
              <div 
                className="max-w-md p-6 backdrop-blur-md border rounded-[var(--r-lg)] transition-colors duration-150"
                style={{
                  borderColor: dynamicTheme.border,
                  backgroundColor: dynamicTheme.panelBg,
                  color: dynamicTheme.text,
                }}
              >
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: ledColor }}>
                  PHASE 01 // LOAD SYSTEM
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold leading-none mb-4">
                  Flat Architecture
                </h2>
                <p className="text-xs md:text-sm font-mono leading-relaxed" style={{ color: dynamicTheme.subText }}>
                  Initially loaded flat on the horizontal XZ plane with the camera perfectly leveled. Scroll down to trigger the elevation sequence.
                </p>
              </div>
            </section>

            {/* Phase 2 Overlay */}
            <section className="h-screen w-full flex flex-col justify-center px-8 md:px-16 font-sans">
              <div 
                className="max-w-md p-6 backdrop-blur-md border rounded-[var(--r-lg)] transition-colors duration-150"
                style={{
                  borderColor: dynamicTheme.border,
                  backgroundColor: dynamicTheme.panelBg,
                  color: dynamicTheme.text,
                }}
              >
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: ledColor }}>
                  PHASE 02 // CAMERA SWEEP
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold leading-none mb-4">
                  Profile Sweep
                </h2>
                <p className="text-xs md:text-sm font-mono leading-relaxed" style={{ color: dynamicTheme.subText }}>
                  The camera orbits around the Y-axis by 90 degrees to showcase the structural height of the CPU while it begins to separate.
                </p>
              </div>
            </section>

            {/* Phase 3 Overlay (exploded splay spacer) */}
            <section className="h-screen w-full" />

            {/* Phase 4-6 Overlay (plateaus spacer) */}
            <section className="h-screen w-full" />

            {/* Phase 7 Overlay (joining pipeline text card / spacer) */}
            <section className="h-screen w-full flex flex-col justify-center px-8 md:px-16 font-sans">
              <div 
                className="max-w-md p-6 backdrop-blur-md border rounded-[var(--r-lg)] transition-colors duration-150"
                style={{
                  borderColor: dynamicTheme.border,
                  backgroundColor: dynamicTheme.panelBg,
                  color: dynamicTheme.text,
                }}
              >
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase mb-2 block font-bold" style={{ color: ledColor }}>
                  PHASE 07 // PIPELINE JOINING
                </span>
                <h2 className="text-3xl md:text-4xl font-display font-bold leading-none mb-4">
                  Full Stack Assembly
                </h2>
                <p className="text-xs md:text-sm font-mono leading-relaxed" style={{ color: dynamicTheme.subText }}>
                  The CPU joins back together layer-by-layer. Watch the left panel to trace how queries traverse the completed smart home runtime.
                </p>
              </div>
            </section>

          </div>
        </div>
      </div>

      {/* Left-hand Pipeline Sidebar Box */}
      {scrollProgress >= 0.80 && (
        <div 
          className="fixed left-6 md:left-12 top-[20%] w-[90%] max-w-[340px] p-5 md:p-6 rounded-[var(--r-lg)] border backdrop-blur-md transition-all duration-300 shadow-xl"
          style={{
            zIndex: 30,
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
            {pipelineStep.title}
          </h3>
          <p className="text-xs font-mono leading-relaxed mb-4 text-[#a8a198]">
            {pipelineStep.desc}
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

      {/* 5. Floating Anime.js Style Timeline Scrubber (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-30 flex items-center space-x-4 pointer-events-auto bg-black/40 backdrop-blur-md border px-4 py-2 rounded-full shadow-lg" style={{ borderColor: dynamicTheme.border }}>
        <button
          onClick={() => {
            if (!isPlaying) {
              setPlayDirection(scrollProgress > 0.5 ? 'backward' : 'forward');
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }}
          className="flex items-center space-x-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider rounded-full border transition-all duration-200"
          style={{
            borderColor: ledColor,
            backgroundColor: isPlaying ? ledColor : 'transparent',
            color: isPlaying ? '#0f0f11' : ledColor,
            boxShadow: isPlaying ? `0 0 10px ${ledColor}` : 'none'
          }}
        >
          {isPlaying ? (
            <>
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <rect x="4" y="4" width="6" height="16" />
                <rect x="14" y="4" width="6" height="16" />
              </svg>
              <span>PAUSE</span>
            </>
          ) : (
            <>
              <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <span>{scrollProgress > 0.5 ? 'COLLAPSE' : 'DECONSTRUCT'}</span>
            </>
          )}
        </button>
        <div className="h-4 w-[1px] bg-white/20" />
        <span className="text-[10px] font-mono tracking-widest hidden sm:inline" style={{ color: dynamicTheme.subText }}>SCRUB:</span>
        <AnimeTimelineScrubber progress={scrollProgress} onScrub={handleScrub} />
      </div>
    </div>
  );
}

// 6. Pill-shaped custom timeline scrubber inspired by animejs.com V4
function AnimeTimelineScrubber({ progress, onScrub }: { progress: number; onScrub: (progress: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const [localProgress, setLocalProgress] = useState(progress);

  // Sync local progress with scroll state only when not actively dragging
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
      className="pointer-events-auto flex items-center justify-between px-4 h-8 bg-[#141312] border border-[#4a4137]/35 rounded-full cursor-ew-resize select-none relative shadow-[var(--shadow-copper-md)]"
      style={{ width: '220px' }}
    >
      {/* Ticks grid pattern (30 marks) matching the blueprint timeline style */}
      <div className="absolute inset-x-4 inset-y-0 flex items-center justify-between pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          return (
            <div
              key={i}
              className="w-[1.2px] transition-colors duration-150"
              style={{
                height: isMajor ? '10px' : '5px',
                backgroundColor: isMajor ? '#ECE6DF' : 'rgba(74, 65, 55, 0.4)',
              }}
            />
          );
        })}
      </div>

      {/* Red scrub needle with glow */}
      <div
        className="absolute w-[2px] h-[16px] bg-[#ff3333] pointer-events-none transition-all duration-75"
        style={{
          left: `calc(16px + ${localProgress * (220 - 32 - 2)}px)`,
          boxShadow: '0 0 6px rgba(255, 51, 51, 0.75)',
        }}
      />
    </div>
  );
}

export default CpuAnimationPage;
