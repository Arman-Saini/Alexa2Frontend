import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import _layoutInit from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { resolveAnchor } from '../../utils/anchorResolver';

const QUAT = '/models/quaternius/';

// ── HMR-reactive layout ──────────────────────────────────────────────────────
let _layout = _layoutInit;
if (import.meta.hot) {
  import.meta.hot.accept('../../constants/anchorLayout.json', (mod) => {
    _layout = (mod as unknown as { default: typeof _layoutInit }).default;
  });
}

function baseRotFromWall(wall: string): number {
  if (wall === 'W2') return -Math.PI / 2;
  if (wall === 'W3') return Math.PI;
  if (wall === 'W4') return Math.PI / 2;
  return 0;
}

function GLBDoor({
  model, x, z, baseRotY, swingDir = 1, size = 0.9, open, selected, onClick,
}: {
  model: string; x: number; z: number;
  baseRotY: number; swingDir: 1 | -1; size?: number; open: boolean;
  selected?: boolean; onClick: () => void;
}) {
  const url = QUAT + model + '.glb';
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Reset before each computation so scales never compound
    cloned.scale.set(1, 1, 1);
    cloned.position.y = 0;
    const box = new THREE.Box3().setFromObject(cloned);
    const s = box.getSize(new THREE.Vector3());
    const scaleXZ = size / (Math.max(s.x, s.z) || 1);
    const scaleH = (size * (2.2 / 0.9)) / (s.y || 1);
    cloned.scale.set(scaleXZ, scaleH, scaleXZ);
    const box2 = new THREE.Box3().setFromObject(cloned);
    cloned.position.y -= box2.min.y;
    cloned.traverse(c => {
      if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }
    });
  }, [cloned, size]);

  // Shift hinge so door CENTER sits at the anchor position when closed
  const hx = x - Math.cos(baseRotY) * (size / 2);
  const hz = z - Math.sin(baseRotY) * (size / 2);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const target = open
      ? baseRotY + swingDir * (Math.PI * (120 / 180))
      : baseRotY;
    const t = 1 - Math.exp(-0.014 * 60 * delta);
    groupRef.current.rotation.y += (target - groupRef.current.rotation.y) * t;
  });

  return (
    <group ref={groupRef} position={[hx, 0, hz]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <primitive object={cloned} />
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color="#FFD700" transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

type DoorDef = {
  id: string;
  model: string;
  anchor: { type: string; wall: string; along: number };
  swingDir?: number;
  distFromWall?: number;
  size?: number;
};

export function Doors() {
  const globalUnlocked = useAppStore(s =>
    s.placedObjects.some(o => o.type === 'smart-lock' && o.alexaDeviceState?.isLocked === false)
  );
  const doorOverrides = useAppStore(s => s.doorOverrides);
  const selectedDoorId = useAppStore(s => s.selectedDoorId);
  const setSelectedDoor = useAppStore(s => s.setSelectedDoor);

  const [clickedOpen, setClickedOpen] = useState<Set<string>>(new Set());

  const toggleDoor = useCallback((id: string) => {
    setClickedOpen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const doors = useMemo(() => {
    const result: Array<{
      key: string; model: string; x: number; z: number;
      baseRotY: number; swingDir: 1 | -1; size: number;
    }> = [];

    for (const [roomId, roomDef] of Object.entries(_layout.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      const roomDoors = (roomDef as { doors?: DoorDef[] }).doors;
      if (!roomDoors) continue;
      for (const door of roomDoors) {
        if (door.anchor.type !== 'wall') continue;
        const ov = doorOverrides[door.id] ?? {};
        const wall = (ov.wall ?? door.anchor.wall) as 'W1' | 'W2' | 'W3' | 'W4';
        const along = ov.along ?? door.anchor.along;
        const dist = ov.distFromWall ?? door.distFromWall ?? 0;
        const anchor = { type: 'wall' as const, wall, along };
        const [x, , z] = resolveAnchor(anchor, bounds, { distFromWall: dist });
        const modelName = door.model.replace(/^(?:quat|furn):/, '');
        const rawSwing = ov.swingDir ?? (door.swingDir ?? 1);
        const swingDir = (rawSwing === 1 ? 1 : -1) as 1 | -1;
        const size = ov.size ?? door.size ?? 0.9;
        result.push({ key: door.id, model: modelName, x, z, baseRotY: baseRotFromWall(wall), swingDir, size });
      }
    }
    return result;
  }, [doorOverrides]);

  return (
    <group>
      {doors.map(d => (
        <GLBDoor
          key={d.key}
          model={d.model}
          x={d.x}
          z={d.z}
          baseRotY={d.baseRotY}
          swingDir={d.swingDir}
          size={d.size}
          open={globalUnlocked || clickedOpen.has(d.key)}
          selected={d.key === selectedDoorId}
          onClick={() => {
            if (selectedDoorId === d.key) {
              setSelectedDoor(null);
            } else {
              setSelectedDoor(d.key);
              toggleDoor(d.key);
            }
          }}
        />
      ))}
    </group>
  );
}

['Door1','Door2','Door3','Door4','Door5','Door6','Door7','Door8'].forEach(m =>
  useGLTF.preload(QUAT + m + '.glb')
);
