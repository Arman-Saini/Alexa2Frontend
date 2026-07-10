import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { onInteraction } from '../../store/interactionEvents';
import { useAppStore } from '../../store/store';
import { TOON_GRADIENT } from './ToonMaterial';

const PATROL_DURATION_MS = 6000;

/**
 * Standalone disc mesh for the robot vacuum — not part of the PlacedObject
 * registry (the vacuum is tracked as a plain vacuumOn boolean in store.ts,
 * driven by voice commands like "start the vacuum"). Docked at a fixed spot
 * in the living room; turning it on drives it around a small loop, then it
 * returns to dock.
 */
export function RobotVacuum() {
  const rooms = useAppStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === 'living-room');
  const groupRef = useRef<THREE.Group>(null);
  const [patrolling, setPatrolling] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = onInteraction((event) => {
      if (event.type === 'vacuum:patrol') {
        startRef.current = performance.now();
        setPatrolling(true);
      }
    });
    return unsubscribe;
  }, []);

  if (!room) return null;

  const hw = room.width / 2 * 0.6;
  const hd = room.depth / 2 * 0.6;
  const dockX = room.position.x + hw;
  const dockZ = room.position.z + hd;
  const waypoints: [number, number][] = [
    [dockX, dockZ],
    [room.position.x - hw, room.position.z + hd],
    [room.position.x - hw, room.position.z - hd],
    [room.position.x + hw, room.position.z - hd],
  ];

  useFrame(() => {
    if (!groupRef.current) return;
    if (!patrolling) {
      groupRef.current.position.set(dockX, 0.05, dockZ);
      return;
    }
    const elapsed = performance.now() - startRef.current;
    if (elapsed >= PATROL_DURATION_MS) {
      setPatrolling(false);
      return;
    }
    const legDuration = PATROL_DURATION_MS / waypoints.length;
    const legIndex = Math.floor(elapsed / legDuration) % waypoints.length;
    const nextIndex = (legIndex + 1) % waypoints.length;
    const legT = (elapsed % legDuration) / legDuration;
    const [fx, fz] = waypoints[legIndex];
    const [tx, tz] = waypoints[nextIndex];
    groupRef.current.position.set(fx + (tx - fx) * legT, 0.05, fz + (tz - fz) * legT);
  });

  return (
    <group ref={groupRef} position={[dockX, 0.05, dockZ]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 24]} />
        <meshToonMaterial color="#2A2A2E" gradientMap={TOON_GRADIENT} />
      </mesh>
    </group>
  );
}
