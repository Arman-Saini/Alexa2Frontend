import { useMemo } from 'react';
import { type ThreeEvent } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import type { Room } from '../../types';

// Room floor material colors — one per room type
const FLOOR_PALETTES: Record<string, { floor: string; wall: string; accent: string }> = {
  'living-room':    { floor: '#D4A574', wall: '#F5E6C8', accent: '#C8956A' },
  kitchen:          { floor: '#B8D4E8', wall: '#E8F4F8', accent: '#8BAFC8' },
  'master-bedroom': { floor: '#C4A8D8', wall: '#EED8F8', accent: '#A882C8' },
  bathroom:         { floor: '#A8C8D8', wall: '#D8EEF8', accent: '#78AAC8' },
  office:           { floor: '#C8C878', wall: '#F0F0D0', accent: '#A8A850' },
};

interface RoomMeshProps {
  room: Room;
  isActive: boolean;
  isHovered: boolean;
}

export function RoomMesh({ room, isActive, isHovered }: RoomMeshProps) {
  const { setActiveRoom, setHoveredRoom, ui, placedObjects } = useAppStore();
  const hw = room.width / 2;
  const hd = room.depth / 2;
  const wallH = room.height;
  const palette = FLOOR_PALETTES[room.id] ?? { floor: room.floorColor, wall: '#ffffff', accent: '#888888' };

  // Live device stats for this room
  const onDevices = useMemo(
    () => placedObjects.filter(o => o.isAlexaDevice && o.parentRoomId === room.id && o.alexaDeviceState.isOn),
    [placedObjects, room.id]
  );
  const totalWatts = useMemo(
    () => onDevices.reduce((s, o) => s + (o.alexaDeviceState.powerConsumption ?? 0), 0),
    [onDevices]
  );

  const floorColor = isActive ? '#2a3d5a' : isHovered ? palette.accent : palette.floor;
  const wallColor  = isActive ? '#00A8E0' : palette.wall;

  // Wall opacity: dollhouse-style — side walls more transparent, back walls more solid
  // "front" walls (facing isometric camera from +x,+z) = south & east → most transparent
  const backWallOp  = isActive ? 0.55 : isHovered ? 0.45 : 0.35;  // north & west
  const frontWallOp = isActive ? 0.12 : isHovered ? 0.08 : 0.06;  // south & east (camera-facing)

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

      {/* ── Floor ───────────────────────────────────────────────────── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.88} metalness={0.02} />
      </mesh>

      {/* Floor tile pattern overlay */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshStandardMaterial color={palette.accent} transparent opacity={0.06} roughness={1} />
      </mesh>

      {/* Active highlight */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
          <planeGeometry args={[room.width, room.depth]} />
          <meshBasicMaterial color="#00A8E0" transparent opacity={0.08} />
        </mesh>
      )}

      {/* ── Back walls (north + west — visible from isometric camera) */}
      {/* North wall (back wall) */}
      <mesh position={[0, wallH / 2, -hd]} castShadow receiveShadow>
        <boxGeometry args={[room.width + 0.06, wallH, 0.06]} />
        <meshStandardMaterial
          color={wallColor}
          transparent opacity={backWallOp}
          roughness={0.9} side={THREE.DoubleSide}
        />
      </mesh>
      {/* West wall */}
      <mesh position={[-hw, wallH / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.06, wallH, room.depth + 0.06]} />
        <meshStandardMaterial
          color={wallColor}
          transparent opacity={backWallOp}
          roughness={0.9} side={THREE.DoubleSide}
        />
      </mesh>

      {/* ── Front walls (very transparent — camera-facing) */}
      {/* South wall */}
      <mesh position={[0, wallH / 2, hd]}>
        <boxGeometry args={[room.width + 0.06, wallH, 0.06]} />
        <meshStandardMaterial
          color={wallColor}
          transparent opacity={frontWallOp}
          roughness={0.9} side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* East wall */}
      <mesh position={[hw, wallH / 2, 0]}>
        <boxGeometry args={[0.06, wallH, room.depth + 0.06]} />
        <meshStandardMaterial
          color={wallColor}
          transparent opacity={frontWallOp}
          roughness={0.9} side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── Corner pillars ─────────────────────────────────────────── */}
      {[[-hw, -hd], [-hw, hd], [hw, -hd], [hw, hd]].map(([cx, cz], i) => (
        <mesh key={i} position={[cx, wallH / 2, cz]} castShadow>
          <boxGeometry args={[0.1, wallH, 0.1]} />
          <meshStandardMaterial
            color={isActive ? '#00A8E0' : palette.accent}
            roughness={0.7}
            transparent opacity={isActive ? 0.8 : 0.5}
            emissive={isActive ? '#00A8E0' : '#000000'}
            emissiveIntensity={isActive ? 0.2 : 0}
          />
        </mesh>
      ))}

      {/* ── Baseboard trim ─────────────────────────────────────────── */}
      {/* Along north wall */}
      <mesh position={[0, 0.06, -hd + 0.04]}>
        <boxGeometry args={[room.width, 0.1, 0.04]} />
        <meshStandardMaterial color={palette.accent} roughness={0.8} transparent opacity={0.6} />
      </mesh>
      {/* Along west wall */}
      <mesh position={[-hw + 0.04, 0.06, 0]}>
        <boxGeometry args={[0.04, 0.1, room.depth]} />
        <meshStandardMaterial color={palette.accent} roughness={0.8} transparent opacity={0.6} />
      </mesh>

      {/* ── Window on back (north) wall ────────────────────────────── */}
      <mesh position={[0, wallH * 0.58, -hd + 0.02]}>
        <boxGeometry args={[Math.min(1.2, room.width * 0.3), wallH * 0.22, 0.04]} />
        <meshStandardMaterial
          color="#B8DCFF"
          transparent opacity={0.55}
          roughness={0.05} metalness={0.1}
          emissive="#4488cc"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Window frame */}
      <mesh position={[0, wallH * 0.58, -hd + 0.025]}>
        <boxGeometry args={[Math.min(1.2, room.width * 0.3) + 0.06, wallH * 0.22 + 0.06, 0.02]} />
        <meshStandardMaterial color={palette.wall} roughness={0.8} transparent opacity={backWallOp * 1.2} />
      </mesh>

      {/* ── Room label ──────────────────────────────────────────────── */}
      <Text
        position={[0, 0.06, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.38}
        color={isActive ? '#00A8E0' : isHovered ? '#aabbcc' : '#556677'}
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width - 1}
      >
        {`${room.icon}  ${room.name}`}
      </Text>

      {/* ── Active room glow ring ────────────────────────────────────── */}
      {isActive && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[Math.min(hw, hd) * 0.5, Math.min(hw, hd) * 0.62, 48]} />
          <meshBasicMaterial color="#00A8E0" transparent opacity={0.3} />
        </mesh>
      )}

      {/* ── Device activity badge ────────────────────────────────────── */}
      {onDevices.length > 0 && !isActive && (
        <Html
          position={[hw - 0.6, 0.12, -hd + 0.5]}
          center
          distanceFactor={12}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(18,18,18,0.92)',
            border: '1px solid rgba(0,168,224,0.4)',
            borderRadius: 20,
            padding: '2px 7px',
            fontSize: 9,
            fontWeight: 700,
            color: '#00A8E0',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1DB954', display: 'inline-block' }} />
            {onDevices.length} · {totalWatts.toFixed(0)}W
          </div>
        </Html>
      )}
    </group>
  );
}
