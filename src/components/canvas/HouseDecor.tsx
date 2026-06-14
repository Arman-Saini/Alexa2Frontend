import * as THREE from 'three';
import { TOON_GRADIENT } from './ToonMaterial';

// Suppress unused import warning — THREE is used via JSX mesh types implicitly
void (THREE.Color);

function mat(color: string, emissive = '#000', emissiveIntensity = 0) {
  return (
    <meshToonMaterial
      color={color}
      gradientMap={TOON_GRADIENT}
      emissive={emissive}
      emissiveIntensity={emissiveIntensity}
    />
  );
}

// ── Kitchen counter + stove + fridge ──────────────────────────────────────────
function KitchenFixtures() {
  return (
    <group>
      {/* Counter along north wall (z=-7.5) of kitchen, x[5,11] */}
      <mesh position={[8, 0.46, -7.3]} castShadow receiveShadow>
        <boxGeometry args={[5.5, 0.9, 0.7]} />
        {mat('#D7CCC8')}
      </mesh>
      {/* Countertop slab */}
      <mesh position={[8, 0.92, -7.3]} castShadow>
        <boxGeometry args={[5.5, 0.06, 0.72]} />
        {mat('#BCAAA4')}
      </mesh>
      {/* Sink basin */}
      <mesh position={[6.5, 0.84, -7.28]}>
        <boxGeometry args={[0.7, 0.14, 0.44]} />
        {mat('#90A4AE')}
      </mesh>
      {/* Tap */}
      <mesh position={[6.5, 1.04, -7.52]}>
        <cylinderGeometry args={[0.018, 0.018, 0.26, 8]} />
        {mat('#B0BEC5')}
      </mesh>
      <mesh position={[6.5, 1.18, -7.36]} rotation={[Math.PI / 2.5, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
        {mat('#B0BEC5')}
      </mesh>
      {/* Stove */}
      <mesh position={[9.2, 0.92, -7.28]}>
        <boxGeometry args={[0.7, 0.03, 0.56]} />
        {mat('#1a1a1a')}
      </mesh>
      {/* Burners */}
      {[[-0.18, -0.13], [0.18, -0.13], [-0.18, 0.13], [0.18, 0.13]].map(([bx, bz], i) => (
        <mesh key={i} position={[9.2 + bx, 0.945, -7.28 + bz]}>
          <cylinderGeometry args={[0.07, 0.07, 0.01, 12]} />
          {mat('#444')}
        </mesh>
      ))}
      {/* Chimney / exhaust hood */}
      <mesh position={[9.2, 1.6, -7.5]} castShadow>
        <boxGeometry args={[0.85, 0.5, 0.1]} />
        {mat('#9E9E9E')}
      </mesh>
      <mesh position={[9.2, 2.0, -7.5]}>
        <boxGeometry args={[0.4, 0.8, 0.08]} />
        {mat('#BDBDBD')}
      </mesh>
      {/* Fridge */}
      <mesh position={[11.2, 0.9, -6.5]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 1.82, 0.66]} />
        {mat('#E0E0E0')}
      </mesh>
      <mesh position={[11.2, 0.9, -6.16]}>
        <boxGeometry args={[0.6, 1.72, 0.02]} />
        {mat('#EEEEEE')}
      </mesh>
      {/* Fridge handle */}
      <mesh position={[11.1, 1.1, -6.14]}>
        <cylinderGeometry args={[0.012, 0.012, 0.28, 8]} />
        {mat('#9E9E9E')}
      </mesh>
    </group>
  );
}

// ── Bathroom: toilet + sink + vanity ─────────────────────────────────────────
function BathroomFixtures() {
  return (
    <group>
      {/* Toilet */}
      <mesh position={[3.2, 0.22, 1.2]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.44, 0.66]} />
        {mat('#F5F5F5')}
      </mesh>
      {/* Toilet tank */}
      <mesh position={[3.2, 0.58, 0.88]}>
        <boxGeometry args={[0.38, 0.38, 0.22]} />
        {mat('#F0F0F0')}
      </mesh>
      {/* Toilet seat */}
      <mesh position={[3.2, 0.46, 1.22]} rotation={[-0.1, 0, 0]}>
        <boxGeometry args={[0.38, 0.03, 0.52]} />
        {mat('#E8E8E8')}
      </mesh>

      {/* Vanity / sink unit */}
      <mesh position={[-3.2, 0.4, 0.9]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 0.82, 0.48]} />
        {mat('#D7CCC8')}
      </mesh>
      {/* Countertop */}
      <mesh position={[-3.2, 0.82, 0.9]}>
        <boxGeometry args={[0.72, 0.05, 0.5]} />
        {mat('#BCAAA4')}
      </mesh>
      {/* Basin */}
      <mesh position={[-3.2, 0.78, 0.9]}>
        <boxGeometry args={[0.42, 0.12, 0.3]} />
        {mat('#90A4AE')}
      </mesh>
      {/* Tap */}
      <mesh position={[-3.2, 0.98, 0.72]}>
        <cylinderGeometry args={[0.015, 0.015, 0.22, 8]} />
        {mat('#B0BEC5')}
      </mesh>
      {/* Mirror above vanity */}
      <mesh position={[-3.2, 1.45, 0.68]}>
        <boxGeometry args={[0.62, 0.7, 0.03]} />
        {mat('#CFD8DC')}
      </mesh>
      <mesh position={[-3.2, 1.45, 0.66]}>
        <boxGeometry args={[0.56, 0.64, 0.005]} />
        {mat('#E8F4F8', '#B0C8D8', 0.12)}
      </mesh>

      {/* Shower area — curtain rod */}
      <mesh position={[0, 2.5, 7.2]}>
        <cylinderGeometry args={[0.018, 0.018, 3.2, 8]} rotation={[0, 0, Math.PI / 2]} />
        {mat('#9E9E9E')}
      </mesh>
      {/* Shower head */}
      <mesh position={[0, 2.42, 7.6]}>
        <cylinderGeometry args={[0.06, 0.04, 0.12, 12]} />
        {mat('#B0BEC5')}
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
      {/* Bedside lamp left */}
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
      {/* Bedside lamp right */}
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
      {/* Rug inner pattern */}
      <mesh position={[-8, 0.006, 4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.8, 1.6]} />
        {mat('#7E57C2')}
      </mesh>
    </group>
  );
}

// ── Living room: rug under seating area ───────────────────────────────────────
function LivingRoomDecor() {
  return (
    <group>
      {/* Area rug under sofa + chairs */}
      <mesh position={[-4, 0.005, -4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.5, 3.5]} />
        {mat('#D32F2F')}
      </mesh>
      <mesh position={[-4, 0.006, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.8, 2.8]} />
        {mat('#B71C1C')}
      </mesh>
      {/* Inner rug pattern strip */}
      <mesh position={[-4, 0.007, -4.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 0.15]} />
        {mat('#FFCDD2')}
      </mesh>

      {/* Window — north wall of living room (z=-8) */}
      {/* Window frame */}
      <mesh position={[-9, 1.5, -7.96]} castShadow>
        <boxGeometry args={[1.4, 1.2, 0.08]} />
        {mat('#7B5E3A')}
      </mesh>
      {/* Glass */}
      <mesh position={[-9, 1.5, -7.92]}>
        <boxGeometry args={[1.22, 1.02, 0.02]} />
        <meshToonMaterial
          color="#B3E5FC"
          gradientMap={TOON_GRADIENT}
          emissive="#81D4FA"
          emissiveIntensity={0.15}
          transparent
          opacity={0.55}
        />
      </mesh>
      {/* Window cross */}
      <mesh position={[-9, 1.5, -7.9]}>
        <boxGeometry args={[1.2, 0.04, 0.02]} />
        {mat('#7B5E3A')}
      </mesh>
      <mesh position={[-9, 1.5, -7.9]}>
        <boxGeometry args={[0.04, 1.0, 0.02]} />
        {mat('#7B5E3A')}
      </mesh>

      {/* Window — east wall of living room (x=-12) */}
      <mesh position={[-11.96, 1.5, -5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1.4, 1.2, 0.08]} />
        {mat('#7B5E3A')}
      </mesh>
      <mesh position={[-11.92, 1.5, -5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.22, 1.02, 0.02]} />
        <meshToonMaterial
          color="#B3E5FC"
          gradientMap={TOON_GRADIENT}
          emissive="#81D4FA"
          emissiveIntensity={0.15}
          transparent
          opacity={0.55}
        />
      </mesh>
    </group>
  );
}

// ── Office: bookshelf detail + whiteboard ─────────────────────────────────────
function OfficeDecor() {
  return (
    <group>
      {/* Whiteboard on west wall */}
      <mesh position={[5.04, 1.4, 2.5]} rotation={[0, Math.PI / 2, 0]} castShadow>
        <boxGeometry args={[1.6, 0.9, 0.06]} />
        {mat('#ECEFF1')}
      </mesh>
      <mesh position={[5.06, 1.4, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.5, 0.8, 0.01]} />
        {mat('#F5F5F5', '#E3F2FD', 0.05)}
      </mesh>
      {/* Marker tray */}
      <mesh position={[5.05, 0.98, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[1.4, 0.06, 0.1]} />
        {mat('#B0BEC5')}
      </mesh>

      {/* Office rug */}
      <mesh position={[8, 0.005, 3]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.5, 2.5]} />
        {mat('#455A64')}
      </mesh>
      <mesh position={[8, 0.006, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.9, 1.9]} />
        {mat('#546E7A')}
      </mesh>
    </group>
  );
}

// ── India context: Tulsi plant in living room corner + prayer corner ──────────
function IndiaDecor() {
  return (
    <group>
      {/* Tulsi pot — terracotta stand near living room entrance */}
      <mesh position={[2.5, 0.22, -1.2]} castShadow>
        <cylinderGeometry args={[0.14, 0.1, 0.44, 10]} />
        <meshToonMaterial color="#B5451B" gradientMap={TOON_GRADIENT} />
      </mesh>
      <mesh position={[2.5, 0.52, -1.2]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshToonMaterial color="#2E7D32" gradientMap={TOON_GRADIENT} />
      </mesh>
      {/* Multiple small leaves */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const a = (deg * Math.PI) / 180;
        return (
          <mesh key={i} position={[2.5 + Math.cos(a) * 0.14, 0.54, -1.2 + Math.sin(a) * 0.14]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshToonMaterial color="#388E3C" gradientMap={TOON_GRADIENT} />
          </mesh>
        );
      })}

      {/* Prayer corner / Mandir shelf — master bedroom corner */}
      <mesh position={[-11.2, 1.2, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.06, 0.36]} />
        <meshToonMaterial color="#C8860A" gradientMap={TOON_GRADIENT} />
      </mesh>
      {/* Small idol shape */}
      <mesh position={[-11.2, 1.32, 0.8]}>
        <cylinderGeometry args={[0.04, 0.05, 0.18, 8]} />
        <meshToonMaterial color="#DAA520" gradientMap={TOON_GRADIENT} emissive="#A07010" emissiveIntensity={0.3} />
      </mesh>
      {/* Diya (lamp) */}
      <mesh position={[-11.0, 1.28, 0.7]}>
        <cylinderGeometry args={[0.04, 0.055, 0.04, 10]} />
        <meshToonMaterial color="#C8860A" gradientMap={TOON_GRADIENT} />
      </mesh>
      <mesh position={[-11.0, 1.32, 0.7]}>
        <sphereGeometry args={[0.018, 6, 6]} />
        <meshToonMaterial color="#FFF176" gradientMap={TOON_GRADIENT} emissive="#FFD600" emissiveIntensity={1.2} />
      </mesh>

      {/* Water cooler in kitchen */}
      <mesh position={[5.5, 0.5, -7.2]} castShadow receiveShadow>
        <boxGeometry args={[0.36, 1.0, 0.36]} />
        <meshToonMaterial color="#E0E0E0" gradientMap={TOON_GRADIENT} />
      </mesh>
      <mesh position={[5.5, 1.05, -7.2]}>
        <cylinderGeometry args={[0.14, 0.14, 0.24, 12]} />
        <meshToonMaterial color="#B3E5FC" gradientMap={TOON_GRADIENT} transparent opacity={0.7} />
      </mesh>

      {/* Water dispenser taps */}
      {[-0.07, 0.07].map((x, i) => (
        <mesh key={i} position={[5.5 + x, 0.68, -7.0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.1, 6]} />
          <meshToonMaterial color={i === 0 ? '#EF9A9A' : '#90CAF9'} gradientMap={TOON_GRADIENT} />
        </mesh>
      ))}
    </group>
  );
}

export function HouseDecor() {
  return (
    <group>
      <KitchenFixtures />
      <BathroomFixtures />
      <BedroomDecor />
      <LivingRoomDecor />
      <OfficeDecor />
      <IndiaDecor />
    </group>
  );
}
