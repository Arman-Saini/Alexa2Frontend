import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { EngineAssembly } from './EngineAssembly';

interface HeroCanvasProps {
  expression: 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy' | 'dizzy' | 'excited' | 'sad' | 'yawning';
  bodyColor: string;
  ledColor: string;
  ledMode: 'solid' | 'pulse' | 'wave' | 'off';
  outlineThickness: number;
  explodedProgress: number;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  isSpeaking: boolean;
  isSinging: boolean;
}

// Platform/Pedestal for the mecha robot
function Pedestal({ outlineThickness }: { outlineThickness: number }) {
  const outlineScale = 1.0 + outlineThickness * 0.015;

  const baseMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: '#2b2a26',
    });
  }, []);

  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#141312',
      side: THREE.BackSide,
    });
  }, []);

  return (
    <group position={[0, -1.15, 0]}>
      {/* Heavy round base */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[2.0, 2.2, 0.16, 32]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>
      <mesh scale={[outlineScale, 1.05, outlineScale]}>
        <cylinderGeometry args={[2.0, 2.2, 0.16, 32]} />
        <primitive object={outlineMaterial} attach="material" />
      </mesh>

      {/* Stylized Grid pattern on top of the pedestal */}
      <gridHelper args={[3.8, 12, '#3a312a', '#1e1a17']} position={[0, 0.082, 0]} />
    </group>
  );
}

export function HeroCanvas({
  expression,
  bodyColor,
  ledColor,
  ledMode,
  outlineThickness,
  explodedProgress,
  isPanelOpen,
  setIsPanelOpen,
  isSpeaking,
  isSinging,
}: HeroCanvasProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.4, 5.2], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ powerPreference: 'high-performance', antialias: true }}
    >
      <ambientLight intensity={0.7} color="#fffcf5" />

      {/* Warm directional light casting shadows */}
      <directionalLight
        position={[4, 8, 3]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        color="#fff5e6"
      />

      {/* Rim light from behind */}
      <directionalLight position={[-4, 2, -4]} intensity={0.6} color="#cce6ff" />

      {/* Floor bounce fill light */}
      <directionalLight position={[0, -5, 0]} intensity={0.3} color="#a68e6f" />

      <Suspense fallback={null}>
        <group
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
          onPointerDown={() => setIsClicked(true)}
          onPointerUp={() => setIsClicked(false)}
        >
          <EngineAssembly
            expression={expression}
            bodyColor={bodyColor}
            ledColor={ledColor}
            ledMode={ledMode}
            outlineThickness={outlineThickness}
            explodedProgress={explodedProgress}
            isHovered={isHovered}
            isClicked={isClicked}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
            isSpeaking={isSpeaking}
            isSinging={isSinging}
          />
        </group>

        <Pedestal outlineThickness={outlineThickness} />

        <ContactShadows
          position={[0, -1.24, 0]}
          opacity={0.65}
          scale={5.5}
          blur={1.8}
          far={2.0}
          frames={1}
        />
      </Suspense>

      <OrbitControls
        enableZoom={true}
        minDistance={3.5}
        maxDistance={9.0}
        maxPolarAngle={Math.PI / 2 + 0.15}
        enablePan={false}
      />
    </Canvas>
  );
}

export default HeroCanvas;
