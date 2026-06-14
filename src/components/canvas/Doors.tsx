import { TOON_GRADIENT } from './ToonMaterial';

// Door frame + panel for a single doorway.
// pos: centre of the door gap (world space XZ), wallAxis: 'X' or 'Z'
// If wallAxis='Z', door is in a north-south wall (door swings along Z)
// If wallAxis='X', door is in an east-west wall (door swings along X)
function Door({
  x, z, wallAxis, swingDir = 1,
}: {
  x: number; z: number; wallAxis: 'X' | 'Z'; swingDir?: 1 | -1;
}) {
  const W = 0.9;   // door width
  const H = 2.1;   // door height
  const T = 0.12;  // wall/frame thickness
  const frameY = H / 2;
  const rotY = wallAxis === 'X' ? 0 : Math.PI / 2;

  // The door panel is slightly ajar (15°) for a lived-in feel
  const panelSwing = (Math.PI / 12) * swingDir;

  return (
    <group position={[x, 0, z]}>
      {/* Left frame post */}
      <mesh position={[-W / 2 - 0.06, frameY, 0]} rotation={[0, rotY, 0]} castShadow>
        <boxGeometry args={[0.12, H + 0.08, T + 0.04]} />
        <meshToonMaterial color="#6B4226" gradientMap={TOON_GRADIENT} />
      </mesh>
      {/* Right frame post */}
      <mesh position={[W / 2 + 0.06, frameY, 0]} rotation={[0, rotY, 0]} castShadow>
        <boxGeometry args={[0.12, H + 0.08, T + 0.04]} />
        <meshToonMaterial color="#6B4226" gradientMap={TOON_GRADIENT} />
      </mesh>
      {/* Top frame */}
      <mesh position={[0, H + 0.04, 0]} rotation={[0, rotY, 0]} castShadow>
        <boxGeometry args={[W + 0.24, 0.1, T + 0.04]} />
        <meshToonMaterial color="#6B4226" gradientMap={TOON_GRADIENT} />
      </mesh>

      {/* Door panel — hinged at left edge, slightly ajar */}
      <group position={[(-W / 2) * (wallAxis === 'X' ? 1 : 1), 0, 0]} rotation={[0, panelSwing, 0]}>
        <mesh position={[W / 2, H / 2, 0]} rotation={[0, rotY, 0]} castShadow receiveShadow>
          <boxGeometry args={[W, H, 0.04]} />
          <meshToonMaterial color="#8B5E3C" gradientMap={TOON_GRADIENT} />
        </mesh>
        {/* Panel inset detail */}
        {[H * 0.28, H * 0.68].map((py, i) => (
          <mesh key={i} position={[W / 2, py, 0.022]} rotation={[0, rotY, 0]}>
            <boxGeometry args={[W * 0.55, H * 0.28, 0.01]} />
            <meshToonMaterial color="#7A5030" gradientMap={TOON_GRADIENT} />
          </mesh>
        ))}
        {/* Knob */}
        <mesh position={[W * 0.82, H * 0.48, 0.045]} rotation={[0, rotY, 0]}>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshToonMaterial color="#C0A040" gradientMap={TOON_GRADIENT} />
        </mesh>
      </group>
    </group>
  );
}

// All doors in the house based on the room layout.
// Wall reference:
//   East-west walls (wallAxis='X'): z=0 divider, z=-8 north exterior, z=8 south exterior
//   North-south walls (wallAxis='Z'): x=-4, x=4, x=-12, x=12 exteriors
export function Doors() {
  return (
    <group>
      {/* ── Main Entrance — south exterior wall, living room ── */}
      <Door x={-7} z={-8} wallAxis="X" swingDir={1} />

      {/* ── Living Room ↔ Kitchen — interior wall at x=4 ── */}
      <Door x={4} z={-6} wallAxis="Z" swingDir={-1} />

      {/* ── Living Room ↔ Master Bedroom — interior wall at z=0 ── */}
      <Door x={-8} z={0} wallAxis="X" swingDir={1} />

      {/* ── Living Room ↔ Bathroom — interior wall at z=0 ── */}
      <Door x={0} z={0} wallAxis="X" swingDir={-1} />

      {/* ── Kitchen ↔ Office — interior wall at z=0 ── */}
      <Door x={8} z={0} wallAxis="X" swingDir={1} />

      {/* ── Master Bedroom ↔ Bathroom — interior wall at x=-4 ── */}
      <Door x={-4} z={5} wallAxis="Z" swingDir={1} />

      {/* ── Bathroom ↔ Office — interior wall at x=4 ── */}
      <Door x={4} z={5} wallAxis="Z" swingDir={-1} />
    </group>
  );
}
