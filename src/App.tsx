import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DigitalTwinCanvas } from './components/canvas/DigitalTwinCanvas';
import { ActShell } from './components/acts/ActShell';
import { SmartphoneWidget } from './components/phone/SmartphoneWidget';
import { AmbientBackdrop } from './components/shared/AmbientBackdrop';
import { useInteractionEffects } from './hooks/useInteractionEffects';
import { useIsMobileViewport } from './hooks/useIsMobileViewport';

// Route-level code splitting: every page below is a standalone lab/showcase
// route, most carrying their own heavy Three.js scene. Keeping them out of
// the main bundle means visiting "/" never downloads five other 3D scenes
// it doesn't render — the build was flagging a 2.2MB single-chunk warning
// before this split.
const EcosystemPage = lazy(() => import('./components/ecosystem/EcosystemPage').then(m => ({ default: m.EcosystemPage })));
const AnimationPage = lazy(() => import('./components/animation/AnimationPage').then(m => ({ default: m.AnimationPage })));
const CpuAnimationPage = lazy(() => import('./components/animation/CpuAnimationPage').then(m => ({ default: m.CpuAnimationPage })));
const CuteAlexaPage = lazy(() => import('./components/cartoon/CuteAlexaPage').then(m => ({ default: m.CuteAlexaPage })));
const FinalPage = lazy(() => import('./components/final/FinalPage').then(m => ({ default: m.FinalPage })));
const FinalShowcasePage = lazy(() => import('./components/final/FinalShowcasePage').then(m => ({ default: m.FinalShowcasePage })));
const FinalShowcaseLivePage = lazy(() => import('./components/final/FinalShowcaseLivePage').then(m => ({ default: m.FinalShowcaseLivePage })));
const CompanionPage = lazy(() => import('./components/phone/CompanionPage').then(m => ({ default: m.CompanionPage })));
const SmartphoneOnlyPage = lazy(() => import('./components/phone/SmartphoneOnlyPage').then(m => ({ default: m.SmartphoneOnlyPage })));

function RouteFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0c0b0a] text-[#7A7168] font-mono text-xs tracking-widest uppercase">
      Loading…
    </div>
  );
}

function Home() {
  const isMobile = useIsMobileViewport();
  useInteractionEffects();

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
      <ActShell />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
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
          <Route path="/showcase" element={<FinalShowcasePage />} />
          <Route path="/showcase-live" element={<FinalShowcaseLivePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
