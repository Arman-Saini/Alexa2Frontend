import { useRef } from 'react';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import type { Room } from '../../types';

// Scenario → rooms that get a colored floor tint overlay
const SCENARIO_TINTS: Record<string, { rooms: string[]; color: string; maxOpacity: number }> = {
  jeera:    { rooms: ['kitchen'],                                                             color: '#FF6600', maxOpacity: 0.22 },
  pressure: { rooms: ['kitchen'],                                                             color: '#22FF88', maxOpacity: 0.15 },
  grid:     { rooms: ['living-room','kitchen','master-bedroom','bathroom','office'],           color: '#FF0000', maxOpacity: 0.20 },
  pooja:    { rooms: ['master-bedroom'],                                                      color: '#FFB020', maxOpacity: 0.22 },
  geyser:   { rooms: ['bathroom'],                                                            color: '#FF2200', maxOpacity: 0.28 },
  away:     { rooms: ['living-room'],                                                         color: '#00C8FF', maxOpacity: 0.18 },
};

// Warm Indian home floor palettes , deepened for the dark cinematic mood so the
// warm pendants, device glow and room orbs read against a rich (not bright) floor.
const FLOOR_PALETTES: Record<string, { floor: string; active: string; accent: string }> = {
  'living-room':    { floor: '#5A4632', active: '#806546', accent: '#6A523A' },
  kitchen:          { floor: '#565243', active: '#7A7460', accent: '#6A6452' },
  'master-bedroom': { floor: '#473729', active: '#65503A', accent: '#564636' },
  bathroom:         { floor: '#52565C', active: '#727880', accent: '#5E646A' },
  office:           { floor: '#4E4634', active: '#6E6448', accent: '#5C5440' },
};

interface RoomMeshProps {
  room: Room;
  isActive: boolean;
  isHovered: boolean;
}

export function RoomMesh({ room, isActive, isHovered }: RoomMeshProps) {
  const groupRef   = useRef<THREE.Group>(null);
  const floorRef   = useRef<THREE.MeshStandardMaterial>(null);
  const tintRef    = useRef<THREE.MeshBasicMaterial>(null);

  const { setActiveRoom, setHoveredRoom, ui } = useAppStore();
  const activeScenarioId = useAppStore(s => s.activeScenarioId);
  const { activeRoomId } = ui;

  const hw = room.width  / 2;
  const hd = room.depth  / 2;

  const palette = FLOOR_PALETTES[room.id] ?? { floor: room.floorColor, active: '#4a90d9', accent: '#888' };

  // Determine if this room has a scenario tint active
  const scenarioTint = activeScenarioId ? SCENARIO_TINTS[activeScenarioId] ?? null : null;
  const isTintTarget = scenarioTint ? scenarioTint.rooms.includes(room.id) : false;
  const tintColor    = scenarioTint?.color ?? '#FFFFFF';
  const tintTarget   = isTintTarget ? scenarioTint!.maxOpacity : 0;

  // "Sink" targets: non-active rooms drop below floor when another room is active
  const hasOtherActive = !!activeRoomId && !isActive;
  const targetY  = hasOtherActive ? -0.5 : 0;
  // Floor opacity: dim non-active rooms; full for active or overview
  const targetOp = hasOtherActive ? 0.12 : 1.0;

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-0.012 * 60 * delta);
    if (groupRef.current) {
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * t;
    }
    if (floorRef.current) {
      floorRef.current.opacity += (targetOp - floorRef.current.opacity) * t;
    }
    if (tintRef.current) {
      tintRef.current.opacity += (tintTarget - tintRef.current.opacity) * t;
      if (isTintTarget) {
        tintRef.current.color.set(tintColor);
      }
    }
  });

  const floorColor = isActive ? palette.active : isHovered ? palette.accent : palette.floor;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (ui.isPlacementMode) return;
    e.stopPropagation();
    setActiveRoom(isActive ? null : room.id);
  };
  const handleOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredRoom(room.id);
    document.body.style.cursor = 'pointer';
  };
  const handleOut = () => {
    setHoveredRoom(null);
    document.body.style.cursor = 'default';
  };

  return (
    <group ref={groupRef} position={[room.position.x, room.position.y, room.position.z]}>

      {/* ── Floor ──────────────────────────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial
          ref={floorRef}
          color={floorColor}
          roughness={0.9}
          metalness={0.0}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Scenario tint overlay , always mounted so opacity can animate smoothly */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshBasicMaterial
          ref={tintRef}
          color={tintColor}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Active glow ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[Math.min(hw, hd) * 0.42, Math.min(hw, hd) * 0.55, 48]} />
          <meshBasicMaterial color="#00C8FF" transparent opacity={0.35} />
        </mesh>
      )}

      {/* Hover highlight */}
      {isHovered && !isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <planeGeometry args={[room.width, room.depth]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.07} />
        </mesh>
      )}
    </group>
  );
}
