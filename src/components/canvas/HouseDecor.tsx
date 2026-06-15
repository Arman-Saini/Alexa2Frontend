import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import layout from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { resolveAnchor } from '../../utils/anchorResolver';
import { Curtain } from './Curtains';

function mat(color: string, emissive = '#000', emissiveIntensity = 0, roughness = 0.75, metalness = 0.05) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

// ── Anchor-driven window components ──────────────────────────────────────────
const WIN_Y = 1.7; // center height on 3.5m wall

function ArchWindow({ x, z, rotY, model }: { x: number; z: number; rotY: number; model: string }) {
  const isLarge = model === 'WindowLarge';
  const W = isLarge ? 1.6 : 1.0;
  const H = 1.3;
  return (
    <group position={[x, WIN_Y, z]} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[W + 0.14, H + 0.14, 0.1]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[W, H, 0.02]} />
        <meshStandardMaterial color="#B3DEF5" emissive="#90C8E8" emissiveIntensity={0.3} transparent opacity={0.55} />
      </mesh>
      {/* Horizontal mullion */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[W, 0.045, 0.045]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      {/* Vertical mullion */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.045, H, 0.045]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      <Curtain width={W} />
    </group>
  );
}

function Windows() {
  const wins: React.ReactElement[] = [];
  for (const [roomId, roomDef] of Object.entries(layout.rooms)) {
    const bounds = ROOM_BOUNDS[roomId];
    if (!bounds) continue;
    const windowDefs = (roomDef as { windows: Array<{ id: string; wall: string; along: number; model: string; anchor: { type: string; wall: string; along: number } }> }).windows;
    for (const win of windowDefs) {
      const anchor = { type: 'wall' as const, wall: win.anchor.wall as 'W1' | 'W2' | 'W3' | 'W4', along: win.anchor.along };
      const [x, , z] = resolveAnchor(anchor, bounds, { distFromWall: 0 });
      const wall = win.anchor.wall;
      const rotY = wall === 'W2' ? -Math.PI / 2
                 : wall === 'W4' ?  Math.PI / 2
                 : wall === 'W3' ?  Math.PI : 0;
      const modelName = win.model.replace(/^quat:/, '');
      wins.push(<ArchWindow key={win.id} x={x} z={z} rotY={rotY} model={modelName} />);
    }
  }
  return <group>{wins}</group>;
}

// ── Kitchen counter + stove + fridge ──────────────────────────────────────────
function KitchenFixtures() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);
  const kitchenHot = activeScenarioId === 'jeera' || activeScenarioId === 'pressure';
  const burnerRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([null, null, null, null]);

  useFrame(({ clock }) => {
    if (!kitchenHot) {
      burnerRefs.current.forEach(m => { if (m) m.emissiveIntensity = 0; });
      return;
    }
    const t = Math.abs(Math.sin(clock.getElapsedTime() * 7));
    // jeera = full-burn orange-red, pressure = controlled cooking amber
    const base = activeScenarioId === 'jeera' ? 1.8 : 0.9;
    const amp  = activeScenarioId === 'jeera' ? 2.0 : 1.0;
    burnerRefs.current.forEach(m => { if (m) m.emissiveIntensity = base + t * amp; });
  });

  const burnerColor = activeScenarioId === 'jeera'    ? '#FF3300'
                    : activeScenarioId === 'pressure' ? '#FF8800'
                    : '#000';

  return (
    <group>
      {/* Stove top surface — sits on top of the GLB stove unit */}
      <mesh position={[8.1, 0.94, 2.4]}>
        <boxGeometry args={[0.7, 0.02, 0.55]} />
        {mat('#1A1A1A')}
      </mesh>
      {/* Burners — emissive controlled by useFrame */}
      {([[-0.15, -0.11], [0.15, -0.11], [-0.15, 0.11], [0.15, 0.11]] as [number,number][]).map(([bx, bz], i) => (
        <mesh key={i} position={[8.1 + bx, 0.955, 2.4 + bz]}>
          <cylinderGeometry args={[0.06, 0.06, 0.01, 12]} />
          <meshStandardMaterial
            ref={(m) => { burnerRefs.current[i] = m; }}
            color={kitchenHot ? '#FF6600' : '#444'}
            emissive={burnerColor}
            emissiveIntensity={kitchenHot ? 1.5 : 0}
            roughness={0.6}
          />
        </mesh>
      ))}
      {/* Exhaust hood / chimney above stove at x≈8.1 */}
      <mesh position={[8.1, 1.62, 2.18]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.12]} />
        {mat('#9E9E9E')}
      </mesh>
      <mesh position={[8.1, 2.1, 2.16]}>
        <boxGeometry args={[0.45, 0.9, 0.1]} />
        {mat('#BDBDBD')}
      </mesh>
      {/* Wall cabinets — left of chimney and right side */}
      <mesh position={[6.5, 1.9, 2.2]} castShadow>
        <boxGeometry args={[2.5, 0.65, 0.38]} />
        {mat('#C8B8B0')}
      </mesh>
      <mesh position={[9.5, 1.9, 2.2]} castShadow>
        <boxGeometry args={[2.0, 0.65, 0.38]} />
        {mat('#C8B8B0')}
      </mesh>
      {/* Cabinet divider lines */}
      {[5.3, 6.5, 7.7, 8.6, 9.6, 10.5].map((cx, i) => (
        <mesh key={i} position={[cx, 1.9, 2.39]}>
          <boxGeometry args={[0.03, 0.65, 0.02]} />
          {mat('#A09090')}
        </mesh>
      ))}
      {/* Fridge against east wall (W2) — x=13 */}
      <mesh position={[12.2, 0.9, 3.4]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.82, 0.72]} />
        {mat('#E0E0E0')}
      </mesh>
      <mesh position={[12.2, 0.9, 3.76]}>
        <boxGeometry args={[0.65, 1.72, 0.02]} />
        {mat('#EEEEEE')}
      </mesh>
      <mesh position={[12.1, 1.1, 3.78]}>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
        {mat('#9E9E9E')}
      </mesh>
    </group>
  );
}

// ── Bathroom: compact fixtures all in left half (x ≤ 0) ──────────────────────
function BathroomFixtures() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);
  const geyserActive = activeScenarioId === 'geyser';
  const geyserRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!geyserRef.current) return;
    if (geyserActive) {
      geyserRef.current.emissiveIntensity = 1.5 + Math.abs(Math.sin(clock.getElapsedTime() * 5)) * 2.5;
    } else {
      geyserRef.current.emissiveIntensity = 0;
    }
  });

  return (
    <group>
      {/* Toilet , against east wall (x≈0), facing west */}
      <mesh position={[-0.5, 0.22, 1.5]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.44, 0.66]} />
        {mat('#F5F5F5')}
      </mesh>
      <mesh position={[-0.5, 0.58, 1.18]}>
        <boxGeometry args={[0.38, 0.38, 0.22]} />
        {mat('#F0F0F0')}
      </mesh>
      <mesh position={[-0.5, 0.46, 1.52]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.38, 0.03, 0.52]} />
        {mat('#E8E8E8')}
      </mesh>
      {/* Vanity */}
      <mesh position={[-3.2, 0.4, 3.2]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.82, 0.48]} />
        {mat('#D7CCC8')}
      </mesh>
      <mesh position={[-3.2, 0.82, 3.2]}>
        <boxGeometry args={[0.72, 0.05, 0.5]} />
        {mat('#BCAAA4')}
      </mesh>
      <mesh position={[-3.2, 0.78, 3.2]}>
        <boxGeometry args={[0.42, 0.12, 0.3]} />
        {mat('#90A4AE')}
      </mesh>
      <mesh position={[-3.2, 0.98, 3.0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        {mat('#B0BEC5')}
      </mesh>
      <mesh position={[-3.2, 1.45, 2.96]}>
        <boxGeometry args={[0.62, 0.7, 0.03]} />
        {mat('#CFD8DC')}
      </mesh>
      <mesh position={[-3.2, 1.45, 2.94]}>
        <boxGeometry args={[0.56, 0.64, 0.005]} />
        {mat('#E8F4F8', '#B0C8D8', 0.12)}
      </mesh>
      {/* Shower pipe */}
      <mesh position={[-2.0, 2.5, 7.2]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 3.2, 8]} />
        {mat('#9E9E9E')}
      </mesh>
      {/* Shower head , glows red when geyser scenario is active */}
      <mesh position={[-2.0, 2.42, 7.6]}>
        <cylinderGeometry args={[0.06, 0.04, 0.12, 12]} />
        <meshStandardMaterial
          ref={geyserRef}
          color={geyserActive ? '#FF4422' : '#B0BEC5'}
          emissive="#FF2200"
          emissiveIntensity={0}
          roughness={0.5}
        />
      </mesh>
      {/* Geyser unit on wall , small box above shower, indicates hot water */}
      <mesh position={[-1.6, 2.1, 7.8]} castShadow>
        <boxGeometry args={[0.28, 0.28, 0.16]} />
        <meshStandardMaterial
          color={geyserActive ? '#FF6644' : '#EEEEEE'}
          emissive={geyserActive ? '#FF2200' : '#000'}
          emissiveIntensity={geyserActive ? 1.2 : 0}
          roughness={0.6}
        />
      </mesh>
      {/* Shower tray */}
      <mesh position={[-2.0, 0.02, 7.0]} receiveShadow>
        <boxGeometry args={[1.6, 0.04, 1.6]} />
        {mat('#E8E8E8')}
      </mesh>
    </group>
  );
}

// ── Bedroom: nightstands + rug ────────────────────────────────────────────────
function BedroomDecor() {
  return (
    <group>
      {/* Nightstand left */}
      <mesh position={[-9.2, 0.32, 6.5]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.62, 0.46]} />
        {mat('#6D4C41')}
      </mesh>
      <mesh position={[-9.2, 0.64, 6.5]}>
        <boxGeometry args={[0.52, 0.04, 0.48]} />
        {mat('#5D3C31')}
      </mesh>
      <mesh position={[-9.2, 0.82, 6.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        {mat('#BCAAA4')}
      </mesh>
      <mesh position={[-9.2, 1.06, 6.5]}>
        <cylinderGeometry args={[0.12, 0.07, 0.22, 12]} />
        {mat('#FFF9C4', '#FFEE58', 0.4)}
      </mesh>
      {/* Nightstand right */}
      <mesh position={[-6.8, 0.32, 6.5]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.62, 0.46]} />
        {mat('#6D4C41')}
      </mesh>
      <mesh position={[-6.8, 0.64, 6.5]}>
        <boxGeometry args={[0.52, 0.04, 0.48]} />
        {mat('#5D3C31')}
      </mesh>
      <mesh position={[-6.8, 0.82, 6.5]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3, 8]} />
        {mat('#BCAAA4')}
      </mesh>
      <mesh position={[-6.8, 1.06, 6.5]}>
        <cylinderGeometry args={[0.12, 0.07, 0.22, 12]} />
        {mat('#FFF9C4', '#FFEE58', 0.4)}
      </mesh>
      {/* Bedroom rug */}
      <mesh position={[-8, 0.005, 4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.5, 2.2]} />
        {mat('#9575CD')}
      </mesh>
      <mesh position={[-8, 0.006, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.6]} />
        {mat('#7E57C2')}
      </mesh>
      {/* Dresser */}
      <mesh position={[-5.5, 0.48, 0.8]} castShadow receiveShadow>
        <boxGeometry args={[0.9, 0.96, 0.48]} />
        {mat('#6D4C41')}
      </mesh>
      <mesh position={[-5.5, 0.96, 0.8]}>
        <boxGeometry args={[0.92, 0.04, 0.5]} />
        {mat('#5D3C31')}
      </mesh>
      {[0.24, 0, -0.24].map((dy, i) => (
        <mesh key={i} position={[-5.1, 0.48 + dy, 0.8]}>
          <boxGeometry args={[0.02, 0.04, 0.22]} />
          {mat('#B0A090')}
        </mesh>
      ))}
    </group>
  );
}

// ── Living room: rug + decor ──────────────────────────────────────────────────
function LivingRoomDecor() {
  return (
    <group>
      <mesh position={[-4, 0.005, -4.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5.5, 4.0]} />
        {mat('#D32F2F')}
      </mesh>
      <mesh position={[-4, 0.006, -4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.8, 3.3]} />
        {mat('#B71C1C')}
      </mesh>
      <mesh position={[-4, 0.007, -4.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.0, 0.15]} />
        {mat('#FFCDD2')}
      </mesh>
    </group>
  );
}

// ── Office: whiteboard + rug ──────────────────────────────────────────────────
function OfficeDecor() {
  return (
    <group>
      <mesh position={[5.04, 1.4, 3.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[2.0, 1.1, 0.06]} />
        {mat('#ECEFF1')}
      </mesh>
      <mesh position={[5.06, 1.4, 3.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.88, 0.98, 0.01]} />
        {mat('#F5F5F5', '#E3F2FD', 0.05)}
      </mesh>
      <mesh position={[5.05, 0.88, 3.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.8, 0.06, 0.12]} />
        {mat('#B0BEC5')}
      </mesh>
      <mesh position={[8, 0.005, 3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.0, 3.0]} />
        {mat('#455A64')}
      </mesh>
      <mesh position={[8, 0.006, 3.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.4, 2.4]} />
        {mat('#546E7A')}
      </mesh>
      <mesh position={[9.8, 0.96, 1.5]} castShadow>
        <boxGeometry args={[0.72, 0.58, 0.1]} />
        {mat('#1A1A1A')}
      </mesh>
      <mesh position={[9.8, 0.68, 1.5]}>
        <cylinderGeometry args={[0.04, 0.06, 0.2, 8]} />
        {mat('#222')}
      </mesh>
    </group>
  );
}

// ── India context: Tulsi plant + prayer corner ────────────────────────────────
function IndiaDecor() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);
  const diyaRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (!diyaRef.current) return;
    if (activeScenarioId === 'pooja') {
      // Bright flickering devotional flame
      diyaRef.current.emissiveIntensity = 3.0 + Math.abs(Math.sin(clock.getElapsedTime() * 4.5)) * 2.5;
    } else {
      diyaRef.current.emissiveIntensity = 1.2;
    }
  });

  return (
    <group>
      {/* Tulsi pot */}
      <mesh position={[2.5, 0.22, -1.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.1, 0.44, 10]} />
        <meshStandardMaterial color="#B5451B" roughness={0.8} />
      </mesh>
      <mesh position={[2.5, 0.52, -1.2]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#2E7D32" roughness={0.8} />
      </mesh>
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[2.5 + Math.cos(a) * 0.14, 0.54, -1.2 + Math.sin(a) * 0.14]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshStandardMaterial color="#388E3C" roughness={0.75} />
          </mesh>
        );
      })}

      {/* Prayer shelf */}
      <mesh position={[-11.2, 1.2, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.36]} />
        <meshStandardMaterial color="#C8860A" roughness={0.75} />
      </mesh>
      <mesh position={[-11.2, 1.32, 0.8]}>
        <cylinderGeometry args={[0.04, 0.05, 0.18, 8]} />
        <meshStandardMaterial color="#DAA520" emissive="#A07010" emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
      {/* Diya base */}
      <mesh position={[-11.0, 1.28, 0.7]}>
        <cylinderGeometry args={[0.04, 0.055, 0.04, 10]} />
        <meshStandardMaterial color="#C8860A" roughness={0.75} />
      </mesh>
      {/* Diya flame , animates on pooja scenario */}
      <mesh position={[-11.0, 1.32, 0.7]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshStandardMaterial
          ref={diyaRef}
          color="#FFF176"
          emissive="#FFD600"
          emissiveIntensity={1.2}
          roughness={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Marigold flower petals near prayer shelf */}
      {([[-0.08, 0.06], [0.08, 0.06], [-0.12, 0.12], [0.12, 0.12]] as [number,number][]).map(([dx, dz], i) => (
        <mesh key={i} position={[-11.0 + dx, 1.26, 0.7 + dz]}>
          <sphereGeometry args={[0.022, 6, 6]} />
          <meshStandardMaterial color="#FF9500" emissive="#FF6000" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Water cooler in kitchen */}
      <mesh position={[5.5, 0.5, -7.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 1.0, 0.36]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.75} />
      </mesh>
      <mesh position={[5.5, 1.05, -7.2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.24, 12]} />
      </mesh>
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={i} position={[5.5 + x, 0.68, -7.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 6]} />
        </mesh>
      ))}
    </group>
  );
}

export function HouseDecor() {
  return (
    <group>
      <Windows />
      <KitchenFixtures />
      <BathroomFixtures />
      <BedroomDecor />
      <LivingRoomDecor />
      <OfficeDecor />
      <IndiaDecor />
    </group>
  );
}
