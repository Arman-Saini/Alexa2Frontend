import { Suspense, lazy } from 'react';
import { useAppStore } from './store/store';
import { Header } from './components/layout/Header';
import { PanelTabs } from './components/layout/PanelTabs';
import { AssetLibraryPanel } from './components/panels/AssetLibraryPanel';
import { InspectorPanel } from './components/panels/InspectorPanel';
import { AlexaAppSimView } from './components/panels/AlexaAppSimView';

const DigitalTwinCanvas = lazy(() =>
  import('./components/canvas/DigitalTwinCanvas').then((m) => ({ default: m.DigitalTwinCanvas }))
);

function RightPanel() {
  const activePanel = useAppStore((s) => s.ui.activePanel);

  return (
    <div className="flex flex-col h-full">
      <PanelTabs />
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {activePanel === 'alexa' && <AlexaAppSimView />}
        {activePanel === 'library' && <AssetLibraryPanel />}
        {activePanel === 'inspector' && <InspectorPanel />}
      </div>
    </div>
  );
}

function CanvasLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-alexa-dark">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-pulse">🏠</div>
        <p className="text-alexa-blue text-sm">Loading Digital Twin...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex flex-col w-full h-full bg-alexa-dark">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* 3D Canvas — main content area */}
        <div className="flex-1 relative overflow-hidden">
          <Suspense fallback={<CanvasLoader />}>
            <DigitalTwinCanvas />
          </Suspense>
        </div>

        {/* Right panel — fixed 320px */}
        <div className="w-80 shrink-0 bg-alexa-panel border-l border-alexa-card flex flex-col overflow-hidden">
          <RightPanel />
        </div>
      </div>
    </div>
  );
}
