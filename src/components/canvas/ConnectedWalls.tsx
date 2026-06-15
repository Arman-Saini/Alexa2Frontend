import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LAYOUT_NODES, WALL_SEGMENTS } from '../../constants/layout';
import { useAppStore } from '../../store/store';
import _layoutInit from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';

const WALL_T = 0.14;
const WALL_COLOR = '#4A4234';
const POST_COLOR = '#3E382C';

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

// ── Static masks from anchorLayout.json (windows + doors with maskWidth > 0) ──

// yBottom > 0 = floating window (sill below + lintel above); 0 = door (opening from floor)
type MaskEntry = { wx: number; wz: number; maskW: number; maskH: number; yBottom?: number };

function wallPos(wall: 'W1'|'W2'|'W3'|'W4', along: number, bounds: { xMin: number; xMax: number; zMin: number; zMax: number }): { wx: number; wz: number } {
  const { xMin, xMax, zMin, zMax } = bounds;
  switch (wall) {
    case 'W1': return { wx: lerp(xMin, xMax, along), wz: zMin };
    case 'W2': return { wx: xMax,                    wz: lerp(zMin, zMax, along) };
    case 'W3': return { wx: lerp(xMin, xMax, along), wz: zMax };
    case 'W4': return { wx: xMin,                    wz: lerp(zMin, zMax, along) };
  }
}

// Window masks: only emitted when user explicitly enables masking (maskEnabled=true in override).
// Defaults to OFF — same opt-in pattern as doors (maskWidth > 0).
const WIN_SILL_H = 0.9;
const WIN_OPEN_H = 1.2;

function useWindowMasks(): MaskEntry[] {
  const windowOverrides = useAppStore(s => s.windowOverrides);
  return useMemo(() => {
    const result: MaskEntry[] = [];
    for (const [roomId, roomDef] of Object.entries(_layoutInit.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      const rd = roomDef as { windows?: Array<{ id: string; anchor: { wall: string; along: number } }> };
      for (const win of rd.windows ?? []) {
        const ov = windowOverrides[win.id] ?? {};
        if (!ov.maskEnabled) continue;  // masking disabled by default
        const along = ov.along ?? win.anchor.along;
        const { wx, wz } = wallPos(win.anchor.wall as 'W1'|'W2'|'W3'|'W4', along, bounds);
        const isExterior = Math.abs(wx + 13) < 0.3 || Math.abs(wx - 13) < 0.3 || Math.abs(wz + 10) < 0.3 || Math.abs(wz - 10) < 0.3;
        if (!isExterior) continue;
        result.push({
          wx, wz,
          maskW:   ov.maskW   ?? 1.5,
          maskH:   ov.maskH   ?? WIN_OPEN_H,
          yBottom: ov.yBottom ?? WIN_SILL_H,
        });
      }
    }
    return result;
  }, [windowOverrides]);
}

// Door masks: read base dims from anchorLayout.json, apply doorOverrides on top
function useDoorMasks(): MaskEntry[] {
  const doorOverrides = useAppStore(s => s.doorOverrides);
  return useMemo(() => {
    const result: MaskEntry[] = [];
    type DoorEntry = {
      id: string;
      anchor: { wall: string; along: number };
      maskWidth?: number; maskHeight?: number; maskAlong?: number;
    };
    for (const [roomId, roomDef] of Object.entries(_layoutInit.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      const rd = roomDef as { doors?: DoorEntry[] };
      for (const door of rd.doors ?? []) {
        const ov = doorOverrides[door.id] ?? {};
        // Base mask dims from JSON; override wins if set
        const baseMW = door.maskWidth ?? 0;
        const baseMH = door.maskHeight ?? 0;
        const maskW = ov.maskWidth  ?? baseMW;
        const maskH = ov.maskHeight ?? baseMH;
        if (maskW <= 0 || maskH <= 0) continue;
        const wall  = (ov.maskWall ?? ov.wall ?? door.anchor.wall) as 'W1'|'W2'|'W3'|'W4';
        const along = ov.maskAlong ?? ov.along ?? door.maskAlong ?? door.anchor.along;
        const { wx, wz } = wallPos(wall, along, bounds);
        result.push({ wx, wz, maskW, maskH });
      }
    }
    return result;
  }, [doorOverrides]);
}

// ── Module-level node→rooms map (WALL_SEGMENTS is static) ────────────────────
const NODE_ROOMS: Record<string, Set<string>> = {};
for (const seg of WALL_SEGMENTS) {
  for (const nId of [seg.fromId, seg.toId]) {
    if (!NODE_ROOMS[nId]) NODE_ROOMS[nId] = new Set();
    seg.sharedBy.forEach(r => NODE_ROOMS[nId].add(r));
  }
}

// ── Wall mesh ─────────────────────────────────────────────────────────────────

interface WallMeshProps {
  fromX: number; fromZ: number;
  toX: number;   toZ: number;
  height: number;
  sharedBy: string[];
  activeRoomId: string | null;
  cutouts: Array<{ wx: number; wz: number; maskW: number; maskH: number; yBottom?: number }>;
}

function WallMesh({ fromX, fromZ, toX, toZ, height, sharedBy, activeRoomId, cutouts }: WallMeshProps) {
  const matRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);

  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle  = Math.atan2(dz, dx);
  const midX   = (fromX + toX) / 2;
  const midZ   = (fromZ + toZ) / 2;
  const ux = dx / length;
  const uz = dz / length;

  const isExterior = sharedBy.length === 1;
  const isRelevant = !activeRoomId || sharedBy.includes(activeRoomId);
  const targetOp   = !activeRoomId
    ? (isExterior ? 0.92 : 0.78)
    : isRelevant  ? 0.90 : 0.05;

  useFrame((_, delta) => {
    const t = 1 - Math.exp(-0.013 * 60 * delta);
    for (const m of matRefs.current) {
      if (m) m.opacity += (targetOp - m.opacity) * t;
    }
  });

  const matProps = {
    color: WALL_COLOR, roughness: 0.85 as number, metalness: 0.0 as number,
    transparent: true as const, opacity: targetOp,
  };

  // Map each cutout to a centerAlong position (local X relative to wall start)
  type SlabCut = { centerAlong: number; maskW: number; maskH: number; yBottom: number };
  const activeCuts: SlabCut[] = [];
  for (const c of cutouts) {
    const projAlong = (c.wx - fromX) * ux + (c.wz - fromZ) * uz;
    const projPerp  = (c.wx - fromX) * (-uz) + (c.wz - fromZ) * ux;
    if (projAlong < -0.05 || projAlong > length + 0.05) continue;
    if (Math.abs(projPerp) > 0.25) continue;
    activeCuts.push({ centerAlong: projAlong, maskW: c.maskW, maskH: c.maskH, yBottom: c.yBottom ?? 0 });
  }
  activeCuts.sort((a, b) => a.centerAlong - b.centerAlong);

  // Build slab list
  // Group is centered at height/2 above the floor.  Local y=0 ⟺ world y=height/2.
  // Helper: world y range [y0,y1] → local ly and slab height
  const slab = (lx: number, w: number, y0: number, y1: number) => ({
    lx, w, ly: (y0 + y1) / 2 - height / 2, h: y1 - y0,
  });

  type SlabDef = { lx: number; w: number; ly: number; h: number };
  const slabs: SlabDef[] = [];

  if (activeCuts.length === 0) {
    slabs.push(slab(0, length + WALL_T, 0, height));
  } else {
    const wallStart = -length / 2;
    const wallEnd   =  length / 2;
    let cursor = wallStart;

    for (const cut of activeCuts) {
      const cutLX   = cut.centerAlong - length / 2;
      const gapL    = cutLX - cut.maskW / 2;
      const gapR    = cutLX + cut.maskW / 2;
      const openBot = Math.min(cut.yBottom, height);
      const openTop = Math.min(cut.yBottom + cut.maskH, height);

      // Left solid span (full height)
      const solidW = gapL - cursor;
      if (solidW > 0.001) slabs.push(slab(cursor + solidW / 2, solidW, 0, height));

      // At the opening position:
      if (cut.yBottom > 0.001) {
        // Window: sill below + lintel above
        if (openBot > 0.001) slabs.push(slab(cutLX, cut.maskW, 0, openBot));          // sill
        if (openTop < height - 0.001) slabs.push(slab(cutLX, cut.maskW, openTop, height)); // lintel
      } else {
        // Door: only header above (opening from floor)
        if (openTop < height - 0.001) slabs.push(slab(cutLX, cut.maskW, openTop, height));
      }

      cursor = gapR;
    }

    // Trailing slab (full height)
    const trailingW = wallEnd - cursor;
    if (trailingW > 0.001) slabs.push(slab(cursor + trailingW / 2, trailingW, 0, height));
  }

  // Grow matRefs array if needed
  while (matRefs.current.length < slabs.length) matRefs.current.push(null);

  return (
    <group position={[midX, height / 2, midZ]} rotation={[0, -angle, 0]}>
      {slabs.map((s, i) => (
        <mesh key={i} position={[s.lx, s.ly, 0]} castShadow receiveShadow>
          <boxGeometry args={[s.w, s.h, WALL_T]} />
          <meshStandardMaterial
            ref={(el: THREE.MeshStandardMaterial | null) => { matRefs.current[i] = el; }}
            {...matProps}
          />
        </mesh>
      ))}
    </group>
  );
}

// ── Corner post ───────────────────────────────────────────────────────────────

function CornerPost({ x, z, height, activeRoomId, adjacentRooms }: {
  x: number; z: number; height: number;
  activeRoomId: string | null; adjacentRooms: string[];
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const isRelevant = !activeRoomId || adjacentRooms.includes(activeRoomId);
  const targetOp   = !activeRoomId ? 0.95 : isRelevant ? 0.95 : 0.05;

  useFrame((_, delta) => {
    if (!matRef.current) return;
    const t = 1 - Math.exp(-0.013 * 60 * delta);
    matRef.current.opacity += (targetOp - matRef.current.opacity) * t;
  });

  return (
    <mesh position={[x, height / 2, z]} castShadow>
      <boxGeometry args={[WALL_T * 1.6, height, WALL_T * 1.6]} />
      <meshStandardMaterial
        ref={matRef}
        color={POST_COLOR} roughness={0.85} metalness={0.0} transparent opacity={targetOp}
      />
    </mesh>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export function ConnectedWalls() {
  const activeRoomId = useAppStore(s => s.ui.activeRoomId);
  const windowMasks = useWindowMasks();
  const doorMasks   = useDoorMasks();

  const allCutouts = useMemo(
    () => [...windowMasks, ...doorMasks],
    [windowMasks, doorMasks]
  );

  return (
    <group>
      {WALL_SEGMENTS.map(seg => {
        const from = LAYOUT_NODES[seg.fromId];
        const to   = LAYOUT_NODES[seg.toId];
        return (
          <WallMesh
            key={seg.id}
            fromX={from.x} fromZ={from.z}
            toX={to.x}     toZ={to.z}
            height={seg.height}
            sharedBy={seg.sharedBy}
            activeRoomId={activeRoomId}
            cutouts={allCutouts}
          />
        );
      })}

      {Object.values(LAYOUT_NODES).map(node => (
        <CornerPost
          key={node.id}
          x={node.x} z={node.z}
          height={3.5}
          activeRoomId={activeRoomId}
          adjacentRooms={Array.from(NODE_ROOMS[node.id] ?? [])}
        />
      ))}
    </group>
  );
}
