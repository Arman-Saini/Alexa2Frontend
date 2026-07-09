import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SmartphoneWidget, DEFAULT_SUMMARIES, type ChatSummary } from './SmartphoneWidget';

const WALLPAPERS = [
  { id: 'void', name: 'Void Deep', gradient: 'from-[#050505] to-[#121110]' },
  { id: 'neon', name: 'Aurora Neon', gradient: 'from-[#0c0e17] via-[#091a29] to-[#040608]' },
  { id: 'copper', name: 'Warm Copper', gradient: 'from-[#120d0a] via-[#1f1611] to-[#0c0a09]' },
  { id: 'emerald', name: 'Cyber Mint', gradient: 'from-[#060e0d] via-[#0c1c18] to-[#040606]' },
];

export function CompanionPage() {
  const [summaries, setSummaries] = useState<ChatSummary[]>(DEFAULT_SUMMARIES);
  const [wallpaper, setWallpaper] = useState(WALLPAPERS[0]);
  const [externalCommand, setExternalCommand] = useState<string>('');

  const clearHistory = () => {
    setSummaries([]);
  };

  const handleQuickCommand = (cmd: string) => {
    setExternalCommand(cmd);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col md:flex-row bg-[#0c0b0a] text-text-primary select-none font-sans">
      {/* Background Graphic Effects */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full bg-copper-500/10 blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-30%] right-[-10%] w-[70%] h-[70%] rounded-full bg-ember-500/5 blur-[120px] pointer-events-none z-0" />

      {/* 1. Header Navigation */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 pointer-events-none md:px-8">
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-copper-500 animate-pulse" />
          <span className="text-xs font-bold tracking-[0.2em] font-mono text-text-secondary">
            ALEXA.COMPANION
          </span>
        </div>
        <Link
          to="/"
          className="pointer-events-auto flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border border-void-border bg-black/40 hover:bg-copper-500/10 hover:border-copper-500 hover:text-copper-500 rounded"
        >
          <span>← BACK TO DASHBOARD</span>
        </Link>
      </header>

      {/* 2. Left Side: Presentation and Showcase controls */}
      <div className="w-full md:w-[48%] lg:w-[45%] h-[45vh] md:h-full z-20 flex flex-col justify-center px-8 md:px-12 lg:px-16 pt-20 pb-8 md:py-16 overflow-y-auto border-b md:border-b-0 md:border-r border-void-border/40">
        <div className="space-y-6 max-w-[500px]">
          <div>
            <span className="text-xs font-bold font-mono tracking-[0.25em] text-copper-500 uppercase">
              Interactive Component Showcase
            </span>
            <h1 id="showcase-title" className="text-3xl lg:text-4xl font-display text-text-primary mt-2 mb-3 tracking-wide">
              Voice Interface Companion
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              A high-fidelity, 2D mobile view component showcasing local/cloud speech commands, live speech synthesis indicators, and real-time execution telemetry.
            </p>
          </div>

          {/* Quick Sandbox Controls */}
          <div className="p-5 border border-void-border/50 bg-void-800/40 rounded-xl space-y-4">
            <h3 className="text-xs font-mono text-copper-500 font-bold uppercase tracking-wider">
              Component Controls
            </h3>
            
            {/* Wallpaper selector */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-text-secondary">SMARTPHONE WALLPAPER:</span>
              <div className="flex gap-2">
                {WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    onClick={() => setWallpaper(wp)}
                    className={`flex-1 py-1.5 text-[10px] font-mono border rounded uppercase transition-all duration-150 ${
                      wallpaper.id === wp.id
                        ? 'border-copper-500 bg-copper-500/10 text-text-primary'
                        : 'border-void-border bg-void-950/40 text-text-tertiary hover:border-void-600 hover:text-text-secondary'
                    }`}
                  >
                    {wp.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Prompts Seeding */}
            <div className="space-y-2">
              <span className="text-[11px] font-mono text-text-secondary">SIMULATION SCENARIOS:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuickCommand('Turn on Movie Night')}
                  className="py-1.5 px-3 text-left text-[11px] font-mono border border-void-border/50 bg-void-950/30 hover:bg-copper-500/5 hover:border-copper-500/50 text-text-secondary hover:text-text-primary rounded transition-all truncate"
                >
                  🎬 Movie Night
                </button>
                <button
                  onClick={() => handleQuickCommand('Is the front door locked?')}
                  className="py-1.5 px-3 text-left text-[11px] font-mono border border-void-border/50 bg-void-950/30 hover:bg-copper-500/5 hover:border-copper-500/50 text-text-secondary hover:text-text-primary rounded transition-all truncate"
                >
                  🔒 Lock Status
                </button>
                <button
                  onClick={() => handleQuickCommand('Deploy robot vacuum cleaner')}
                  className="py-1.5 px-3 text-left text-[11px] font-mono border border-void-border/50 bg-void-950/30 hover:bg-copper-500/5 hover:border-copper-500/50 text-text-secondary hover:text-text-primary rounded transition-all truncate"
                >
                  🤖 Deploy Vacuum
                </button>
                <button
                  onClick={() => handleQuickCommand('Turn off kitchen lights')}
                  className="py-1.5 px-3 text-left text-[11px] font-mono border border-void-border/50 bg-void-950/30 hover:bg-copper-500/5 hover:border-copper-500/50 text-text-secondary hover:text-text-primary rounded transition-all truncate"
                >
                  💡 Kitchen Off
                </button>
              </div>
            </div>

            {/* Clear history */}
            <button
              onClick={clearHistory}
              disabled={summaries.length === 0}
              className={`w-full py-2 text-xs font-mono border rounded uppercase transition-colors ${
                summaries.length === 0
                  ? 'border-void-border text-text-tertiary cursor-not-allowed opacity-50'
                  : 'border-amber-600/30 bg-amber-600/5 text-amber-500 hover:bg-amber-600/10 hover:border-amber-500'
              }`}
            >
              Clear Interaction History
            </button>
          </div>

          {/* Technical Specs Callout */}
          <div className="flex gap-4 p-4 border border-[#c08662]/10 bg-[#c08662]/5 rounded-xl text-xs text-text-secondary leading-relaxed">
            <div className="mt-0.5">💡</div>
            <div>
              <strong className="text-text-primary font-medium block mb-0.5">Dynamic Web Speech API</strong>
              Supports hands-free testing. Tap the premium microphone to dictate home commands. Or, type commands in the text box below. Check command steps in the history logs.
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Side: The Smartphone Component Workspace */}
      <div className="flex-1 h-[55vh] md:h-full flex items-center justify-center p-4 bg-[#0a0a0a] z-10">
        <div className="relative scale-[0.95] sm:scale-100 transition-all duration-300">
          <SmartphoneWidget 
            wallpaperGradient={wallpaper.gradient}
            customSummaries={summaries}
            onSummariesChange={setSummaries}
            externalCommand={externalCommand}
            onClearExternalCommand={() => setExternalCommand('')}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanionPage;
