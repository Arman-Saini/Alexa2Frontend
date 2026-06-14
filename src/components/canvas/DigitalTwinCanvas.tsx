import { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, ContactShadows } from '@react-three/drei';
import { useAppStore } from '../../store/store';
import { House } from './House';
import { CameraController } from './CameraController';
import { MiniMap } from './MiniMap';

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.45} color="#ccd8ee" />
      {/* Main key light — warm sun from upper-right */}
      <directionalLight
        position={[18, 28, 16]}
        intensity={1.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={150}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        color="#fff8e8"
      />
      {/* Cool fill from left */}
      <directionalLight position={[-12, 10, -8]} intensity={0.3} color="#d0e8ff" />
      {/* Soft hemisphere */}
      <hemisphereLight args={['#8ab4f8', '#0d0d1a', 0.25]} />
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
        camera={{
          position: [22, 20, 22],
          zoom: 32,
          near: -500,
          far: 500,
        }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        style={{ background: 'linear-gradient(160deg, #0a0a18 0%, #0d1020 50%, #080c14 100%)' }}
      >
        <Suspense fallback={null}>
          <SceneLighting />

          {/* Stars only in house overview */}
          {!ui.activeRoomId && (
            <Stars radius={120} depth={60} count={2000} factor={3} fade speed={0.3} />
          )}

          <CameraController />

          <OrbitControls
            makeDefault
            enabled={!ui.isPlacementMode}
            minZoom={12}
            maxZoom={140}
            maxPolarAngle={Math.PI / 2.2}
            minPolarAngle={Math.PI / 6}
            enablePan
            panSpeed={0.6}
            rotateSpeed={0.45}
            zoomSpeed={0.9}
          />

          {/* Ground contact shadows */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.35}
            scale={35}
            blur={2.5}
            far={10}
            color="#000820"
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
          className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-[#1A1A1A] bg-opacity-90 border border-[#383838] rounded-full px-3 py-1.5 text-xs text-[#00A8E0] hover:border-[#00A8E0] transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          House View
        </button>
      )}

      {/* Placement mode */}
      {ui.isPlacementMode && (
        <>
          <div className="absolute inset-0 pointer-events-none border-2 border-[#00A8E0] border-dashed opacity-50 rounded" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#1A1A1A] border border-[#00A8E0] rounded-full px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00A8E0] animate-pulse" />
            <span className="text-xs font-semibold text-[#00A8E0]">Click on the floor to place</span>
            <button onClick={exitPlacementMode} className="ml-2 text-[10px] text-[#8A8A8A] hover:text-white border border-[#383838] rounded-full px-2 py-0.5">
              Cancel (Esc)
            </button>
          </div>
        </>
      )}

      {/* Bottom hint */}
      {!ui.activeRoomId && !ui.isPlacementMode && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#444] bg-[#0d0d1a] bg-opacity-80 px-3 py-1.5 rounded-full pointer-events-none border border-[#1a1a2a]">
          Click a room to zoom in · Scroll to zoom · Drag to orbit · Hover a device for sensor data
        </div>
      )}
    </div>
  );
}
