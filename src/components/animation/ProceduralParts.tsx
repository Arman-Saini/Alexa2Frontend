import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Color definitions
const LINE_LIGHT = '#2E2B28';
const LINE_DARK = '#D9A98A';
const ACCENT_BLUE = '#00f3ff';

export interface LayerProps {
  isWhiteTheme: boolean;
  isHovered: boolean;
  explodedProgress: number;
}

// Helper: cartoon outline + mesh builder
function ToonMesh({
  children,
  bodyColor,
  outlineColor,
  outlineThickness = 1.3,
  position,
  rotation,
}: {
  children: React.ReactElement;
  bodyColor: string;
  outlineColor: string;
  outlineThickness?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const outlineScale = useMemo(() => {
    const scaleFactor = 1.0 + outlineThickness * 0.025;
    return [scaleFactor, scaleFactor, scaleFactor] as [number, number, number];
  }, [outlineThickness]);

  const toonMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: bodyColor }), [bodyColor]);
  const outlineMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: outlineColor, side: THREE.BackSide }), [outlineColor]);

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        {children}
        <primitive object={toonMaterial} attach="material" />
      </mesh>
      <mesh scale={outlineScale}>
        {children}
        <primitive object={outlineMaterial} attach="material" />
      </mesh>
    </group>
  );
}

// 1. TOP DOME (Head of Alexa Robot)
export function CartoonAlexaHead({ isWhiteTheme, isHovered, explodedProgress }: LayerProps) {
  const antennaRef = useRef<THREE.Group>(null);
  const leftEyeRef = useRef<THREE.Group>(null);
  const rightEyeRef = useRef<THREE.Group>(null);

  const bodyColor = isWhiteTheme ? '#e2d5c3' : '#2e323b'; // Cream vs Charcoal
  const outlineColor = isWhiteTheme ? LINE_LIGHT : '#141312';
  const faceGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }), []);
  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#08080a' }), []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Antenna wiggle
    if (antennaRef.current) {
      antennaRef.current.rotation.z = Math.sin(t * (isHovered ? 12 : 5)) * (isHovered ? 0.2 : 0.08);
    }
    // Dizzy eye spin when exploded
    if (explodedProgress > 0.05) {
      if (leftEyeRef.current) leftEyeRef.current.rotation.z = t * 5.0;
      if (rightEyeRef.current) rightEyeRef.current.rotation.z = -t * 5.0;
    } else {
      if (leftEyeRef.current) leftEyeRef.current.rotation.z = 0;
      if (rightEyeRef.current) rightEyeRef.current.rotation.z = 0;
    }
  });

  return (
    <group>
      {/* Upper sphere half */}
      <ToonMesh bodyColor={bodyColor} outlineColor={outlineColor} outlineThickness={1.4}>
        <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </ToonMesh>

      {/* Flat face plate underside */}
      <ToonMesh bodyColor={bodyColor} outlineColor={outlineColor} outlineThickness={1.4} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
      </ToonMesh>

      {/* Retro Mecha Antenna */}
      <group ref={antennaRef} position={[0, 1.2, 0]}>
        {/* Base bracket */}
        <ToonMesh bodyColor={bodyColor} outlineColor={outlineColor}>
          <cylinderGeometry args={[0.13, 0.13, 0.04, 12]} />
        </ToonMesh>
        {/* Stem */}
        <ToonMesh bodyColor={isWhiteTheme ? '#a1a1aa' : '#e6dfd5'} outlineColor={outlineColor} position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 8]} />
        </ToonMesh>
        {/* Bulb */}
        <ToonMesh bodyColor="#3da5e0" outlineColor={outlineColor} position={[0, 0.42, 0]}>
          <sphereGeometry args={[0.075, 16, 16]} />
        </ToonMesh>
      </group>

      {/* Eyes & UI Face */}
      <group position={[0, 0, 0.02]}>
        {/* Dark Screen background */}
        <mesh position={[0, 0.35, 1.08]} rotation={[0.15, 0, 0]}>
          <boxGeometry args={[0.8, 0.3, 0.02]} />
          <primitive object={screenMaterial} attach="material" />
        </mesh>

        {explodedProgress > 0.05 ? (
          <>
            {/* Dizzy Cross Eyes (Left) */}
            <group ref={leftEyeRef} position={[-0.24, 0.35, 1.11]} rotation={[0, -0.2, 0]}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.15, 0.03, 0.01]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.15, 0.03, 0.01]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
            {/* Dizzy Cross Eyes (Right) */}
            <group ref={rightEyeRef} position={[0.24, 0.35, 1.11]} rotation={[0, 0.2, 0]}>
              <mesh rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.15, 0.03, 0.01]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
              <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.15, 0.03, 0.01]} />
                <primitive object={faceGlowMaterial} attach="material" />
              </mesh>
            </group>
          </>
        ) : (
          <>
            {/* Happy arch/curious rings */}
            <mesh position={[-0.24, 0.35, 1.11]} rotation={[0, -0.2, 0]}>
              <ringGeometry args={[0.05, 0.08, 24]} />
              <primitive object={faceGlowMaterial} attach="material" />
            </mesh>
            <mesh position={[0.24, 0.35, 1.11]} rotation={[0, 0.2, 0]}>
              <ringGeometry args={[0.05, 0.08, 24]} />
              <primitive object={faceGlowMaterial} attach="material" />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
}

// Helper: liquid-glass component (same technique as original)
function GlassComponent({
  outlineColor,
  roughness = 0.05,
  children,
}: {
  outlineColor: string;
  roughness?: number;
  children: React.ReactElement;
}) {
  return (
    <group>
      <mesh>
        {children}
        <meshPhysicalMaterial
          color="#ffffff"
          transmission={1}
          roughness={roughness}
          thickness={0.45}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.08}
          attenuationColor={outlineColor}
          attenuationDistance={0.6}
        />
      </mesh>
      <mesh scale={1.015}>
        {children}
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

// 2. INNER LENS + ANIMATED APERTURE
export function CartoonAlexaLens({ isWhiteTheme, explodedProgress }: LayerProps) {
  const lineCol = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const bladesGroupRef = useRef<THREE.Group>(null);

  // Animate aperture blades opening/closing on scroll
  useFrame(() => {
    if (bladesGroupRef.current) {
      const children = bladesGroupRef.current.children;
      const rotationAngle = (1.0 - explodedProgress) * 0.42; // closes as scroll goes to 0 (assembled)
      children.forEach((child, i) => {
        child.rotation.z = rotationAngle + (i * Math.PI * 2) / 6;
      });
    }
  });

  return (
    <group>
      {/* Outer Metal Ring */}
      <ToonMesh bodyColor={isWhiteTheme ? '#a1a1aa' : '#4a4844'} outlineColor={lineCol} outlineThickness={1.4}>
        <torusGeometry args={[1.05, 0.08, 12, 32]} />
      </ToonMesh>

      {/* Glass Element 1 */}
      <group position={[0, 0.08, 0]}>
        <GlassComponent outlineColor={lineCol}>
          <cylinderGeometry args={[0.9, 0.9, 0.08, 24]} />
        </GlassComponent>
      </group>

      {/* Glass Element 2 (Convex dome) */}
      <group position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <GlassComponent outlineColor={lineCol}>
          <sphereGeometry args={[0.78, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3]} />
        </GlassComponent>
      </group>

      {/* Alexa Cyan Accent Ring */}
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.015, 8, 48]} />
        <meshBasicMaterial color={ACCENT_BLUE} toneMapped={false} />
      </mesh>

      {/* Animated 6-Blade Aperture Iris */}
      <group ref={bladesGroupRef} position={[0, -0.15, 0]}>
        {Array.from({ length: 6 }).map((_, i) => {
          const baseAngle = (i * Math.PI * 2) / 6;
          // Position pivot offsets
          const radiusOffset = 0.45;
          const x = Math.cos(baseAngle) * radiusOffset;
          const y = Math.sin(baseAngle) * radiusOffset;

          return (
            <group key={i} position={[x, 0, y]} rotation={[0, baseAngle, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                {/* Thin triangular iris blade */}
                <coneGeometry args={[0.3, 0.45, 3]} />
                <meshBasicMaterial color={isWhiteTheme ? '#3a3834' : '#1e1c1a'} side={THREE.DoubleSide} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

// 3. NLP PROCESSING MATRIX (Large Gear)
export function GearLarge({ isWhiteTheme }: LayerProps) {
  const lineCol = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const gearRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (gearRef.current) {
      gearRef.current.rotation.y += delta * 0.35;
    }
  });

  return (
    <group ref={gearRef}>
      {/* Central gear disk */}
      <GlassComponent outlineColor={lineCol} roughness={0.35}>
        <cylinderGeometry args={[1.05, 1.05, 0.16, 24]} />
      </GlassComponent>

      {/* Outer gear teeth */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 24;
        const x = Math.cos(angle) * 1.1;
        const z = Math.sin(angle) * 1.1;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.1, 0.12, 0.08]} />
            <meshBasicMaterial color={lineCol} />
          </mesh>
        );
      })}

      {/* Embedded tech pattern (represented by gold boxes) */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 8;
        const x = Math.cos(angle) * 0.65;
        const z = Math.sin(angle) * 0.65;
        return (
          <mesh key={i} position={[x, 0.09, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.08, 0.03, 0.12]} />
            <meshBasicMaterial color="#f1c40f" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// 4. WAKE-WORD ENGINE (Small Gear)
export function GearSmall({ isWhiteTheme }: LayerProps) {
  const lineCol = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const gearRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (gearRef.current) {
      gearRef.current.rotation.y -= delta * 0.7; // counter-rotates and faster
    }
  });

  return (
    <group ref={gearRef}>
      {/* Central gear disk */}
      <GlassComponent outlineColor={lineCol} roughness={0.25}>
        <cylinderGeometry args={[0.7, 0.7, 0.12, 20]} />
      </GlassComponent>

      {/* Outer gear teeth */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 16;
        const x = Math.cos(angle) * 0.74;
        const z = Math.sin(angle) * 0.74;
        return (
          <mesh key={i} position={[x, 0, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.08, 0.09, 0.06]} />
            <meshBasicMaterial color={lineCol} />
          </mesh>
        );
      })}

      {/* Blue circuit nodes */}
      {Array.from({ length: 4 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 4;
        const x = Math.cos(angle) * 0.4;
        const z = Math.sin(angle) * 0.4;
        return (
          <mesh key={i} position={[x, 0.07, z]}>
            <cylinderGeometry args={[0.05, 0.05, 0.03, 8]} />
            <meshBasicMaterial color="#00f3ff" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

// 5. BASE CONSOLE (Bottom half of Alexa Robot)
export function CartoonAlexaBase({ isWhiteTheme, explodedProgress }: LayerProps) {
  const chipRef = useRef<THREE.Group>(null);

  const bodyColor = isWhiteTheme ? '#e2d5c3' : '#2e323b';
  const outlineColor = isWhiteTheme ? LINE_LIGHT : '#141312';
  const screenMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#08080a' }), []);
  const buttonBaseMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e6dfd5' }), []);
  const chipGlowMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f1c40f', toneMapped: false }), []);
  const ledThreeColor = useMemo(() => new THREE.Color(ACCENT_BLUE), []);

  useFrame(() => {
    // Processor chip slide up based on explodedProgress
    if (chipRef.current) {
      const targetZ = explodedProgress > 0.1 ? 0.15 : -0.05;
      chipRef.current.position.z = THREE.MathUtils.lerp(chipRef.current.position.z, targetZ, 0.08);
    }
  });

  return (
    <group>
      {/* Sliced Sphere Head (Bottom Half - slides down) */}
      <ToonMesh bodyColor={bodyColor} outlineColor={outlineColor} outlineThickness={1.4}>
        <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
      </ToonMesh>

      {/* Flat Cap at the top of bottom hemisphere */}
      <ToonMesh bodyColor={bodyColor} outlineColor={outlineColor} outlineThickness={1.4} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
      </ToonMesh>

      {/* Inside Motherboard/Processor cavity (visible only when split) */}
      {explodedProgress > 0.05 && (
        <group rotation={[0, 0, 0]} position={[0, 0.01, 0]}>
          {/* Circular motherboard plate */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.03, 32]} />
            <primitive object={buttonBaseMaterial} attach="material" />
          </mesh>

          {/* Solder wires */}
          <mesh position={[0.2, 0.02, -0.2]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.1, 0.015, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#ff5555" />
          </mesh>
          <mesh position={[-0.15, 0.02, 0.1]} rotation={[0, 0, -Math.PI / 4]}>
            <torusGeometry args={[0.12, 0.015, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#00f3ff" />
          </mesh>

          {/* Pop-up Processor Chip */}
          <group ref={chipRef} position={[0, -0.05, 0]}>
            <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.3, 0.05, 0.3]} />
              <primitive object={screenMaterial} attach="material" />
            </mesh>
            <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.15, 0.02, 0.15]} />
              <primitive object={chipGlowMaterial} attach="material" />
            </mesh>
          </group>
        </group>
      )}

      {/* Glowing Alexa Base LED ring */}
      <group position={[0, -0.96, 0]}>
        {/* LED Ring Torus */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.042, 8, 48]} />
          <meshBasicMaterial color={ledThreeColor} transparent opacity={0.8} toneMapped={false} />
        </mesh>
        
        {/* Flat Bottom Bezel Cover */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.69, 32]} />
          <primitive object={screenMaterial} attach="material" />
        </mesh>
      </group>
    </group>
  );
}

// 6. DETAILED GRID PLATFORM/PEDESTAL (Grid at bottom)
export function Pedestal({ outlineThickness = 1.3 }: { outlineThickness?: number }) {
  const outlineScale = 1.0 + outlineThickness * 0.015;

  const baseMaterial = useMemo(() => new THREE.MeshToonMaterial({ color: '#2b2a26' }), []);
  const outlineMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: '#141312', side: THREE.BackSide }), []);

  return (
    <group position={[0, -3.7, 0]}>
      {/* Heavy round base */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[2.5, 2.7, 0.2, 32]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>
      <mesh scale={[outlineScale, 1.05, outlineScale]}>
        <cylinderGeometry args={[2.5, 2.7, 0.2, 32]} />
        <primitive object={outlineMaterial} attach="material" />
      </mesh>

      {/* Stylized Grid pattern on top of the pedestal */}
      <gridHelper args={[4.8, 12, '#3a312a', '#1e1a17']} position={[0, 0.11, 0]} />
    </group>
  );
}

// 7. Core shaft (Central axis for vertical sliding)
export function CoreShaft({ isWhiteTheme }: { isWhiteTheme: boolean; explodedProgress: number }) {
  const lineCol = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  return (
    <group position={[0, 0, 0]}>
      <GlassComponent outlineColor={lineCol}>
        <cylinderGeometry args={[0.22, 0.22, 5.2, 24]} />
      </GlassComponent>
      {/* Inner copper/gold glowing coil */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.15, 5.0, 16]} />
        <meshBasicMaterial color="#ff9233" toneMapped={false} />
      </mesh>
    </group>
  );
}

// 8. Spinning Washers for internal technical detail
export function SpinningWashers({ isWhiteTheme }: { isWhiteTheme: boolean }) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const ref = useRef<THREE.InstancedMesh>(null);

  const placements = useMemo(() => {
    return Array.from({ length: 16 }, (_, i) => {
      const seed = i * 137.5;
      const y = -1.8 + ((seed % 360) / 100);
      const angle = (seed % 360) * (Math.PI / 180);
      const dist = 0.35 + ((seed % 30) / 100);
      return {
        position: new THREE.Vector3(Math.cos(angle) * dist, y, Math.sin(angle) * dist),
        phase: i * 0.4,
        speed: 0.8 + (i % 3) * 0.3 * (i % 2 === 0 ? 1 : -1),
      };
    });
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const obj = new THREE.Object3D();
    placements.forEach((p, i) => {
      obj.position.copy(p.position);
      obj.rotation.y = p.phase + t * p.speed;
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]}>
      <torusGeometry args={[0.08, 0.02, 6, 12]} />
      <meshPhysicalMaterial
        color="#ffffff"
        transmission={1}
        roughness={0.3}
        thickness={0.3}
        ior={1.5}
        clearcoat={0.8}
        clearcoatRoughness={0.1}
        attenuationColor={lineColor}
        attenuationDistance={0.5}
      />
    </instancedMesh>
  );
}
