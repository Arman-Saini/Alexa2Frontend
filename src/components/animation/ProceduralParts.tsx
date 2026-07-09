import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ---------------------------------------------------------------
// Hairline technical-drafting outline colors (theme-aware) and the
// two brand accents, reused across every glass part in this object.
// ---------------------------------------------------------------
const LINE_LIGHT = '#2E2B28';
const LINE_DARK = '#D9A98A';
const ACCENT_BLUE = '#3da5e0';
const ACCENT_EMBER = '#D99A44';

// ---------------------------------------------------------------
// SHARED: liquid-glass part — real transmission/refraction material
// (MeshPhysicalMaterial), plus a thin inverted-hull outline (same
// technique as the app's other toon-shaded parts: a duplicate mesh,
// scaled up slightly, BackSide-only) so edges stay legible against
// a transmissive fill instead of dissolving into the background.
// `roughness` controls clear (barrel/lens, ~0.05) vs frosted
// (gears/washers, ~0.35) glass.
// ---------------------------------------------------------------
export interface GlassPartProps {
  outlineColor: string;
  roughness?: number;
  outlineScale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  castShadow?: boolean;
  children: React.ReactElement;
}

export function GlassPart({
  outlineColor,
  roughness = 0.05,
  outlineScale = 1.015,
  position,
  rotation,
  castShadow,
  children,
}: GlassPartProps) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={castShadow}>
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
      <mesh scale={outlineScale}>
        {children}
        <meshBasicMaterial color={outlineColor} side={THREE.BackSide} transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

export interface LayerProps {
  isWhiteTheme: boolean;
  isHovered: boolean;
}

// ---------------------------------------------------------------
// Central shaft — fixed in place, the gear/lens layers slide along
// it (world X axis — the barrel lies on its side) as the barrel
// opens. Spans x=0 (Barrel Base) to x=6.2 (Lens Element fully
// expanded, see LAYERS in EngineAssembly.tsx), with margin.
// ---------------------------------------------------------------
export function CoreShaft({ isWhiteTheme }: { isWhiteTheme: boolean }) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  return (
    <GlassPart outlineColor={lineColor} position={[3.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.28, 0.28, 6.8, 24]} />
    </GlassPart>
  );
}

// ---------------------------------------------------------------
// LAYER (fixed anchor, doesn't move): Barrel Base — the tail-end
// housing. 4 thin grip-ridge rings for a milled-barrel read.
// ---------------------------------------------------------------
export function BarrelBase({ isWhiteTheme }: LayerProps) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const ridgeXs = [0.55, 0.95, 1.35, 1.75];

  return (
    <group>
      <GlassPart outlineColor={lineColor} position={[1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[1.2, 1.35, 2.4, 24]} />
      </GlassPart>
      {ridgeXs.map((x) => (
        <GlassPart key={x} outlineColor={lineColor} outlineScale={1.02} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[1.24, 1.24, 0.06, 24]} />
        </GlassPart>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------
// SHARED: one gear size — frosted-glass disk + a ring of small
// flat-shaded teeth (instanced), continuously rotating around the
// shaft (local X) at its own fixed speed, independent of scroll.
// ---------------------------------------------------------------
interface GearDiskConfig {
  radius: number;
  thickness: number;
  teethCount: number;
  teethSize: number;
  rotationSpeed: number;
  lineColor: string;
}

function GearDisk({ radius, thickness, teethCount, teethSize, rotationSpeed, lineColor }: GearDiskConfig) {
  const groupRef = useRef<THREE.Group>(null);
  const teethRef = useRef<THREE.InstancedMesh>(null);

  const teethMatrices = useMemo(() => {
    const matrices: THREE.Matrix4[] = [];
    const obj = new THREE.Object3D();
    for (let i = 0; i < teethCount; i++) {
      const angle = (i / teethCount) * Math.PI * 2;
      obj.position.set(0, Math.cos(angle) * radius, Math.sin(angle) * radius);
      obj.rotation.x = -angle;
      obj.updateMatrix();
      matrices.push(obj.matrix.clone());
    }
    return matrices;
  }, [teethCount, radius]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.x += delta * rotationSpeed;
    if (teethRef.current && !teethRef.current.userData.initialized) {
      teethMatrices.forEach((m, i) => teethRef.current!.setMatrixAt(i, m));
      teethRef.current.instanceMatrix.needsUpdate = true;
      teethRef.current.userData.initialized = true;
    }
  });

  return (
    <group ref={groupRef}>
      <GlassPart outlineColor={lineColor} roughness={0.35} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius, thickness, 20]} />
      </GlassPart>
      <instancedMesh ref={teethRef} args={[undefined, undefined, teethCount]} castShadow>
        <boxGeometry args={[teethSize * 0.8, teethSize * 1.4, teethSize]} />
        <meshBasicMaterial color={lineColor} />
      </instancedMesh>
    </group>
  );
}

// ---------------------------------------------------------------
// LAYER: Gear Small — deepest, closest to the Barrel Base. Fastest.
// ---------------------------------------------------------------
export function GearSmall({ isWhiteTheme }: LayerProps) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  return <GearDisk radius={0.65} thickness={0.16} teethCount={12} teethSize={0.1} rotationSpeed={0.6} lineColor={lineColor} />;
}

// ---------------------------------------------------------------
// LAYER: Gear Medium — mid-depth, counter-rotates against the others.
// ---------------------------------------------------------------
export function GearMedium({ isWhiteTheme }: LayerProps) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  return <GearDisk radius={0.9} thickness={0.2} teethCount={16} teethSize={0.13} rotationSpeed={-0.35} lineColor={lineColor} />;
}

// ---------------------------------------------------------------
// LAYER: Gear Large — closest to the lens cap. Biggest, slowest.
// ---------------------------------------------------------------
export function GearLarge({ isWhiteTheme }: LayerProps) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  return <GearDisk radius={1.15} thickness={0.24} teethCount={20} teethSize={0.15} rotationSpeed={0.22} lineColor={lineColor} />;
}

// ---------------------------------------------------------------
// Always-spinning small-gear texture between the 3 named gears —
// ambient clockwork detail, not a scroll-driven explode layer. Sits
// in the x=0.6..3.0 gap and never moves; only rotates.
// ---------------------------------------------------------------
export function SpinningWashers({ isWhiteTheme }: { isWhiteTheme: boolean }) {
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;
  const ref = useRef<THREE.InstancedMesh>(null);

  const placements = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const seed = i * 137.5; // golden-angle spread, deterministic
        const x = 0.6 + ((seed % 240) / 100);
        const angle = (seed % 360) * (Math.PI / 180);
        const dist = 0.15 + ((seed % 20) / 100);
        return {
          position: new THREE.Vector3(x, Math.cos(angle) * dist, Math.sin(angle) * dist),
          phase: i * 0.4,
          speed: 0.9 + (i % 4) * 0.3 * (i % 2 === 0 ? 1 : -1),
        };
      }),
    []
  );

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    const obj = new THREE.Object3D();
    placements.forEach((p, i) => {
      obj.position.copy(p.position);
      obj.rotation.x = p.phase + t * p.speed;
      obj.updateMatrix();
      ref.current!.setMatrixAt(i, obj.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, placements.length]}>
      <torusGeometry args={[0.09, 0.025, 6, 10]} />
      <meshPhysicalMaterial
        color="#ffffff"
        transmission={1}
        roughness={0.35}
        thickness={0.45}
        ior={1.5}
        clearcoat={1}
        clearcoatRoughness={0.08}
        attenuationColor={lineColor}
        attenuationDistance={0.6}
      />
    </instancedMesh>
  );
}

// ---------------------------------------------------------------
// LAYER (biggest explode travel): Lens Element — 3 concentric clear
// glass rings + 2 thin colored rim accents + a breathing glow core.
// This is what the scene opens on in close-up before the camera
// pulls back to the top view.
// ---------------------------------------------------------------
export function LensElement({ isWhiteTheme, isHovered }: LayerProps) {
  const glowRef = useRef<THREE.Mesh>(null);
  const lineColor = isWhiteTheme ? LINE_LIGHT : LINE_DARK;

  useFrame((state, delta) => {
    if (glowRef.current) {
      const breathe = 1.0 + Math.sin(state.clock.getElapsedTime() * 1.6) * 0.08;
      const target = breathe * (isHovered ? 1.15 : 1.0);
      const current = THREE.MathUtils.damp(glowRef.current.scale.x, target, 8, delta);
      glowRef.current.scale.setScalar(current);
    }
  });

  return (
    <group>
      <GlassPart outlineColor={lineColor} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.15, 0.1, 10, 32]} />
      </GlassPart>
      <GlassPart outlineColor={lineColor} position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.85, 0.09, 10, 28]} />
      </GlassPart>
      <GlassPart outlineColor={lineColor} position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.55, 0.55, 0.05, 32]} />
      </GlassPart>
      <mesh position={[0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[1.0, 0.015, 8, 40]} />
        <meshBasicMaterial color={ACCENT_BLUE} toneMapped={false} />
      </mesh>
      <mesh position={[0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.7, 0.012, 8, 40]} />
        <meshBasicMaterial color={ACCENT_EMBER} toneMapped={false} />
      </mesh>
      <mesh ref={glowRef} position={[0.26, 0, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshBasicMaterial color={ACCENT_BLUE} toneMapped={false} />
      </mesh>
    </group>
  );
}
