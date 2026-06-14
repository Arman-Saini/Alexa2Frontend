import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '../../store/store';
import { House } from './House';
import { CameraController } from './CameraController';
import { MiniMap } from './MiniMap';

// Single strong directional sun + very dim ambient = clean toon shadow steps.
// No fill lights — they muddy the gradient bands.
function SceneLighting() {
  return (
    <>
      <directionalLight
        position={[18, 28, 12]}
        intensity={2.4}
        castShadow
        color="#FFF8E0"
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.001}
      />
      <ambientLight intensity={0.22} color="#B8D4F0" />
    </>
  );
}

export function DigitalTwinCanvas() {
  const { ui, setActiveRoom, setSelectedObject, exitPlacementMode, toggleMiniMap } = useAppStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ui.isPlacementMode) exitPlacementMode();
        else if (ui.selectedObjectId) setSelectedObject(null);
        else if (ui.activeRoomId) setActiveRoom(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ui, setActiveRoom, setSelectedObject, exitPlacementMode]);

  const cursorClass = ui.isPlacementMode ? 'cursor-crosshair' : '';

  return (
    <div className={`w-full h-full relative ${cursorClass}`}>
      <Canvas
        orthographic
        shadows
        camera={{ position: [22, 20, 22], zoom: 32, near: -500, far: 500 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        // Bright sky gradient — Sims daytime aesthetic
        style={{ background: 'linear-gradient(175deg, #5BB8E8 0%, #90CEEE 35%, #C8E8F8 70%, #E8F4FF 100%)' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />

          <CameraController />

          <OrbitControls
            makeDefault
            enabled={!ui.isPlacementMode}
            minZoom={14}
            maxZoom={160}
            maxPolarAngle={Math.PI / 2.15}
            minPolarAngle={Math.PI / 5}
            enablePan
            panSpeed={0.6}
            rotateSpeed={0.4}
            zoomSpeed={0.9}
          />

          <House />
        </Suspense>
      </Canvas>

      {/* Minimap */}
      {ui.showMiniMap && !ui.isPlacementMode && <MiniMap />}
      {!ui.isPlacementMode && !ui.showMiniMap && (
        <button
          onClick={toggleMiniMap}
          className="absolute bottom-12 left-3 z-20 bg-[#1A1A1A] border border-[#383838] rounded-lg px-2 py-1.5 text-[10px] text-[#8A8A8A] hover:text-white hover:border-[#00A8E0] transition-all"
        >
          Show Map
        </button>
      )}

      {/* Room view back button */}
      {ui.activeRoomId && !ui.isPlacementMode && (
        <button
          onClick={() => setActiveRoom(null)}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-white bg-opacity-80 border border-gray-200 rounded-full px-3 py-1.5 text-xs text-gray-700 hover:border-blue-400 hover:text-blue-600 transition-all shadow-md"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          House View
        </button>
      )}

      {/* Placement mode banner */}
      {ui.isPlacementMode && (
        <>
          <div className="absolute inset-0 pointer-events-none border-2 border-[#00A8E0] border-dashed opacity-50 rounded" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white bg-opacity-90 border border-blue-300 rounded-full px-4 py-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-semibold text-blue-700">Click on the floor to place</span>
            <button
              onClick={exitPlacementMode}
              className="ml-2 text-[10px] text-gray-500 hover:text-gray-800 border border-gray-300 rounded-full px-2 py-0.5"
            >
              Cancel (Esc)
            </button>
          </div>
        </>
      )}

      {/* Bottom hint */}
      {!ui.activeRoomId && !ui.isPlacementMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-white bg-black bg-opacity-30 px-3 py-1.5 rounded-full pointer-events-none backdrop-blur-sm">
          Click a room to zoom in · Scroll to zoom · Drag to orbit · Hover a device for sensor data
        </div>
      )}
    </div>
  );
}
