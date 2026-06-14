import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { useAppStore } from '../../store/store';
import { House } from './House';
import { CameraController } from './CameraController';

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.4} color="#b0c8ff" />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.1}
        shadow-camera-far={100}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        color="#fff5e0"
      />
      <directionalLight position={[-8, 10, -6]} intensity={0.3} color="#c0d8ff" />
      <hemisphereLight args={['#0a1a3a', '#1a0a30', 0.3]} />
    </>
  );
}

export function DigitalTwinCanvas() {
  const { ui } = useAppStore();
  const cursorClass = ui.isPlacementMode ? 'cursor-crosshair' : '';

  return (
    <div className={`w-full h-full ${cursorClass}`}>
      <Canvas
        shadows
        camera={{
          position: [0, 18, 14],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0d0d1a' }}
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <SceneLighting />

          {/* Sky atmosphere */}
          {!ui.activeRoomId && (
            <Stars radius={80} depth={50} count={3000} factor={3} fade speed={0.5} />
          )}

          {/* Camera smooth transitions */}
          <CameraController />

          {/* Orbit controls — disabled during placement */}
          <OrbitControls
            makeDefault
            enabled={!ui.isPlacementMode}
            minDistance={3}
            maxDistance={40}
            maxPolarAngle={Math.PI / 2.1}
            enablePan
            panSpeed={0.8}
            rotateSpeed={0.6}
            zoomSpeed={0.8}
          />

          {/* House geometry */}
          <House />
        </Suspense>
      </Canvas>

      {/* Overlay: room view hint */}
      {!ui.activeRoomId && !ui.isPlacementMode && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-500 bg-alexa-dark bg-opacity-75 px-3 py-1.5 rounded-full pointer-events-none">
          Click a room to zoom in · Scroll to zoom · Drag to orbit
        </div>
      )}

      {/* Placement mode overlay */}
      {ui.isPlacementMode && (
        <div className="absolute inset-0 pointer-events-none border-2 border-yellow-400 border-dashed opacity-60 rounded" />
      )}
    </div>
  );
}
