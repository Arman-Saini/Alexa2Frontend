import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import { SCENARIOS } from '../demo/ScenarioDefs';
import { ROOM_BOUNDS } from '../../constants/roomBounds';

// Map scenario roomGlow keys → roomBounds keys
const ROOM_MAP: Record<string, string[]> = {
  kitchen:  ['kitchenDining'],
  bathroom: ['bathroom'],
  living:   ['livingRoom'],
  pooja:    ['masterBedroom'],
  office:   ['homeOffice'],
  all:      ['livingRoom', 'masterBedroom', 'bathroom', 'homeOffice', 'kitchenDining', 'hallway'],
};

function RoomGlowPlane({ roomId, color }: { roomId: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const bounds = ROOM_BOUNDS[roomId];
  if (!bounds) return null;

  const cx = (bounds.xMin + bounds.xMax) / 2;
  const cz = (bounds.zMin + bounds.zMax) / 2;
  const w  = bounds.xMax - bounds.xMin;
  const d  = bounds.zMax - bounds.zMin;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 2.4);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.06 + 0.07 * pulse;
  });

  return (
    <mesh ref={meshRef} position={[cx, 0.01, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RoomGlowRing({ roomId, color }: { roomId: string; color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const bounds = ROOM_BOUNDS[roomId];
  if (!bounds) return null;

  const cx = (bounds.xMin + bounds.xMax) / 2;
  const cz = (bounds.zMin + bounds.zMax) / 2;
  const r  = Math.min(bounds.xMax - bounds.xMin, bounds.zMax - bounds.zMin) * 0.48;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const pulse = 0.5 + 0.5 * Math.sin(clock.getElapsedTime() * 3.0 + 1.0);
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + 0.45 * pulse;
  });

  return (
    <mesh ref={meshRef} position={[cx, 0.015, cz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[r * 0.94, r, 48]} />
      <meshBasicMaterial color={color} transparent depthWrite={false} />
    </mesh>
  );
}

export function ScenarioReactor() {
  const activeScenarioId = useAppStore(s => s.activeScenarioId);

  const active = useMemo(
    () => activeScenarioId ? SCENARIOS.find(s => s.id === activeScenarioId) ?? null : null,
    [activeScenarioId]
  );

  if (!active) return null;

  const targetRooms = ROOM_MAP[active.roomGlow ?? ''] ?? [];
  const color = active.glowColor;

  return (
    <>
      {targetRooms.map(roomId => (
        <group key={roomId}>
          <RoomGlowPlane roomId={roomId} color={color} />
          <RoomGlowRing roomId={roomId} color={color} />
        </group>
      ))}
    </>
  );
}
