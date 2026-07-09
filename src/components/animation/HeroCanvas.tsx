// frontend/src/components/animation/HeroCanvas.tsx
import { Canvas } from '@react-three/fiber';
import { Environment, ScrollControls, OrthographicCamera } from '@react-three/drei';
import { EngineAssembly } from './EngineAssembly';

export interface HeroCanvasProps {
  onScrollChange?: (progress: number) => void;
  onHoverChange?: (layerId: string | null) => void;
  isWhiteTheme: boolean;
}

export function HeroCanvas({ onScrollChange, onHoverChange, isWhiteTheme }: HeroCanvasProps) {
  return (
    <Canvas shadows>
      <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={40} near={-500} far={500} />

      <ambientLight intensity={isWhiteTheme ? 0.7 : 0.3} />

      <directionalLight
        position={[5, 12, -5]}
        intensity={isWhiteTheme ? 1.7 : 1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-10, 6, 10]} intensity={0.3} />

      <ScrollControls pages={3} damping={0.25}>
        <EngineAssembly
          onScrollChange={onScrollChange}
          onHoverChange={onHoverChange}
          isWhiteTheme={isWhiteTheme}
        />
        <Environment preset={isWhiteTheme ? 'apartment' : 'city'} />
      </ScrollControls>
    </Canvas>
  );
}
