import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DigitalTwinCanvas } from './components/canvas/DigitalTwinCanvas';
import { ActShell } from './components/acts/ActShell';
import { EcosystemPage } from './components/ecosystem/EcosystemPage';
import { AnimationPage } from './components/animation/AnimationPage';
import { CpuAnimationPage } from './components/animation/CpuAnimationPage';
import { CuteAlexaPage } from './components/cartoon/CuteAlexaPage';
import { FinalPage } from './components/final/FinalPage';
import { CompanionPage } from './components/phone/CompanionPage';
import { SmartphoneOnlyPage } from './components/phone/SmartphoneOnlyPage';
import { SmartphoneWidget } from './components/phone/SmartphoneWidget';
import { AmbientBackdrop } from './components/shared/AmbientBackdrop';
import { useIsMobileViewport } from './hooks/useIsMobileViewport';
import { useStoryStore } from './store/storyStore';
import { StoryScroll } from './components/story/StoryScroll';

function Home() {
  const mode = useStoryStore((s) => s.mode);
  const isMobile = useIsMobileViewport();

  if (isMobile) {
    // Real phone-width viewport: the phone app IS the whole experience —
    // no digital twin, no HUD, no "view 3D demo" toggle.
    return (
      <div className="relative w-screen h-screen overflow-hidden bg-[#090909] select-none text-text-primary font-sans">
        <AmbientBackdrop />
        <div className="relative z-10 w-full h-full">
          <SmartphoneWidget showExitButton={false} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--void-950)' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <DigitalTwinCanvas />
      </div>
      {mode === 'story' ? <StoryScroll /> : <ActShell />}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ecosystem" element={<EcosystemPage />} />
        <Route path="/animation" element={<AnimationPage />} />
        <Route path="/cpuanimation" element={<CpuAnimationPage />} />
        <Route path="/ani" element={<Navigate to="/animation" replace />} />
        <Route path="/cartoon" element={<CuteAlexaPage />} />
        <Route path="/companion" element={<CompanionPage />} />
        <Route path="/smartphone" element={<SmartphoneOnlyPage />} />
        <Route path="/final" element={<FinalPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


