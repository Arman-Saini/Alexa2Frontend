import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

// Delightful, non-interactive easter eggs hidden in the home , they reward the judge
// for exploring and make the twin feel alive. Nothing here is an Alexa device; these
// never affect commands or state.

// Voxel/"pixelated" cube helper , flat-shaded blocks read as Minecraft-style pixel art.
function Vox({
  pos, size, color, rough = 0.8,
}: { pos: [number, number, number]; size: [number, number, number]; color: string; rough?: number }) {
  return (
    <mesh position={pos} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} metalness={0} flatShading />
    </mesh>
  );
}

// ── Pixelated German Shepherd , sits near the sofa, "watching TV" ──────────────
export function PixelDog() {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    // gentle breathing
    if (group.current) group.current.scale.y = 1 + Math.sin(t * 2) * 0.02;
    // happy tail wag
    if (tail.current) tail.current.rotation.y = Math.sin(t * 6) * 0.5;
    // occasional curious head tilt
    if (head.current) head.current.rotation.z = Math.sin(t * 0.7) * 0.08;
  });

  const TAN = '#C8923C';
  const DARK = '#2A2018';   // black saddle / ears / snout
  const LIGHT = '#E8C078';  // chest/paws highlight

  return (
    <group ref={group} scale={0.62}>
      {/* hind legs (tucked, sitting) */}
      <Vox pos={[-0.18, 0.12, 0.28]} size={[0.22, 0.24, 0.3]} color={TAN} />
      <Vox pos={[0.18, 0.12, 0.28]} size={[0.22, 0.24, 0.3]} color={TAN} />
      {/* body, leaning back as it sits */}
      <group rotation={[0.25, 0, 0]}>
        <Vox pos={[0, 0.5, 0.1]} size={[0.46, 0.62, 0.5]} color={TAN} />
        {/* dark saddle on the back */}
        <Vox pos={[0, 0.74, 0.12]} size={[0.48, 0.18, 0.4]} color={DARK} />
        {/* chest */}
        <Vox pos={[0, 0.42, -0.18]} size={[0.4, 0.42, 0.18]} color={LIGHT} />
      </group>
      {/* front legs (straight) */}
      <Vox pos={[-0.14, 0.2, -0.22]} size={[0.16, 0.42, 0.18]} color={TAN} />
      <Vox pos={[0.14, 0.2, -0.22]} size={[0.16, 0.42, 0.18]} color={TAN} />
      <Vox pos={[-0.14, 0.02, -0.28]} size={[0.18, 0.1, 0.26]} color={LIGHT} />
      <Vox pos={[0.14, 0.02, -0.28]} size={[0.18, 0.1, 0.26]} color={LIGHT} />
      {/* head */}
      <group ref={head} position={[0, 0.96, -0.18]}>
        <Vox pos={[0, 0, 0]} size={[0.34, 0.34, 0.34]} color={TAN} />
        {/* snout */}
        <Vox pos={[0, -0.06, -0.22]} size={[0.18, 0.16, 0.18]} color={DARK} />
        <Vox pos={[0, -0.04, -0.32]} size={[0.1, 0.08, 0.06]} color="#111" />
        {/* erect ears (the German Shepherd signature) */}
        <Vox pos={[-0.12, 0.26, 0.02]} size={[0.1, 0.22, 0.06]} color={DARK} />
        <Vox pos={[0.12, 0.26, 0.02]} size={[0.1, 0.22, 0.06]} color={DARK} />
        {/* eyes */}
        <Vox pos={[-0.09, 0.04, -0.18]} size={[0.05, 0.05, 0.04]} color="#0A0A0A" />
        <Vox pos={[0.09, 0.04, -0.18]} size={[0.05, 0.05, 0.04]} color="#0A0A0A" />
      </group>
      {/* bushy tail */}
      <group ref={tail} position={[0, 0.4, 0.34]}>
        <Vox pos={[0, 0.1, 0.12]} size={[0.14, 0.3, 0.16]} color={DARK} />
      </group>
    </group>
  );
}

// ── Robot vacuum , slowly patrols the living-room floor ───────────────────────
function RobotVacuum() {
  const ref = useRef<THREE.Group>(null);
  // Boustrophedon (lawn-mower) sweep across living room x[-3,13] z[-10,2]
  const path = [
    new THREE.Vector3(-1.5, 0, -9),
    new THREE.Vector3(11.5, 0, -9),
    new THREE.Vector3(11.5, 0, -7),
    new THREE.Vector3(-1.5, 0, -7),
    new THREE.Vector3(-1.5, 0, -5),
    new THREE.Vector3(11.5, 0, -5),
    new THREE.Vector3(11.5, 0, -3),
    new THREE.Vector3(-1.5, 0, -3),
    new THREE.Vector3(-1.5, 0, -1),
    new THREE.Vector3(11.5, 0, -1),
    new THREE.Vector3(11.5, 0, -9), // loop back
  ];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * 0.025) % 1;
    const seg = t * path.length;
    const i = Math.floor(seg);
    const f = seg - i;
    const a = path[i];
    const b = path[(i + 1) % path.length];
    ref.current.position.lerpVectors(a, b, f);
    ref.current.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  });

  return (
    <group ref={ref}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.08, 24]} />
        <meshStandardMaterial color="#1A1D24" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* status light */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 16]} />
        <meshStandardMaterial color="#00C8FF" emissive="#00C8FF" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  );
}

// ── Sleeping cat (loaf) , curled up on the bed ────────────────────────────────
export function SleepingCat() {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 1.6) * 0.03; // breathing
  });
  const GREY = '#6E6A66';
  const DARKGREY = '#4A4744';
  return (
    <group ref={ref} scale={0.5} rotation={[0, 0.6, 0]}>
      {/* loaf body */}
      <Vox pos={[0, 0.16, 0]} size={[0.5, 0.3, 0.36]} color={GREY} />
      {/* head */}
      <Vox pos={[0.28, 0.22, 0.04]} size={[0.22, 0.22, 0.24]} color={GREY} />
      {/* ears */}
      <Vox pos={[0.22, 0.38, -0.06]} size={[0.07, 0.1, 0.06]} color={DARKGREY} />
      <Vox pos={[0.22, 0.38, 0.12]} size={[0.07, 0.1, 0.06]} color={DARKGREY} />
      {/* tail curled around */}
      <Vox pos={[-0.24, 0.12, 0.16]} size={[0.34, 0.12, 0.12]} color={DARKGREY} />
    </group>
  );
}

// Hide an egg when the user has zoomed into a *different* room.
function RoomGated({ room, children, ...pos }: { room: string; children: React.ReactNode; position: [number, number, number] }) {
  const activeRoomId = useAppStore((s) => s.ui.activeRoomId);
  if (activeRoomId && activeRoomId !== room) return null;
  return <group position={pos.position}>{children}</group>;
}

export function EasterEggs() {
  return (
    <>
      {/* Robot vacuum patrolling the living room */}
      <RoomGated room="living-room" position={[0, 0, 0]}>
        <RobotVacuum />
      </RoomGated>
    </>
  );
}
