import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { useStoryStore } from '../../store/storyStore';
import { SidePanel } from './SidePanel';
import { GlassCard } from '../shared/GlassCard';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

export function StoryScroll() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const storyProgress = useStoryStore((s) => s.storyProgress);
  const setStoryProgress = useStoryStore((s) => s.setStoryProgress);
  const enterInteractive = useStoryStore((s) => s.enterInteractive);

  useEffect(() => {
    // Ensure scroll position is reset to 0 on mount
    window.scrollTo(0, 0);
    setStoryProgress(0);

    const trigger = ScrollTrigger.create({
      trigger: scrollContainerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setStoryProgress(self.progress);
        
        // Auto-enter interactive mode near the very end of the scroll
        if (self.progress >= 0.98) {
          enterInteractive();
        }
      },
    });

    return () => {
      trigger.kill();
    };
  }, [setStoryProgress, enterInteractive]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStoryProgress(val);
    
    // Scroll the window to match the slider progress
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, val * maxScroll);
  };

  const handleSkip = () => {
    enterInteractive();
  };

  return (
    <div ref={scrollContainerRef} style={{ height: '500vh', position: 'relative' }}>
      {/* Fixed UI Layer Panels */}
      <SidePanel />

      {/* Floating HUD controls for story mode */}
      <div
        style={{
          position: 'fixed',
          top: 'var(--space-4)',
          right: 'var(--space-4)',
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={handleSkip}
          style={{
            background: 'var(--copper-500)',
            color: 'var(--void-950)',
            border: 'none',
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '13px',
            padding: 'var(--space-2) var(--space-4)',
            borderRadius: 'var(--r-md)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-copper-sm)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'brightness(1.0)';
          }}
        >
          Enter the House
        </button>
      </div>

      {/* Bottom Scrub Control Slider HUD */}
      <div
        style={{
          position: 'fixed',
          bottom: 'var(--space-6)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          zIndex: 50,
          pointerEvents: 'auto',
        }}
      >
        <GlassCard padding="sm" className="flex flex-col gap-2">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.04em',
              }}
            >
              SCROLL OR SCRUB TO REVEAL TIERS
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--copper-500)',
              }}
            >
              {Math.round(storyProgress * 100)}%
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="1"
            step="0.002"
            value={storyProgress}
            onChange={handleSliderChange}
            style={{
              width: '100%',
              WebkitAppearance: 'none',
              appearance: 'none',
              background: 'rgba(255,255,255,0.1)',
              height: '4px',
              borderRadius: '2px',
              outline: 'none',
              cursor: 'pointer',
            }}
          />
        </GlassCard>
      </div>
    </div>
  );
}
export default StoryScroll;
