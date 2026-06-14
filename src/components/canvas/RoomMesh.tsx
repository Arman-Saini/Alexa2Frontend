import { useRef, useMemo } from 'react';
import { type ThreeEvent, useFrame } from '@react-three/fiber';
import { Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import type { Room } from '../../types';
import { TOON_GRADIENT } from './ToonMaterial';

// Sims-style vibrant floor palettes
const FLOOR_PALETTES: Record<string, { floor: string; active: string; accent: string }> = {
  'living-room':    { floor: '#C8894A', active: '#E8A860', accent: '#A06830' },
  kitchen:          { floor: '#5AAAC0', active: '#7ACCDE', accent: '#3888A0' },
  'master-bedroom': { floor: '#A060C0', active: '#C080E0', accent: '#7840A0' },
  bathroom:         { floor: '#48B888', active: '#60D8A8', accent: '#309868' },
  office:           { floor: '#A8A830', active: '#C8C848', accent: '#808010' },
};

interface RoomMeshProps {
  room: Room;
  isActive: boolean;
  isHovered: boolean;
}

export function RoomMesh({ room, isActive, isHovered }: RoomMeshProps) {
  const groupRef   = useRef<THREE.Group>(null);
  const floorRef   = useRef<THREE.MeshToonMaterial>(null);

  const { setActiveRoom, setHoveredRoom, ui, placedObjects } = useAppStore();
  const { activeRoomId } = ui;

  const hw = room.width  / 2;
  const hd = room.depth  / 2;

  const palette = FLOOR_PALETTES[room.id] ?? { floor: room.floorColor, active: '#4a90d9', accent: '#888' };

  const onDevices = useMemo(
    () => placedObjects.filter(o => o.isAlexaDevice && o.parentRoomId === room.id && o.alexaDeviceState.isOn),
    [placedObjects, room.id]
  );
  const totalWatts = useMemo(
    () => onDevices.reduce((s, o) => s + (o.alexaDeviceState.powerConsumption ?? 0), 0),
    [onDevices]
  );

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
        <meshToonMaterial
          ref={floorRef}
          color={floorColor}
          gradientMap={TOON_GRADIENT}
          transparent
          opacity={1}
        />
      </mesh>

      {/* Floor tile grid lines (subtle) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <planeGeometry args={[room.width, room.depth]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.05} wireframe={false} />
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

      {/* ── Room label ─────────────────────────────────────────────────── */}
      <Text
        position={[0, 0.05, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={isActive ? 0.55 : 0.45}
        color={isActive ? '#ffffff' : isHovered ? '#ffffff' : '#ffffffaa'}
        anchorX="center"
        anchorY="middle"
        maxWidth={room.width - 1}
        outlineColor="#00000066"
        outlineWidth={0.03}
      >
        {`${room.icon}  ${room.name}`}
      </Text>

      {/* ── Device activity badge ──────────────────────────────────────── */}
      {onDevices.length > 0 && !isActive && (
        <Html
          position={[hw - 0.7, 0.15, -hd + 0.6]}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(10,10,20,0.88)',
            border: '1px solid rgba(0,200,255,0.45)',
            borderRadius: 20,
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 700,
            color: '#00C8FF',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            fontFamily: 'system-ui,sans-serif',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22dd66', display: 'inline-block' }} />
            {onDevices.length} · {totalWatts.toFixed(0)}W
          </div>
        </Html>
      )}
    </group>
  );
}
