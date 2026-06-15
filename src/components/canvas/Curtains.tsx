import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Procedural curtain panel — two fabric panels flanking the window.
// Rendered as a child of an ArchWindow group; inherits window world transform.
// Only the panel meshes sway. The group never moves.

const CURTAIN_COLOR = '#C8B8A2';   // warm linen
const CURTAIN_EMISSIVE = '#3A2E24';
const FOLD_COLOR = '#B0A090';

export function Curtain({ width = 1.5 }: { width?: number }) {
  const leftRef  = useRef<THREE.Mesh>(null);
  const rightRef = useRef<THREE.Mesh>(null);

  const panelW = width * 0.28;
  const panelH = 1.7;
  const panelX = width * 0.36;

  useFrame((state) => {
    const sway = Math.sin(state.clock.elapsedTime * 0.45) * 0.018;
    if (leftRef.current)  leftRef.current.rotation.z  =  sway;
    if (rightRef.current) rightRef.current.rotation.z = -sway;
  });

  return (
    <group position={[0, -0.35, 0.04]}>
      {/* Left panel — hangs from top, pivots at top */}
      <group position={[-panelX, panelH / 2, 0]}>
        <mesh ref={leftRef} castShadow>
          <boxGeometry args={[panelW, panelH, 0.03]} />
          <meshStandardMaterial
            color={CURTAIN_COLOR}
            emissive={CURTAIN_EMISSIVE}
            emissiveIntensity={0.12}
            roughness={0.92}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Fold crease */}
        <mesh position={[panelW * 0.15, 0, 0.016]} castShadow>
          <boxGeometry args={[0.025, panelH * 0.9, 0.01]} />
          <meshStandardMaterial color={FOLD_COLOR} roughness={0.95} />
        </mesh>
      </group>

      {/* Right panel */}
      <group position={[panelX, panelH / 2, 0]}>
        <mesh ref={rightRef} castShadow>
          <boxGeometry args={[panelW, panelH, 0.03]} />
          <meshStandardMaterial
            color={CURTAIN_COLOR}
            emissive={CURTAIN_EMISSIVE}
            emissiveIntensity={0.12}
            roughness={0.92}
            metalness={0.0}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[-panelW * 0.15, 0, 0.016]} castShadow>
          <boxGeometry args={[0.025, panelH * 0.9, 0.01]} />
          <meshStandardMaterial color={FOLD_COLOR} roughness={0.95} />
        </mesh>
      </group>

      {/* Curtain rod */}
      <mesh position={[0, panelH / 2 + 0.06, 0.01]}>
        <cylinderGeometry args={[0.018, 0.018, width * 0.88, 8]} />
        <meshStandardMaterial color="#8B7355" roughness={0.4} metalness={0.5} />
      </mesh>
    </group>
  );
}
