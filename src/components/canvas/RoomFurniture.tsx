import { useRef, useEffect, Suspense, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import _layoutInit from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';

// ── HMR-reactive layout ──────────────────────────────────────────────────────
// Vite replaces the JSON module on save; we patch a module-level ref and
// notify subscribed components so the scene re-resolves without a full reload.
let _layout = _layoutInit;
const _hmrListeners = new Set<() => void>();

if (import.meta.hot) {
  import.meta.hot.accept('../../constants/anchorLayout.json', (mod) => {
    _layout = (mod as unknown as { default: typeof _layoutInit }).default;
    _hmrListeners.forEach(fn => fn());
  });
}

function useLayout() {
  const [, bump] = useState(0);
  useEffect(() => {
    const notify = () => bump(n => n + 1);
    _hmrListeners.add(notify);
    return () => { _hmrListeners.delete(notify); };
  }, []);
  return _layout;
}
import { resolveAnchor, validateLayout } from '../../utils/anchorResolver';
import type { AnchorDef, ResolvedItem } from '../../utils/anchorResolver';
import { useAppStore } from '../../store/store';
import { PixelDog, SleepingCat } from './EasterEggs';

const QUAT = '/models/quaternius/';
const FURN = '/models/furniture/';

function modelUrl(model: string): string {
  if (model.startsWith('quat:')) return QUAT + model.slice(5) + '.glb';
  if (model.startsWith('furn:')) return FURN + model.slice(5) + '.glb';
  return model;
}


function CeilingFan({ pos, spinning }: { pos: [number, number, number]; spinning: boolean }) {
  const { scene } = useGLTF(FURN + 'ceilingFan.glb');
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const bladeRef = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    // Scale fan — don't ground (it hangs from ceiling)
    const box = new THREE.Box3().setFromObject(cloned);
    const s = box.getSize(new THREE.Vector3());
    const maxXZ = Math.max(s.x, s.z) || 1;
    cloned.scale.multiplyScalar(1.4 / maxXZ);
    cloned.traverse((c) => {
      if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }
      // Find blades — typically named with 'blade', 'fan', or 'rotor'
      const nameLower = c.name.toLowerCase();
      if (nameLower.includes('blade') || nameLower.includes('fan') || nameLower.includes('rotor')) {
        bladeRef.current = c;
      }
    });
    // Fallback: if no named blade found, use the whole cloned group
    if (!bladeRef.current) bladeRef.current = cloned;
  }, [cloned]);

  useFrame((_, delta) => {
    if (bladeRef.current && spinning) {
      bladeRef.current.rotation.y += delta * 4;
    }
  });

  return (
    <group position={pos}>
      <primitive object={cloned} />
    </group>
  );
}

function Whiteboard({ pos, rot, size }: { pos: [number, number, number]; rot: number; size: number }) {
  const W = size;
  const H = W * 0.6;
  return (
    <group position={[pos[0], H / 2 + 0.9, pos[2]]} rotation={[0, rot, 0]}>
      {/* Board surface */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.04]} />
        <meshStandardMaterial color="#F5F5F0" roughness={0.3} metalness={0.0} />
      </mesh>
      {/* Frame */}
      <mesh position={[0, 0, -0.025]}>
        <boxGeometry args={[W + 0.08, H + 0.08, 0.02]} />
        <meshStandardMaterial color="#888880" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Tray at bottom */}
      <mesh position={[0, -H / 2 - 0.03, 0.03]}>
        <boxGeometry args={[W * 0.8, 0.04, 0.06]} />
        <meshStandardMaterial color="#777770" roughness={0.6} metalness={0.2} />
      </mesh>
    </group>
  );
}

function Piece({ model, pos, rot, size, yOffset, selected, onClick }: {
  id?: string;
  model: string;
  pos: [number, number, number];
  rot: number;
  size: number;
  yOffset?: number;
  selected?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const finalPos: [number, number, number] = [pos[0], pos[1] + (yOffset ?? 0), pos[2]];
  if (model === 'whiteboard') return <Whiteboard pos={finalPos} rot={rot} size={size} />;
  if (model === 'easter:dog') return (
    <group position={finalPos} rotation={[0, rot, 0]} onClick={onClick}>
      <PixelDog />
      {selected && <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.35,0.42,32]} /><meshBasicMaterial color="#00BFFF" transparent opacity={0.8} depthWrite={false} /></mesh>}
    </group>
  );
  if (model === 'easter:cat') return (
    <group position={finalPos} rotation={[0, rot, 0]} onClick={onClick}>
      <SleepingCat />
      {selected && <mesh position={[0, 0.01, 0]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[0.25,0.32,32]} /><meshBasicMaterial color="#00BFFF" transparent opacity={0.8} depthWrite={false} /></mesh>}
    </group>
  );

  const url = modelUrl(model);
  const { scene } = useGLTF(url);

  // Compute scale and ground-offset from the ISOLATED clone (no parent transforms).
  // groundAndScale() used to call setFromObject() after mounting, which reads the
  // WORLD bounding box — this accidentally subtracted finalPos.y and dropped items
  // to the floor.  Computing here in useMemo guarantees local-space bounds.
  const { cloned, groundY, scaleScalar } = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);       // local-space: no parent transforms
    const s   = box.getSize(new THREE.Vector3());
    const maxXZ = Math.max(s.x, s.z) || 1;
    const sc  = size / maxXZ;
    const groundOffset = -box.min.y * sc;               // how much to lift so bottom = 0
    c.traverse(ch => {
      if (ch instanceof THREE.Mesh) { ch.castShadow = true; ch.receiveShadow = true; }
    });
    return { cloned: c, groundY: groundOffset, scaleScalar: sc };
  }, [scene, size]);

  return (
    <group position={finalPos} rotation={[0, rot, 0]} onClick={onClick}>
      <group scale={[scaleScalar, scaleScalar, scaleScalar]} position={[0, groundY, 0]}>
        <primitive object={cloned} />
      </group>
      {selected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 0.5, size * 0.58, 32]} />
          <meshBasicMaterial color="#00BFFF" transparent opacity={0.8} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

type FurnitureDef = {
  id: string;
  model: string;
  anchor: AnchorDef;
  rot: number;
  size: number;
  distFromWall?: number;
  objectOffset?: [number, number, number];
  yOffset?: number;
};

// Store uses kebab parentRoomId; layout uses camelCase keys — bridge the gap
const STORE_ROOM_TO_LAYOUT: Record<string, string> = {
  'living-room':    'livingRoom',
  'master-bedroom': 'masterBedroom',
  'bathroom':       'bathroom',
  'office':         'homeOffice',
  'kitchen':        'kitchenDining',
  'hallway':        'hallway',
};

export function RoomFurniture() {
  const layout = useLayout();
  const placedObjects = useAppStore(s => s.placedObjects);
  const furnitureOverrides = useAppStore(s => s.furnitureOverrides);
  const selectedFurnitureId = useAppStore(s => s.selectedFurnitureId);
  const setSelectedFurniture = useAppStore(s => s.setSelectedFurniture);

  const fanOnRooms = useMemo(() => {
    const s = new Set<string>();
    placedObjects.forEach(o => {
      if (o.type === 'ceiling-fan' && o.alexaDeviceState?.isOn && o.parentRoomId) {
        const layoutKey = STORE_ROOM_TO_LAYOUT[o.parentRoomId];
        if (layoutKey) s.add(layoutKey);
      }
    });
    return s;
  }, [placedObjects]);

  const resolved = useMemo(() => {
    const items: Array<{
      id: string; room: string; model: string;
      pos: [number, number, number]; rot: number; size: number;
      isCeiling: boolean; spinning: boolean; yOffset?: number;
    }> = [];

    const posById = new Map<string, [number, number, number]>();

    // Collect all pieces first so we can do multi-pass resolution for object-anchored items.
    // Object anchors depend on their parent's resolved position — a single pass fails when
    // a child appears before its parent (or in deep chains: grandparent → parent → child).
    type PieceCtx = { roomId: string; bounds: typeof ROOM_BOUNDS[string]; piece: FurnitureDef };
    const allPieces: PieceCtx[] = [];
    for (const [roomId, roomDef] of Object.entries(layout.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      for (const piece of (roomDef as { furniture: FurnitureDef[] }).furniture) {
        allPieces.push({ roomId, bounds, piece });
      }
    }

    // Multi-pass: resolve non-object anchors first, then keep iterating until all
    // object-anchored items have their parent resolved. Handles chains of any depth.
    const pending = new Set(allPieces.map((_, i) => i));
    let prevSize = -1;
    while (pending.size > 0 && pending.size !== prevSize) {
      prevSize = pending.size;
      for (const idx of [...pending]) {
        const { roomId, bounds, piece } = allPieces[idx];
        const ov = furnitureOverrides[piece.id] ?? {};
        const anchor = { ...piece.anchor } as AnchorDef;

        if (ov.wall && (anchor as { wall?: string }).wall !== undefined) {
          (anchor as { wall: string }).wall = ov.wall;
        }
        if (ov.along !== undefined && (anchor as { along?: number }).along !== undefined) {
          (anchor as { along: number }).along = ov.along;
        }

        // Skip object-anchored items whose parent isn't resolved yet
        if (anchor.type === 'object') {
          const parentId = (anchor as { parentId: string }).parentId;
          if (!posById.has(parentId)) continue;
        }

        const isCeiling = anchor.type === 'ceiling';
        const isFan = isCeiling && piece.model.toLowerCase().includes('fan');

        const opts = {
          distFromWall: ov.distFromWall ?? piece.distFromWall ?? 0.3,
          resolvedParentPos: anchor.type === 'object'
            ? posById.get((anchor as { parentId: string }).parentId)
            : undefined,
          objectOffset: piece.objectOffset,
        };

        const pos = resolveAnchor(anchor, bounds, opts);
        posById.set(piece.id, pos);
        pending.delete(idx);

        items.push({
          id: piece.id,
          room: roomId,
          model: piece.model,
          pos,
          rot: ov.rot ?? piece.rot,
          size: ov.size ?? piece.size,
          isCeiling: isFan,
          spinning: isFan && fanOnRooms.has(roomId),
          // Object-anchored items must NOT add yOffset — their Y already comes from objectOffset
          yOffset: anchor.type === 'object' ? 0 : (ov.yOffset ?? piece.yOffset),
        });
      }
    }
    if (pending.size > 0) {
      console.warn('[RoomFurniture] unresolved object-anchored items (broken parent chain):', [...pending].map(i => allPieces[i].piece.id));
    }

    const validationItems: ResolvedItem[] = items.map(i => ({ id: i.id, room: i.room, pos: i.pos }));
    const errors = validateLayout(validationItems, ROOM_BOUNDS);
    if (errors.length) console.warn('[RoomFurniture] placement warnings:', errors);

    return items;
  }, [layout, fanOnRooms, furnitureOverrides]);

  return (
    <Suspense fallback={null}>
      {resolved.map(item =>
        item.isCeiling ? (
          <CeilingFan key={item.id} pos={item.pos} spinning={item.spinning} />
        ) : (
          <Piece
            key={item.id}
            id={item.id}
            model={item.model}
            pos={item.pos}
            rot={item.rot}
            size={item.size}
            yOffset={item.yOffset}
            selected={item.id === selectedFurnitureId}
            onClick={(e) => { e.stopPropagation(); setSelectedFurniture(item.id === selectedFurnitureId ? null : item.id); }}
          />
        )
      )}
    </Suspense>
  );
}

// Preload all models referenced in the initial layout (best-effort; HMR additions load on demand)
const allModels = new Set<string>();
Object.values(_layoutInit.rooms).forEach((room: unknown) => {
  (room as { furniture?: Array<{ model: string }> }).furniture?.forEach(
    (f) => allModels.add(modelUrl(f.model))
  );
});
allModels.forEach(url => {
  if (url === 'whiteboard' || url.startsWith('easter:')) return;
  try { useGLTF.preload(url); } catch { /* ignore */ }
});
