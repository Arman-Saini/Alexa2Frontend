import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DigitalTwinCanvas } from './components/canvas/DigitalTwinCanvas';
import { ActShell } from './components/acts/ActShell';
import { EcosystemPage } from './components/ecosystem/EcosystemPage';
import { AnimationPage } from './components/animation/AnimationPage';
import { CuteAlexaPage } from './components/cartoon/CuteAlexaPage';
import { CompanionPage } from './components/phone/CompanionPage';
import { SmartphoneOnlyPage } from './components/phone/SmartphoneOnlyPage';
import { useStoryStore } from './store/storyStore';
import { StoryScroll } from './components/story/StoryScroll';

function Home() {
  const mode = useStoryStore((s) => s.mode);
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
        <Route path="/ani" element={<Navigate to="/animation" replace />} />
        <Route path="/cartoon" element={<CuteAlexaPage />} />
        <Route path="/companion" element={<CompanionPage />} />
        <Route path="/smartphone" element={<SmartphoneOnlyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


