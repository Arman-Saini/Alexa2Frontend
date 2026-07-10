import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, OrthographicCamera, Environment } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { FinalAlexaModel } from './FinalAlexaModel';
import { FinalArchitectureStack } from './FinalArchitectureStack';

interface FinalAlexaCanvasProps {
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
  dismantleMode?: boolean;
  cpuScrollProgress?: number;
  /** Bump to snap the orbit camera back to its default framing. */
  resetSignal?: number;
  debugMode?: boolean;
  debugCpuOffsetY?: number;
  debugCpuPhase2Y?: number;
  debugCpuRestingY?: number;
  debugCamPanX?: number;
  debugCamOffsetY?: number;
  debugCamPanZ?: number;
  debugCamZoom?: number;
  debugCamYaw?: number;
  debugCamPitch?: number;
  alexaOpacityOverride?: number;
}

// Grid Platform/Pedestal for the mecha robot
function Pedestal({ 
  outlineThickness,
  dismantleMode = false,
  cpuScrollProgress = 0
}: { 
  outlineThickness: number;
  dismantleMode?: boolean;
  cpuScrollProgress?: number;
}) {
  const outlineScale = 1.0 + outlineThickness * 0.015;
  const s = cpuScrollProgress;

  const pedestalOpacity = useMemo(() => {
    if (!dismantleMode) return 1.0;
    if (s < 0.20) {
      return 1.0;
    } else if (s < 0.25) {
      const t = (s - 0.20) / 0.05;
      return THREE.MathUtils.lerp(1.0, 0.0, t);
    } else if (s < 0.95) {
      return 0.0;
    } else {
      const t = (s - 0.95) / 0.05;
      return THREE.MathUtils.lerp(0.0, 1.0, t);
    }
  }, [dismantleMode, s]);

  const baseMaterial = useMemo(() => {
    return new THREE.MeshToonMaterial({
      color: '#2b2a26',
      transparent: true,
      opacity: pedestalOpacity,
    });
  }, [pedestalOpacity]);

  const outlineMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: '#141312',
      side: THREE.BackSide,
      transparent: true,
      opacity: pedestalOpacity,
    });
  }, [pedestalOpacity]);

  return (
    <group position={[0, -1.15, 0]} visible={pedestalOpacity > 0}>
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
      {pedestalOpacity > 0.5 && (
        <gridHelper args={[3.8, 12, '#3a312a', '#1e1a17']} position={[0, 0.082, 0]} />
      )}
    </group>
  );
}



export function FinalAlexaCanvas({
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
  dismantleMode = false,
  cpuScrollProgress = 0,
  resetSignal,
  debugMode = false,
  debugCpuOffsetY = 1.05,
  debugCpuPhase2Y = 1.18,
  debugCpuRestingY = 0.0,
  debugCamPanX = 0.0,
  debugCamOffsetY = 0.0,
  debugCamPanZ = 0.0,
  debugCamZoom = 90,
  debugCamYaw = 0.0,
  debugCamPitch = 0.0,
  alexaOpacityOverride,
}: FinalAlexaCanvasProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    if (resetSignal !== undefined) controlsRef.current?.reset();
  }, [resetSignal]);



  return (
    <Canvas
      shadows
      camera={{ position: [0, 3.2, 9.2], fov: 45 }}
      style={{ background: 'transparent' }}
      gl={{ powerPreference: 'high-performance', antialias: true }}
    >
      {dismantleMode ? (
        <>
          {/* Exact cpuanimation lighting */}
          <ambientLight intensity={0.4} color="#f0f4f8" />
          <directionalLight
            position={[5, 10, -5]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-4}
            shadow-camera-right={4}
            shadow-camera-top={4}
            shadow-camera-bottom={-4}
            shadow-bias={-0.0002}
            color="#fffdfa"
          />
          <directionalLight position={[-6, -4, 4]} intensity={0.5} color="#cbdff0" />
          <Environment preset="city" />
        </>
      ) : (
        <>
          <ambientLight intensity={0.7} color="#fffcf5" />
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
          <directionalLight position={[-4, 2, -4]} intensity={0.6} color="#cce6ff" />
          <directionalLight position={[0, -5, 0]} intensity={0.3} color="#a68e6f" />
        </>
      )}

      {dismantleMode && (
        <OrthographicCamera makeDefault position={[0, 0.2, 8]} zoom={90} />
      )}

      <Suspense fallback={null}>
        <group
          onPointerOver={() => setIsHovered(true)}
          onPointerOut={() => setIsHovered(false)}
          onPointerDown={() => setIsClicked(true)}
          onPointerUp={() => setIsClicked(false)}
        >
          <FinalAlexaModel
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
            dismantleMode={dismantleMode}
            cpuScrollProgress={cpuScrollProgress}
            debugMode={debugMode}
            alexaOpacityOverride={alexaOpacityOverride}
          />
        </group>

        <FinalArchitectureStack
          ledColor={dismantleMode ? '#ff3333' : ledColor}
          scrollProgress={cpuScrollProgress}
          dismantleMode={dismantleMode}
          debugCpuOffsetY={debugCpuOffsetY}
          debugCpuPhase2Y={debugCpuPhase2Y}
          debugCpuRestingY={debugCpuRestingY}
          debugCamPanX={debugCamPanX}
          debugCamOffsetY={debugCamOffsetY}
          debugCamPanZ={debugCamPanZ}
          debugCamZoom={debugCamZoom}
          debugCamYaw={debugCamYaw}
          debugCamPitch={debugCamPitch}
        />

        <Pedestal 
          outlineThickness={outlineThickness} 
          dismantleMode={dismantleMode}
          cpuScrollProgress={cpuScrollProgress}
        />

        {/* Soft Ambient shadow under the pedestal (frames={1} bakes once, saving massive rendering time) */}
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
        ref={controlsRef}
        enabled={!dismantleMode || debugMode}
        // Wheel/two-finger-scroll drives the dismantle sequence instead of
        // zoom (see FinalShowcasePage's wheel handler) — zoom stays off
        // outside debug so scrolling never fights the dismantle trigger.
        enableZoom={debugMode}
        minDistance={3.5}
        maxDistance={9.0}
        maxPolarAngle={Math.PI / 2 + 0.15} // Prevents looking under the platform
        enablePan={false}
        target={[0, 0.4, 0]}
      />
    </Canvas>
  );
}

export default FinalAlexaCanvas;
