import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CuteAlexaCanvas } from './CuteAlexaCanvas';

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

export function CuteAlexaPage() {
  const [expression, setExpression] = useState<ExpressionType>('resting');
  const [bodyColor, setBodyColor] = useState<string>('#2e323b');
  const [ledColor, setLedColor] = useState<string>('#00f3ff');
  const [ledMode, setLedMode] = useState<LedModeType>('pulse');
  const [outlineThickness, setOutlineThickness] = useState<number>(1.3);
  const [explodedProgress, setExplodedProgress] = useState<number>(0.0);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isSinging, setIsSinging] = useState<boolean>(false);

  // Auto-explode animation state
  const [isExploding, setIsExploding] = useState(false);

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
          return Math.min(1.0, prev + 0.05);
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
        return Math.max(0.0, prev - 0.05);
      });
    };
    requestAnimationFrame(animate);
  };

  // Find names for current colors
  const activeBodyColorName = BODY_COLORS.find((c) => c.value === bodyColor)?.name || 'Custom';
  const activeLedColorName = LED_COLORS.find((c) => c.value === ledColor)?.name || 'Custom';

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-[#161514] select-none text-[#F2EDE6] font-sans">
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
          <span className="text-xs font-bold tracking-[0.2em] font-mono text-[#B8AFA4]">
            ALEXA.CARTOON
          </span>
        </div>
        <Link
          to="/"
          className="pointer-events-auto flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-[#4a4137] bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
        >
          <span>← BACK TO DASHBOARD</span>
        </Link>
      </header>

      {/* 3. 3D WebGL Canvas Area */}
      <div className="relative w-full md:w-[60%] h-[50vh] md:h-full flex items-center justify-center z-10">
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
          <CuteAlexaCanvas
            expression={expression}
            bodyColor={bodyColor}
            ledColor={ledColor}
            ledMode={ledMode}
            outlineThickness={outlineThickness}
            explodedProgress={explodedProgress}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
            isSpeaking={isSpeaking}
            isSinging={isSinging}
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
          style={{ opacity: explodedProgress > 0 ? 0 : 1 }}
        >
          <div className="text-[9px] font-mono text-[#7A7168] uppercase tracking-wider mb-0.5">CURRENT MOOD</div>
          <div className="text-sm font-semibold tracking-wider font-mono text-[#e9b44c]">
            {expression.toUpperCase()} {EXPRESSIONS.find(e => e.type === expression)?.face}
          </div>
        </div>
      </div>

      {/* 4. Controls Sidebar (Glassmorphic scrollable panel) */}
      <div className="w-full md:w-[40%] h-[50vh] md:h-full z-20 flex flex-col border-t md:border-t-0 md:border-l border-[#2E2822] bg-[#121110]/95 backdrop-blur-xl">
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
                <span>{Math.round(explodedProgress * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodedProgress}
                onChange={(e) => {
                  setIsExploding(false);
                  setExplodedProgress(parseFloat(e.target.value));
                }}
                className="w-full h-1 bg-[#2E2822] rounded-lg appearance-none cursor-pointer"
              />

              {/* Quick Trigger Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsExploding(true)}
                  className={`flex-1 py-2 text-xs font-mono border rounded uppercase transition-colors ${
                    explodedProgress >= 0.95
                      ? 'border-[#7A7168] text-[#7A7168] cursor-not-allowed'
                      : 'border-[#3a7ca5]/50 bg-[#3a7ca5]/10 hover:bg-[#3a7ca5]/20 hover:border-[#3a7ca5] text-[#F2EDE6]'
                  }`}
                  disabled={explodedProgress >= 0.95}
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
          Ghibli & Doraemon Movie Aesthetic Redesign Project • 2026
        </div>
      </div>
    </div>
  );
}
export default CuteAlexaPage;
