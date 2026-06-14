import { useRef } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import type { Room } from '../../types';

interface RoomMeshProps {
  room: Room;
  isActive: boolean;
  isHovered: boolean;
}

export function RoomMesh({ room, isActive, isHovered }: RoomMeshProps) {
  const { setActiveRoom, setHoveredRoom, ui } = useAppStore();
  const floorRef = useRef<THREE.Mesh>(null);
  const wallHeight = room.height;
  const hw = room.width / 2;
  const hd = room.depth / 2;

  const floorColor = isActive
    ? '#2a3a5e'
    : isHovered
    ? '#1e2d4a'
    : room.floorColor;

  const wallColor = isActive ? '#334466' : '#2a2a3a';
  const wallOpacity = isActive ? 0.35 : isHovered ? 0.25 : 0.15;

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    // In placement mode, let the floor handler take over in DigitalTwinCanvas
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
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Walls — transparent boxes forming the room perimeter */}
      {/* North wall */}
      <mesh position={[0, wallHeight / 2, -hd]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight, 0.12]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      {/* South wall */}
      <mesh position={[0, wallHeight / 2, hd]} castShadow receiveShadow>
        <boxGeometry args={[room.width, wallHeight, 0.12]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      {/* West wall */}
      <mesh position={[-hw, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, wallHeight, room.depth]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      {/* East wall */}
      <mesh position={[hw, wallHeight / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.12, wallHeight, room.depth]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>

      {/* Room label */}
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.45}
        color={isActive ? '#00CAFF' : isHovered ? '#a0c4ff' : '#8899aa'}
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width - 0.5}
      >
        {room.name}
      </Text>

      {/* Active room highlight ring */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[Math.min(hw, hd) - 0.3, Math.min(hw, hd) - 0.1, 32]} />
          <meshBasicMaterial color="#00CAFF" transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  );
}
