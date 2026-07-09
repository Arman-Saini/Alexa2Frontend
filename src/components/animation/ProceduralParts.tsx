import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------
// SHARED: flat-shaded toon part with an inverted-hull ink outline.
// Same technique as frontend/src/components/cartoon/CuteAlexaModel.tsx:
// a duplicate mesh, scaled up slightly, BackSide-only material.
// ---------------------------------------------------------------
export interface ToonPartProps {
  color: string;
  outlineColor: string;
  outlineScale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children: React.ReactElement;
}

export function ToonPart({
  color,
  outlineColor,
  outlineScale = 1.02,
  position,
  rotation,
  castShadow,
  receiveShadow,
  children,
}: ToonPartProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={castShadow} receiveShadow={receiveShadow}>
        {children}
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh scale={outlineScale}>
        {children}
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------
// Central shaft — fixed in place, layers slide along it when exploded.
// Sized to span from the Cloud Base (y=0) to the fully-expanded
// Acoustic Ring (y=4.8, see LAYERS in EngineAssembly.tsx) plus padding.
// ---------------------------------------------------------------
export function CoreShaft({ isWhiteTheme }: { isWhiteTheme: boolean }) {
  return (
    <ToonPart
      color={isWhiteTheme ? '#8A5940' : '#241F1B'}
      outlineColor="#050505"
      position={[0, 2.2, 0]}
    >
      <cylinderGeometry args={[0.35, 0.35, 6.2, 24]} />
    </ToonPart>
  );
}

export interface LayerProps {
  isWhiteTheme: boolean;
  isHovered: boolean;
}

// ---------------------------------------------------------------
// LAYER 1 (top): Acoustic Wave Ring — torus bezel + glass-look lens +
// instanced pulsing waveform nodes + the one glowing Alexa-blue "AI heart".
// ---------------------------------------------------------------
export function AcousticRing({ isWhiteTheme, isHovered }: LayerProps) {
  const nodesRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const bodyColor = isWhiteTheme ? '#D9A98A' : '#C08662';
  const lensColor = isWhiteTheme ? '#F2EDE6' : '#1A1816';
  const glowColor = '#3da5e0';

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (nodesRef.current) {
      const obj = new THREE.Object3D();
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const pulse = 0.06 + Math.abs(Math.sin(t * 2.4 + i * 0.5)) * 0.05;
        obj.position.set(Math.cos(angle) * 0.95, 0.05, Math.sin(angle) * 0.95);
        obj.scale.setScalar(pulse);
        obj.updateMatrix();
        nodesRef.current.setMatrixAt(i, obj.matrix);
      }
      nodesRef.current.instanceMatrix.needsUpdate = true;
    }

    if (glowRef.current) {
      const breathe = 1.0 + Math.sin(t * 1.6) * 0.08;
      const hoverBoost = THREE.MathUtils.damp(glowRef.current.scale.x, breathe * (isHovered ? 1.15 : 1.0), 8, state.clock.getDelta());
      glowRef.current.scale.setScalar(hoverBoost);
    }
  });

  return (
    <group>
      <ToonPart color={bodyColor} outlineColor="#050505" castShadow>
        <torusGeometry args={[1.3, 0.18, 12, 32]} />
      </ToonPart>
      <ToonPart color={lensColor} outlineColor="#050505" position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.06, 32]} />
      </ToonPart>
      <mesh ref={glowRef} position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshBasicMaterial color={glowColor} toneMapped={false} />
      </mesh>
      <instancedMesh ref={nodesRef} args={[undefined, undefined, 24]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color={glowColor} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------
// LAYER 2: Wake Word Detector — faceted hex drum, static (no idle
// spin — reads as inert/listening, not running), one ember accent band.
// ---------------------------------------------------------------
export function WakeWordDrum({ isWhiteTheme }: LayerProps) {
  const bodyColor = isWhiteTheme ? '#C08662' : '#A96F50';
  const bandColor = '#D99A44';

  return (
    <group>
      <ToonPart color={bodyColor} outlineColor="#050505" castShadow>
        <cylinderGeometry args={[1.2, 1.2, 0.7, 6]} />
      </ToonPart>
      <ToonPart color={bandColor} outlineColor="#050505" position={[0, 0.36, 0]}>
        <cylinderGeometry args={[1.22, 1.22, 0.08, 6]} />
      </ToonPart>
    </group>
  );
}

// ---------------------------------------------------------------
// LAYER 3: NLP Matrix — ring of instanced logic blocks around the
// shaft, whole ring slow-rotates (counter to the Acoustic Ring above).
// ---------------------------------------------------------------
export function NlpMatrix({ isWhiteTheme }: LayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const blocksRef = useRef<THREE.InstancedMesh>(null);
  const bodyColor = isWhiteTheme ? '#D9A98A' : '#C08662';

  useEffect(() => {
    if (!blocksRef.current) return;
    const obj = new THREE.Object3D();
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      obj.position.set(Math.cos(angle) * 1.0, 0, Math.sin(angle) * 1.0);
      obj.rotation.y = -angle;
      obj.updateMatrix();
      blocksRef.current.setMatrixAt(i, obj.matrix);
    }
    blocksRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={groupRef}>
      <ToonPart color={bodyColor} outlineColor="#050505" castShadow>
        <cylinderGeometry args={[1.25, 1.25, 0.45, 20]} />
      </ToonPart>
      <instancedMesh ref={blocksRef} args={[undefined, undefined, 16]} castShadow>
        <boxGeometry args={[0.14, 0.5, 0.14]} />
        <meshBasicMaterial color="#050505" />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------
// LAYER 4 (bottom, fixed anchor): Cloud Action Base — flared foot
// ring with punched vents, slow-pulsing ground shadow.
// Vents are solid dark cylinders set into the ring, not real CSG
// cutouts — ponytail: visual trick, upgrade to real holes (ExtrudeGeometry
// with a hole path) only if a close-up shot ever needs it.
// ---------------------------------------------------------------
export function CloudBase({ isWhiteTheme }: LayerProps) {
  const shadowMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const bodyColor = isWhiteTheme ? '#8A5940' : '#241F1B';
  const ventColor = isWhiteTheme ? '#ECE6DF' : '#0A0A0A';

  const vents = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return [Math.cos(angle) * 1.75, 0, Math.sin(angle) * 1.75] as [number, number, number];
      }),
    []
  );

  useFrame((state) => {
    if (shadowMatRef.current) {
      shadowMatRef.current.opacity = 0.25 + Math.sin(state.clock.getElapsedTime() * 1.2) * 0.08;
    }
  });

  return (
    <group>
      <ToonPart color={bodyColor} outlineColor="#050505" castShadow receiveShadow>
        <cylinderGeometry args={[1.6, 1.9, 0.5, 24]} />
      </ToonPart>
      {vents.map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.12, 0.12, 0.52, 8]} />
          <meshBasicMaterial color={ventColor} />
        </mesh>
      ))}
      <mesh position={[0, -0.27, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 32]} />
        <meshBasicMaterial ref={shadowMatRef} color="#000000" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}
