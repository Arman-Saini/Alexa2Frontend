// frontend/src/components/animation/AnimationPage.tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroCanvas } from './HeroCanvas';

const TOP_RIGHT_LABELS = [
  { id: 'head', text: 'TOP DOME' },
  { id: 'lens', text: 'ACOUSTIC LENS' },
  { id: 'gearLarge', text: 'NLP PROCESSING MATRIX' },
  { id: 'gearSmall', text: 'WAKE-WORD ENGINE' },
  { id: 'base', text: 'BASE CONSOLE' },
];

const BOTTOM_LEFT_LABELS = ['LATENCY', 'INTENT', 'ENTITY', 'RESPONSE', 'PIPELINE'];

export function AnimationPage() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const isWhiteTheme = scrollProgress > 0.25;
  const labelsVisible = scrollProgress > 0.15;

  return (
    <div
      className="relative w-screen h-screen overflow-hidden transition-colors duration-700 select-none font-sans"
      style={{ backgroundColor: isWhiteTheme ? '#ECE6DF' : '#0B0B0C' }}
    >
      {/* Technical grid backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-700 pointer-events-none z-0"
        style={{
          opacity: isWhiteTheme ? 0.08 : 0.04,
          backgroundImage: `
            linear-gradient(to right, ${isWhiteTheme ? '#000000' : '#ffffff'} 1px, transparent 1px),
            linear-gradient(to bottom, ${isWhiteTheme ? '#000000' : '#ffffff'} 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Headline, top-left */}
      <header className="absolute top-8 left-8 z-30 max-w-sm">
        <Link
          to="/"
          className="text-[9px] font-mono tracking-[0.2em] uppercase mb-4 inline-block hover:opacity-70 transition-opacity"
          style={{ color: isWhiteTheme ? '#5E5A54' : '#a1a1aa' }}
        >
          ← Console
        </Link>
        <h1
          className="font-display text-2xl md:text-3xl font-bold leading-tight transition-colors duration-700"
          style={{ color: isWhiteTheme ? '#2E2B28' : '#F2EDE6' }}
        >
          The Alexa Request Engine
        </h1>
        <p
          className="font-sans text-sm mt-2 leading-relaxed transition-colors duration-700"
          style={{ color: isWhiteTheme ? '#5E5A54' : '#B8AFA4' }}
        >
          From spoken word to answered command, staged apart to show the machine underneath.
        </p>
      </header>

      {/* Top-right label stack, linked to layers via leader lines */}
      <nav className="absolute top-8 right-8 z-30 flex flex-col items-end gap-2 font-mono text-[10px] tracking-[0.2em] uppercase">
        {TOP_RIGHT_LABELS.map((item, i) => (
          <span
            key={item.id}
            id={`leader-anchor-${item.id}`}
            className="transition-all duration-500"
            style={{
              color:
                hoveredLayerId === item.id
                  ? '#D99A44'
                  : isWhiteTheme
                    ? '#5E5A54'
                    : '#a1a1aa',
              opacity: labelsVisible ? 1 : 0,
              transform: labelsVisible ? 'translateX(0)' : 'translateX(8px)',
              transitionDelay: `${i * 60}ms`,
            }}
          >
            {item.text}
          </span>
        ))}
      </nav>

      {/* Bottom-left decorative label stack (no leader lines) */}
      <div className="absolute bottom-8 left-8 z-30 flex flex-col gap-1.5 font-mono text-[10px] tracking-[0.2em] uppercase">
        {BOTTOM_LEFT_LABELS.map((text, i) => (
          <span
            key={text}
            className="transition-all duration-500"
            style={{
              color: isWhiteTheme ? '#8E857B' : '#71717a',
              opacity: labelsVisible ? 1 : 0,
              transform: labelsVisible ? 'translateX(0)' : 'translateX(-8px)',
              transitionDelay: `${i * 60}ms`,
            }}
          >
            {text}
          </span>
        ))}
      </div>

      {/* Bottom-right tick scrubber */}
      <div className="absolute bottom-8 right-8 z-30">
        <div
          className="flex items-center gap-[2px] px-4 py-3 rounded-full"
          style={{ backgroundColor: isWhiteTheme ? 'rgba(46,43,40,0.9)' : 'rgba(16,16,18,0.9)' }}
        >
          {Array.from({ length: 60 }).map((_, i) => {
            const tickProgress = i / 59;
            const isActive = Math.abs(tickProgress - scrollProgress) < 1 / 59;
            return (
              <div
                key={i}
                className="w-[1.5px] rounded-full transition-all"
                style={{
                  height: isActive ? '14px' : '8px',
                  backgroundColor: isActive ? '#D99A44' : 'rgba(255,255,255,0.25)',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Diagonal leader lines from object to top-right labels */}
      <svg className="absolute inset-0 z-20 pointer-events-none w-full h-full">
        {TOP_RIGHT_LABELS.map((item) => (
          <line
            key={item.id}
            id={`leader-line-${item.id}`}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke={isWhiteTheme ? '#2E2B28' : '#D99A44'}
            strokeWidth="1"
            opacity="0"
          />
        ))}
      </svg>

      {/* 3D engine */}
      <div className="absolute inset-0 z-10">
        <HeroCanvas
          onScrollChange={setScrollProgress}
          onHoverChange={setHoveredLayerId}
          isWhiteTheme={isWhiteTheme}
        />
      </div>
    </div>
  );
}

export default AnimationPage;
