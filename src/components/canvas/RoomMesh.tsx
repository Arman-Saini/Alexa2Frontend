import { useRef, useMemo } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import type { Room } from '../../types';

interface RoomMeshProps {
  room: Room;
  isActive: boolean;
  isHovered: boolean;
}

export function RoomMesh({ room, isActive, isHovered }: RoomMeshProps) {
  const { setActiveRoom, setHoveredRoom, ui, placedObjects } = useAppStore();
  const floorRef = useRef<THREE.Mesh>(null);
  const wallH = room.height;
  const hw = room.width / 2;
  const hd = room.depth / 2;

  // Count active devices in room
  const deviceCount = placedObjects.filter(
    (o) => o.isAlexaDevice && o.parentRoomId === room.id && o.alexaDeviceState.isOn
  ).length;

  const totalWatts = useMemo(
    () =>
      placedObjects
        .filter((o) => o.isAlexaDevice && o.parentRoomId === room.id && o.alexaDeviceState.isOn)
        .reduce((s, o) => s + (o.alexaDeviceState.powerConsumption ?? 0), 0),
    [placedObjects, room.id]
  );

  // Floor color
  const floorColor = isActive ? '#2a3a5e' : isHovered ? '#1e2d4a' : room.floorColor + '88';
  const wallColor = isActive ? '#00A8E0' : '#ffffff';
  const wallOpacity = isActive ? 0.12 : isHovered ? 0.1 : 0.06;
  const edgeOpacity = isActive ? 0.7 : isHovered ? 0.45 : 0.25;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (ui.isPlacementMode) return;
    e.stopPropagation();
    setActiveRoom(isActive ? null : room.id);
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredRoom(room.id);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHoveredRoom(null);
    document.body.style.cursor = 'default';
  };

  return (
    <group position={[room.position.x, room.position.y, room.position.z]}>
      {/* Floor */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial
          color={floorColor}
          roughness={0.85}
          metalness={0.05}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Floor border / highlight frame */}
      {(isActive || isHovered) && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <planeGeometry args={[room.width, room.depth]} />
          <meshBasicMaterial
            color={isActive ? '#00A8E0' : '#6699cc'}
            transparent
            opacity={isActive ? 0.12 : 0.06}
          />
        </mesh>
      )}

      {/* Walls — 4 faces */}
      {/* North */}
      <mesh position={[0, wallH / 2, -hd]} receiveShadow>
        <boxGeometry args={[room.width + 0.05, wallH, 0.06]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} roughness={0.9} />
      </mesh>
      {/* South */}
      <mesh position={[0, wallH / 2, hd]} receiveShadow>
        <boxGeometry args={[room.width + 0.05, wallH, 0.06]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} roughness={0.9} />
      </mesh>
      {/* West */}
      <mesh position={[-hw, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.06, wallH, room.depth]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} roughness={0.9} />
      </mesh>
      {/* East */}
      <mesh position={[hw, wallH / 2, 0]} receiveShadow>
        <boxGeometry args={[0.06, wallH, room.depth]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} roughness={0.9} />
      </mesh>

      {/* Wall edge lines (corners) */}
      {[
        [-hw, 0, -hd], [hw, 0, -hd],
        [-hw, 0, hd], [hw, 0, hd],
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], wallH / 2, pos[2]]} castShadow>
          <boxGeometry args={[0.06, wallH, 0.06]} />
          <meshStandardMaterial
            color={isActive ? '#00A8E0' : '#ffffff'}
            transparent
            opacity={edgeOpacity}
            emissive={isActive ? '#00A8E0' : '#000000'}
            emissiveIntensity={isActive ? 0.3 : 0}
          />
        </mesh>
      ))}

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallH, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial
          color={isActive ? '#0a1a3a' : '#0a0a14'}
          transparent
          opacity={isActive ? 0.5 : 0.3}
          roughness={0.9}
        />
      </mesh>

      {/* Window glow on east wall */}
      <mesh position={[hw - 0.02, wallH * 0.55, 0]}>
        <boxGeometry args={[0.04, wallH * 0.25, room.depth * 0.25]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={isHovered || isActive ? 0.25 : 0.1}
        />
      </mesh>

      {/* Room label */}
      <Text
        position={[0, 0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.42}
        color={isActive ? '#00A8E0' : isHovered ? '#88aabb' : '#445566'}
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width - 1}
        font={undefined}
      >
        {`${room.icon} ${room.name}`}
      </Text>

      {/* Active glow ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[Math.min(hw, hd) * 0.55, Math.min(hw, hd) * 0.65, 48]} />
          <meshBasicMaterial color="#00A8E0" transparent opacity={0.35} />
        </mesh>
      )}

      {/* Device activity badge (HTML overlay) */}
      {deviceCount > 0 && !isActive && (
        <Html
          position={[hw - 0.5, 0.15, -hd + 0.5]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="flex items-center gap-1 bg-[#1A1A1A] border border-[#00A8E0] rounded-full px-2 py-0.5 text-[9px] font-semibold text-[#00A8E0] whitespace-nowrap shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
            {deviceCount} on · {totalWatts.toFixed(0)}W
          </div>
        </Html>
      )}
    </group>
  );
}
