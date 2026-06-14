import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useAppStore } from '../../store/store';
import { House } from './House';
import { CameraController } from './CameraController';
import { MiniMap } from './MiniMap';

function SceneLighting() {
  return (
    <>
      {/* Ambient fill */}
      <ambientLight intensity={0.35} color="#b8ccff" />
      {/* Main sun */}
      <directionalLight
        position={[12, 22, 12]}
        intensity={1.4}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={120}
        shadow-camera-left={-22}
        shadow-camera-right={22}
        shadow-camera-top={22}
        shadow-camera-bottom={-22}
        color="#fff8e8"
      />
      {/* Cool fill from opposite */}
      <directionalLight position={[-10, 8, -8]} intensity={0.25} color="#c8deff" />
      {/* Hemisphere sky/ground */}
      <hemisphereLight args={['#0a1433', '#12080a', 0.35]} />
    </>
  );
}

export function DigitalTwinCanvas() {
  const { ui, setActiveRoom, setSelectedObject, exitPlacementMode, toggleMiniMap } = useAppStore();

  // Keyboard shortcuts
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
        shadows
        camera={{ position: [0, 20, 16], fov: 50, near: 0.1, far: 250 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: '#080810' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />

          {/* Stars only in house view */}
          {!ui.activeRoomId && (
            <Stars radius={80} depth={50} count={2500} factor={3} fade speed={0.4} />
          )}

          <CameraController />

          <OrbitControls
            makeDefault
            enabled={!ui.isPlacementMode}
            minDistance={3}
            maxDistance={45}
            maxPolarAngle={Math.PI / 2.05}
            enablePan
            panSpeed={0.7}
            rotateSpeed={0.55}
            zoomSpeed={0.8}
          />

          <House />
        </Suspense>
      </Canvas>

      {/* MiniMap overlay */}
      {ui.showMiniMap && !ui.isPlacementMode && <MiniMap />}

      {/* Toggle minimap button */}
      {!ui.isPlacementMode && !ui.showMiniMap && (
        <button
          onClick={toggleMiniMap}
          className="absolute bottom-12 left-3 z-20 bg-[#1A1A1A] border border-[#383838] rounded-lg px-2 py-1.5 text-[10px] text-[#8A8A8A] hover:text-white hover:border-[#00A8E0] transition-all"
        >
          Show Map
        </button>
      )}

      {/* Room view back button overlay */}
      {ui.activeRoomId && !ui.isPlacementMode && (
        <button
          onClick={() => setActiveRoom(null)}
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#1A1A1A] bg-opacity-90 border border-[#383838] rounded-full px-3 py-1.5 text-xs text-[#00A8E0] hover:border-[#00A8E0] transition-all"
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
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1A1A1A] border border-[#00A8E0] rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A8E0] animate-pulse" />
            <span className="text-xs font-semibold text-[#00A8E0]">Click on the floor to place</span>
            <button
              onClick={exitPlacementMode}
              className="ml-2 text-[10px] text-[#8A8A8A] hover:text-white border border-[#383838] rounded-full px-2 py-0.5"
            >
              Cancel (Esc)
            </button>
          </div>
        </>
      )}

      {/* Bottom hint */}
      {!ui.activeRoomId && !ui.isPlacementMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#444] bg-[#121212] bg-opacity-80 px-3 py-1.5 rounded-full pointer-events-none border border-[#222]">
          Click a room to zoom in · Scroll to zoom · Drag to orbit · Esc to deselect
        </div>
      )}
    </div>
  );
}
