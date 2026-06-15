# Environment Rebuild v4 — Strict Architectural Placement System

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded world-coordinate furniture placement with a room-owned anchor system, add ground/ceiling object anchors, animated ceiling fans, GLB doors, and full orbit camera.

**Architecture:** Step C generates a JSON layout spec per room (walls, windows, doors, furniture with anchor references); Step A implements a TypeScript anchor resolver that converts `{ room, anchor, offset }` declarations into world XYZ at runtime. Every object belongs to exactly one room and is attached to a wall anchor, ground-object anchor, or ceiling anchor — never placed by raw world coordinates.

**Tech Stack:** React Three Fiber, @react-three/drei (`useGLTF`, `OrbitControls`), Three.js, TypeScript, Vitest

---

## Room Bounds Reference (from layout.ts)

```
Living Room:    x [-1.5, 6.5]  z [-5, 1]   (8×6m)
Master Bedroom: x [-6.5, -1.5] z [-5, 0]   (5×5m)
Bathroom:       x [-6.5, -1.5] z [0, 2]    (5×2m, spec says 3×3 — use actual bounds)
Home Office:    x [-6.5, -1.5] z [2, 5]    (5×3m)
Kitchen+Dining: x [1.5, 6.5]   z [1, 5]    (5×4m)
Hallway:        x [-1.5, 1.5]  z [1, 5]    (3×4m)
Wall height: 3m
```

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/constants/roomBounds.ts` | **Create** | Room AABB definitions derived from layout.ts nodes |
| `src/constants/anchorLayout.json` | **Create** | Option C: JSON layout spec (walls, windows, doors, furniture anchors) |
| `src/utils/anchorResolver.ts` | **Create** | Converts anchor declarations → world XYZ; validation pass |
| `src/components/canvas/RoomFurniture.tsx` | **Replace** | Consumes resolved anchors; animated ceiling fan; clean render |
| `src/components/canvas/Doors.tsx` | **Replace** | GLB Door1-8 from quaternius with swing animation |
| `src/components/canvas/CameraController.tsx` | **Modify** | Enable full OrbitControls pan/zoom, smooth room-focus animation |
| `src/components/canvas/HouseDecor.tsx` | **Modify** | Windows placed per anchorLayout.json (wall + offset), curtains as children |
| `src/components/canvas/Curtains.tsx` | **Modify** | Curtain is child of window; position derived from window world pos |
| `src/test/anchorResolver.test.ts` | **Create** | Unit tests for anchor math and validation pass |

---

## Task 1: Generate JSON Layout Spec (Option C)

**Files:**
- Create: `src/constants/anchorLayout.json`

This JSON is the single source of truth for all placement. The anchor resolver in Task 2 reads it. Review this JSON carefully before writing any mesh code.

Anchor types:
- `wall` — `{ type:"wall", wall:"W1"|"W2"|"W3"|"W4", along:0-1, height:0-3 }` — W1=North, W2=East, W3=South, W4=West
- `corner` — `{ type:"corner", corner:"NW"|"NE"|"SW"|"SE" }`
- `center` — `{ type:"center" }`
- `ceiling` — `{ type:"ceiling" }` — y=3, XZ=room center unless overridden
- `object` — `{ type:"object", parentId:"<pieceId>" }` — inherits parent's resolved XZ, stacks on top

`along` is a 0→1 fraction along the wall (0=left corner when facing wall, 1=right corner).

- [ ] **Step 1.1: Write the JSON layout spec**

Create `src/constants/anchorLayout.json`:

```json
{
  "rooms": {
    "living-room": {
      "bounds": { "xMin": -1.5, "xMax": 6.5, "zMin": -5, "zMax": 1 },
      "windows": [
        { "id": "lr-w1-win", "wall": "W1", "along": 0.5, "model": "WindowLarge" },
        { "id": "lr-w2-win", "wall": "W2", "along": 0.35, "model": "WindowLarge" }
      ],
      "doors": [
        { "id": "lr-mb-door", "wall": "W4", "along": 0.75, "model": "Door1", "swingDir": 1 }
      ],
      "furniture": [
        { "id": "lr-rug",       "model": "quat:Rug",            "anchor": { "type": "center" },                           "rot": 0,    "size": 4.5 },
        { "id": "lr-tvconsole", "model": "furn:premium_tvconsole","anchor": { "type": "wall", "wall": "W1", "along": 0.5 }, "rot": 0,    "size": 2.2 },
        { "id": "lr-tv",        "model": "furn:televisionModern", "anchor": { "type": "object", "parentId": "lr-tvconsole" },"rot": 0,   "size": 2.0 },
        { "id": "lr-sofa",      "model": "furn:premium_sofa",    "anchor": { "type": "wall", "wall": "W3", "along": 0.42 }, "rot": 3.14, "size": 3.2, "distFromWall": 0.8 },
        { "id": "lr-coffee",    "model": "quat:TableRoundLarge", "anchor": { "type": "center" },                           "rot": 0,    "size": 1.2 },
        { "id": "lr-chair",     "model": "quat:Chair1",          "anchor": { "type": "wall", "wall": "W2", "along": 0.65 }, "rot": -2.2, "size": 0.9, "distFromWall": 0.7 },
        { "id": "lr-lamp",      "model": "quat:LightFloor1",     "anchor": { "type": "corner", "corner": "NE" },           "rot": 0,    "size": 1.4 },
        { "id": "lr-plant1",    "model": "quat:Houseplant1",     "anchor": { "type": "corner", "corner": "NW" },           "rot": 0,    "size": 0.9 },
        { "id": "lr-plant2",    "model": "quat:Houseplant2",     "anchor": { "type": "corner", "corner": "SE" },           "rot": 0,    "size": 0.9 },
        { "id": "lr-fan",       "model": "furn:ceilingFan",      "anchor": { "type": "ceiling" },                          "rot": 0,    "size": 1.4 }
      ]
    },
    "master-bedroom": {
      "bounds": { "xMin": -6.5, "xMax": -1.5, "zMin": -5, "zMax": 0 },
      "windows": [
        { "id": "mb-w1-win", "wall": "W1", "along": 0.5, "model": "WindowLarge" }
      ],
      "doors": [
        { "id": "mb-hw-door", "wall": "W3", "along": 0.75, "model": "Door2", "swingDir": 1 }
      ],
      "furniture": [
        { "id": "mb-bed",       "model": "furn:premium_bed",     "anchor": { "type": "wall", "wall": "W1", "along": 0.5 }, "rot": 0,    "size": 2.4, "distFromWall": 0.1 },
        { "id": "mb-ns-left",   "model": "quat:NightStand1",     "anchor": { "type": "object", "parentId": "mb-bed" },     "rot": 0,    "size": 0.6, "objectOffset": [-1.5, 0, 0] },
        { "id": "mb-ns-right",  "model": "quat:NightStand2",     "anchor": { "type": "object", "parentId": "mb-bed" },     "rot": 0,    "size": 0.6, "objectOffset": [1.5, 0, 0] },
        { "id": "mb-wardrobe",  "model": "quat:Drawer4",         "anchor": { "type": "wall", "wall": "W4", "along": 0.4 }, "rot": 1.57, "size": 1.8 },
        { "id": "mb-lamp",      "model": "quat:LightFloor2",     "anchor": { "type": "corner", "corner": "SE" },           "rot": 0,    "size": 1.4 },
        { "id": "mb-plant",     "model": "quat:Houseplant3",     "anchor": { "type": "corner", "corner": "SW" },           "rot": 0,    "size": 0.9 },
        { "id": "mb-fan",       "model": "furn:ceilingFan",      "anchor": { "type": "ceiling" },                          "rot": 0,    "size": 1.4 }
      ]
    },
    "bathroom": {
      "bounds": { "xMin": -6.5, "xMax": -1.5, "zMin": 0, "zMax": 2 },
      "windows": [],
      "doors": [
        { "id": "ba-mb-door", "wall": "W1", "along": 0.5, "model": "Door3", "swingDir": -1 },
        { "id": "ba-of-door", "wall": "W3", "along": 0.5, "model": "Door4", "swingDir":  1 }
      ],
      "furniture": [
        { "id": "ba-bathtub",  "model": "quat:Bathtub",      "anchor": { "type": "wall", "wall": "W2", "along": 0.5 }, "rot": 1.57,  "size": 1.8 },
        { "id": "ba-toilet",   "model": "quat:Toilet",       "anchor": { "type": "wall", "wall": "W4", "along": 0.7 }, "rot": 1.57,  "size": 0.8 },
        { "id": "ba-sink",     "model": "quat:BathroomSink", "anchor": { "type": "wall", "wall": "W1", "along": 0.25},"rot": 0,     "size": 0.7 },
        { "id": "ba-towelrack","model": "quat:TowelRack",    "anchor": { "type": "wall", "wall": "W1", "along": 0.65},"rot": 0,     "size": 0.7 }
      ]
    },
    "home-office": {
      "bounds": { "xMin": -6.5, "xMax": -1.5, "zMin": 2, "zMax": 5 },
      "windows": [
        { "id": "of-w2-win", "wall": "W2", "along": 0.5, "model": "WindowLarge" }
      ],
      "doors": [
        { "id": "of-hw-door", "wall": "W2", "along": 0.1, "model": "Door5", "swingDir": 1 }
      ],
      "furniture": [
        { "id": "of-desk",      "model": "furn:desk",         "anchor": { "type": "wall", "wall": "W2", "along": 0.6 }, "rot": -1.57, "size": 1.8, "distFromWall": 0.5 },
        { "id": "of-monitor",   "model": "furn:computerScreen","anchor": { "type": "object", "parentId": "of-desk" },   "rot": -1.57, "size": 0.4 },
        { "id": "of-bookshelf", "model": "furn:bookcaseOpen",  "anchor": { "type": "wall", "wall": "W4", "along": 0.5 },"rot": -1.57, "size": 1.6 },
        { "id": "of-plant",     "model": "quat:Houseplant4",   "anchor": { "type": "corner", "corner": "NE" },          "rot": 0,    "size": 0.9 },
        { "id": "of-fan",       "model": "furn:ceilingFan",    "anchor": { "type": "ceiling" },                         "rot": 0,    "size": 1.2 }
      ]
    },
    "kitchen-dining": {
      "bounds": { "xMin": 1.5, "xMax": 6.5, "zMin": 1, "zMax": 5 },
      "windows": [
        { "id": "kt-w3-win", "wall": "W3", "along": 0.5, "model": "WindowSmall" }
      ],
      "doors": [
        { "id": "kt-hw-door", "wall": "W4", "along": 0.5, "model": "Door6", "swingDir": -1 }
      ],
      "furniture": [
        { "id": "kt-counter",  "model": "furn:kitchenCabinet",  "anchor": { "type": "wall", "wall": "W2", "along": 0.35 },"rot": -1.57,"size": 2.5 },
        { "id": "kt-sink",     "model": "furn:kitchenSink",     "anchor": { "type": "wall", "wall": "W2", "along": 0.65 },"rot": -1.57,"size": 0.9 },
        { "id": "kt-stove",    "model": "furn:kitchenStove",    "anchor": { "type": "wall", "wall": "W1", "along": 0.35 },"rot": 0,    "size": 0.9 },
        { "id": "kt-fridge",   "model": "furn:kitchenFridgeLarge","anchor":{"type":"corner","corner":"NE"},               "rot": -1.57,"size": 1.0 },
        { "id": "kt-dining",   "model": "furn:premium_dining",  "anchor": { "type": "center" },                          "rot": 0,    "size": 2.8 },
        { "id": "kt-plant",    "model": "quat:Houseplant5",     "anchor": { "type": "corner", "corner": "SE" },          "rot": 0,    "size": 0.9 }
      ]
    },
    "hallway": {
      "bounds": { "xMin": -1.5, "xMax": 1.5, "zMin": 1, "zMax": 5 },
      "windows": [],
      "doors": [
        { "id": "hw-entrance", "wall": "W3", "along": 0.5, "model": "Door7", "swingDir": 1 }
      ],
      "furniture": [
        { "id": "hw-rug",   "model": "quat:RoundRug",    "anchor": { "type": "center" }, "rot": 0, "size": 1.6 },
        { "id": "hw-plant", "model": "quat:Houseplant6", "anchor": { "type": "corner", "corner": "SE" }, "rot": 0, "size": 0.9 }
      ]
    }
  }
}
```

- [ ] **Step 1.2: Commit**

```bash
git add src/constants/anchorLayout.json
git commit -m "feat(layout): JSON anchor layout spec for all rooms v4"
```

---

## Task 2: Room Bounds + Anchor Resolver (Option A)

**Files:**
- Create: `src/constants/roomBounds.ts`
- Create: `src/utils/anchorResolver.ts`
- Create: `src/test/anchorResolver.test.ts`

The resolver converts an anchor declaration + the room's bounds into a `[x, y, z]` world position.

Wall center positions (facing inward):
- W1 (North): z = bounds.zMin, x = lerp(xMin, xMax, along)
- W2 (East):  x = bounds.xMax, z = lerp(zMin, zMax, along)
- W3 (South): z = bounds.zMax, x = lerp(xMin, xMax, along)
- W4 (West):  x = bounds.xMin, z = lerp(zMin, zMax, along)

Corner positions:
- NW: (xMin, 0, zMin)
- NE: (xMax, 0, zMin)
- SW: (xMin, 0, zMax)
- SE: (xMax, 0, zMax)

Corner objects get a small inset (0.4m) so they don't clip the wall mesh.

`distFromWall` pushes the object away from the wall toward room interior (default 0.3m).

- [ ] **Step 2.1: Write failing tests**

Create `src/test/anchorResolver.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { resolveAnchor, validateLayout } from '../utils/anchorResolver';
import type { RoomBounds } from '../constants/roomBounds';

const lr: RoomBounds = { xMin: -1.5, xMax: 6.5, zMin: -5, zMax: 1 };

describe('resolveAnchor', () => {
  it('resolves W1 center', () => {
    const [x, y, z] = resolveAnchor({ type: 'wall', wall: 'W1', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(2.5);   // midpoint of xMin..xMax
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-5 + 0); // zMin + distFromWall
  });

  it('resolves W1 with distFromWall pushes south', () => {
    const [, , z] = resolveAnchor({ type: 'wall', wall: 'W1', along: 0.5 }, lr, { distFromWall: 0.3 });
    expect(z).toBeCloseTo(-5 + 0.3);
  });

  it('resolves W2 center', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W2', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(6.5);
    expect(z).toBeCloseTo(-2); // midpoint of zMin..zMax
  });

  it('resolves W3 center', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W3', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(2.5);
    expect(z).toBeCloseTo(1);
  });

  it('resolves W4 center', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W4', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(-1.5);
    expect(z).toBeCloseTo(-2);
  });

  it('resolves center anchor', () => {
    const [x, y, z] = resolveAnchor({ type: 'center' }, lr, {});
    expect(x).toBeCloseTo(2.5);   // (xMin+xMax)/2
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-2);    // (zMin+zMax)/2
  });

  it('resolves ceiling anchor at y=3', () => {
    const [x, y, z] = resolveAnchor({ type: 'ceiling' }, lr, {});
    expect(y).toBe(3);
    expect(x).toBeCloseTo(2.5);
    expect(z).toBeCloseTo(-2);
  });

  it('resolves NE corner with inset', () => {
    const [x, , z] = resolveAnchor({ type: 'corner', corner: 'NE' }, lr, {});
    expect(x).toBeLessThan(6.5);   // inset from east
    expect(z).toBeGreaterThan(-5); // inset from north
  });

  it('resolves object anchor with objectOffset', () => {
    const parentPos: [number, number, number] = [2, 0, -3];
    const [x, y, z] = resolveAnchor(
      { type: 'object', parentId: 'lr-tvconsole' }, lr,
      { resolvedParentPos: parentPos, objectOffset: [0.5, 0, 0] }
    );
    expect(x).toBeCloseTo(2.5);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-3);
  });
});

describe('validateLayout', () => {
  it('returns no errors for valid positions inside room bounds', () => {
    const errors = validateLayout([
      { id: 'a', room: 'living-room', pos: [2.5, 0, -2] },
    ], { 'living-room': lr });
    expect(errors).toHaveLength(0);
  });

  it('returns error for position outside room bounds', () => {
    const errors = validateLayout([
      { id: 'a', room: 'living-room', pos: [10, 0, -2] }, // x > xMax
    ], { 'living-room': lr });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('a');
  });
});
```

- [ ] **Step 2.2: Run tests — expect failures**

```bash
cd frontend && npx vitest run src/test/anchorResolver.test.ts 2>&1 | tail -20
```

Expected: `Cannot find module '../utils/anchorResolver'`

- [ ] **Step 2.3: Create roomBounds.ts**

Create `src/constants/roomBounds.ts`:

```typescript
export interface RoomBounds {
  xMin: number; xMax: number;
  zMin: number; zMax: number;
}

export const ROOM_BOUNDS: Record<string, RoomBounds> = {
  'living-room':    { xMin: -1.5, xMax:  6.5, zMin: -5, zMax: 1 },
  'master-bedroom': { xMin: -6.5, xMax: -1.5, zMin: -5, zMax: 0 },
  'bathroom':       { xMin: -6.5, xMax: -1.5, zMin:  0, zMax: 2 },
  'home-office':    { xMin: -6.5, xMax: -1.5, zMin:  2, zMax: 5 },
  'kitchen-dining': { xMin:  1.5, xMax:  6.5, zMin:  1, zMax: 5 },
  'hallway':        { xMin: -1.5, xMax:  1.5, zMin:  1, zMax: 5 },
};
```

- [ ] **Step 2.4: Create anchorResolver.ts**

Create `src/utils/anchorResolver.ts`:

```typescript
import type { RoomBounds } from '../constants/roomBounds';

export type WallId = 'W1' | 'W2' | 'W3' | 'W4';
export type CornerId = 'NW' | 'NE' | 'SW' | 'SE';

export type AnchorDef =
  | { type: 'wall';   wall: WallId; along: number }
  | { type: 'corner'; corner: CornerId }
  | { type: 'center' }
  | { type: 'ceiling' }
  | { type: 'object'; parentId: string };

export interface ResolveOptions {
  distFromWall?: number;
  resolvedParentPos?: [number, number, number];
  objectOffset?: [number, number, number];
}

const CORNER_INSET = 0.4;
const WALL_HEIGHT = 3;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function resolveAnchor(
  anchor: AnchorDef,
  bounds: RoomBounds,
  opts: ResolveOptions,
): [number, number, number] {
  const { xMin, xMax, zMin, zMax } = bounds;
  const cx = (xMin + xMax) / 2;
  const cz = (zMin + zMax) / 2;
  const d = opts.distFromWall ?? 0.3;

  switch (anchor.type) {
    case 'wall': {
      const { wall, along } = anchor;
      if (wall === 'W1') return [lerp(xMin, xMax, along), 0, zMin + d];
      if (wall === 'W2') return [xMax - d, 0, lerp(zMin, zMax, along)];
      if (wall === 'W3') return [lerp(xMin, xMax, along), 0, zMax - d];
      /* W4 */           return [xMin + d, 0, lerp(zMin, zMax, along)];
    }
    case 'corner': {
      const { corner } = anchor;
      if (corner === 'NW') return [xMin + CORNER_INSET, 0, zMin + CORNER_INSET];
      if (corner === 'NE') return [xMax - CORNER_INSET, 0, zMin + CORNER_INSET];
      if (corner === 'SW') return [xMin + CORNER_INSET, 0, zMax - CORNER_INSET];
      /* SE */             return [xMax - CORNER_INSET, 0, zMax - CORNER_INSET];
    }
    case 'center':
      return [cx, 0, cz];
    case 'ceiling':
      return [cx, WALL_HEIGHT, cz];
    case 'object': {
      const parent = opts.resolvedParentPos ?? [cx, 0, cz];
      const off = opts.objectOffset ?? [0, 0, 0];
      return [parent[0] + off[0], parent[1] + off[1], parent[2] + off[2]];
    }
  }
}

export interface ResolvedItem {
  id: string;
  room: string;
  pos: [number, number, number];
}

export function validateLayout(
  items: ResolvedItem[],
  roomBounds: Record<string, RoomBounds>,
): string[] {
  const errors: string[] = [];
  for (const item of items) {
    const b = roomBounds[item.room];
    if (!b) { errors.push(`${item.id}: unknown room "${item.room}"`); continue; }
    const [x, , z] = item.pos;
    const margin = 0.05;
    if (x < b.xMin - margin || x > b.xMax + margin ||
        z < b.zMin - margin || z > b.zMax + margin) {
      errors.push(`${item.id}: pos [${x.toFixed(2)}, ${z.toFixed(2)}] outside room "${item.room}" bounds`);
    }
  }
  return errors;
}
```

- [ ] **Step 2.5: Run tests — expect pass**

```bash
cd frontend && npx vitest run src/test/anchorResolver.test.ts 2>&1 | tail -10
```

Expected: All tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add src/constants/roomBounds.ts src/utils/anchorResolver.ts src/test/anchorResolver.test.ts
git commit -m "feat(anchor): room bounds + anchor resolver with validation"
```

---

## Task 3: Rewrite RoomFurniture.tsx — Anchor-Driven + Ceiling Fans

**Files:**
- Replace: `src/components/canvas/RoomFurniture.tsx`

This file reads `anchorLayout.json`, resolves every piece through `anchorResolver.ts`, runs `validateLayout` (logs warnings, never throws), then renders. Ceiling fans get a `useFrame` spin animation that activates when the store's `isFanOn` or `lightsOn` state is true for that room.

- [ ] **Step 3.1: Rewrite RoomFurniture.tsx**

```typescript
import { useRef, useEffect, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import layout from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { resolveAnchor, validateLayout } from '../../utils/anchorResolver';
import type { AnchorDef } from '../../utils/anchorResolver';
import { useAppStore } from '../../store/store';

const QUAT = '/models/quaternius/';
const FURN = '/models/furniture/';

function modelUrl(model: string): string {
  if (model.startsWith('quat:')) return QUAT + model.slice(5) + '.glb';
  if (model.startsWith('furn:')) return FURN + model.slice(5) + '.glb';
  return model;
}

function groundAndScale(group: THREE.Group, size: number) {
  let box = new THREE.Box3().setFromObject(group);
  const s = box.getSize(new THREE.Vector3());
  const maxXZ = Math.max(s.x, s.z) || 1;
  group.scale.multiplyScalar(size / maxXZ);
  box = new THREE.Box3().setFromObject(group);
  group.position.y -= box.min.y;
  group.traverse((c) => {
    if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }
  });
}

function CeilingFan({ x, y, z, spinning }: { x: number; y: number; z: number; spinning: boolean }) {
  const { scene } = useGLTF(FURN + 'ceilingFan.glb');
  const blades = useRef<THREE.Object3D | null>(null);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    // Find blades mesh by traversal — typically named 'Blades' or 'Fan_Blades'
    cloned.traverse((c) => {
      if (c.name.toLowerCase().includes('blade') || c.name.toLowerCase().includes('fan')) {
        blades.current = c;
      }
    });
  }, [cloned]);

  useFrame((_, delta) => {
    if (blades.current && spinning) {
      blades.current.rotation.y += delta * 4; // 4 rad/s when on
    }
  });

  return (
    <group position={[x, y, z]}>
      <primitive object={cloned} />
    </group>
  );
}

function Piece({ model, pos, rot, size, isCeiling, spinning = false }: {
  model: string;
  pos: [number, number, number];
  rot: number;
  size: number;
  isCeiling?: boolean;
  spinning?: boolean;
}) {
  if (isCeiling) {
    return <CeilingFan x={pos[0]} y={pos[1]} z={pos[2]} spinning={spinning} />;
  }

  const url = modelUrl(model);
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => { if (ref.current) groundAndScale(ref.current, size); }, [size]);

  return (
    <group position={pos} rotation={[0, rot, 0]}>
      <group ref={ref}><primitive object={cloned} /></group>
    </group>
  );
}

type FurnitureDef = {
  id: string; model: string; anchor: AnchorDef;
  rot: number; size: number; distFromWall?: number;
  objectOffset?: [number, number, number];
};

export function RoomFurniture() {
  const placedObjects = useAppStore(s => s.placedObjects);

  const fanRoomIds = useMemo(() => {
    const s = new Set<string>();
    placedObjects.forEach(o => {
      if (o.type === 'ceiling-fan' && o.alexaDeviceState.isOn) {
        // ceiling fans live in the room where they're placed
        s.add(o.roomId ?? '');
      }
    });
    return s;
  }, [placedObjects]);

  const resolved = useMemo(() => {
    const items: Array<{
      id: string; room: string; model: string;
      pos: [number, number, number]; rot: number; size: number;
      isCeiling: boolean; spinning: boolean;
    }> = [];

    // Track resolved positions for object anchors
    const posById = new Map<string, [number, number, number]>();

    for (const [roomId, roomDef] of Object.entries(layout.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;

      for (const piece of (roomDef as any).furniture as FurnitureDef[]) {
        const anchor = piece.anchor as AnchorDef;
        const opts = {
          distFromWall: piece.distFromWall ?? 0.3,
          resolvedParentPos: anchor.type === 'object'
            ? posById.get(anchor.parentId)
            : undefined,
          objectOffset: piece.objectOffset,
        };
        const pos = resolveAnchor(anchor, bounds, opts);
        posById.set(piece.id, pos);

        const isCeiling = anchor.type === 'ceiling';
        const spinning = isCeiling && fanRoomIds.has(roomId);

        items.push({ id: piece.id, room: roomId, model: piece.model, pos, rot: piece.rot, size: piece.size, isCeiling, spinning });
      }
    }

    // Validate
    const errors = validateLayout(items.map(i => ({ id: i.id, room: i.room, pos: i.pos })), ROOM_BOUNDS);
    if (errors.length) console.warn('[RoomFurniture] placement warnings:', errors);

    return items;
  }, [fanRoomIds]);

  return (
    <Suspense fallback={null}>
      {resolved.map(item => (
        <Piece
          key={item.id}
          model={item.model}
          pos={item.pos}
          rot={item.rot}
          size={item.size}
          isCeiling={item.isCeiling}
          spinning={item.spinning}
        />
      ))}
    </Suspense>
  );
}

// Preload all models referenced in layout
Object.values(layout.rooms).forEach((room: any) => {
  room.furniture?.forEach((f: any) => {
    try { useGLTF.preload(modelUrl(f.model)); } catch {}
  });
});
```

- [ ] **Step 3.2: Start dev server and visually verify**

```bash
cd frontend && npm run dev
```

Open browser. Confirm:
- Furniture is placed inside room bounds (no items floating outside walls)
- Ceiling fans appear at y=3 in living room, bedroom, office centers
- Browser console shows no red errors (anchor warnings in yellow are OK)

- [ ] **Step 3.3: Commit**

```bash
git add src/components/canvas/RoomFurniture.tsx
git commit -m "feat(furniture): anchor-driven placement with ceiling fans and validation"
```

---

## Task 4: GLB Doors from Quaternius

**Files:**
- Replace: `src/components/canvas/Doors.tsx`

Replace the procedural door geometry with Quaternius GLB doors. Each door is placed at the wall position from `anchorLayout.json`. The swing animation lerps rotation.y from 0 → π/2 when `open=true`.

- [ ] **Step 4.1: Rewrite Doors.tsx**

```typescript
import { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';
import layout from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { resolveAnchor } from '../../utils/anchorResolver';

const QUAT = '/models/quaternius/';

function GLBDoor({
  model, x, z, wallAxis, swingDir = 1, open,
}: {
  model: string; x: number; z: number;
  wallAxis: 'X' | 'Z'; swingDir?: 1 | -1; open: boolean;
}) {
  const url = QUAT + model + '.glb';
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Scale to standard door size: 0.9m wide, 2.1m tall
    const box = new THREE.Box3().setFromObject(cloned);
    const s = box.getSize(new THREE.Vector3());
    const scaleY = 2.1 / (s.y || 1);
    const scaleXZ = 0.9 / (Math.max(s.x, s.z) || 1);
    cloned.scale.set(scaleXZ, scaleY, scaleXZ);
    // Sit on floor
    const box2 = new THREE.Box3().setFromObject(cloned);
    cloned.position.y -= box2.min.y;
    cloned.traverse(c => {
      if (c instanceof THREE.Mesh) { c.castShadow = true; c.receiveShadow = true; }
    });
  }, [cloned]);

  const baseRotY = wallAxis === 'Z' ? Math.PI / 2 : 0;
  const targetRotY = useRef(baseRotY);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const openAngle = baseRotY + swingDir * (Math.PI / 2);
    const closedAngle = baseRotY;
    targetRotY.current = open ? openAngle : closedAngle;
    const t = 1 - Math.exp(-0.012 * 60 * delta);
    groupRef.current.rotation.y += (targetRotY.current - groupRef.current.rotation.y) * t;
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      <primitive object={cloned} />
    </group>
  );
}

type DoorDef = { id: string; wall: string; along: number; model: string; swingDir?: 1 | -1 };

export function Doors() {
  const unlocked = useAppStore(s =>
    s.placedObjects.some(o => o.type === 'smart-lock' && o.alexaDeviceState.isLocked === false)
  );

  const doors = useMemo(() => {
    const result: Array<{
      key: string; model: string;
      x: number; z: number; wallAxis: 'X' | 'Z'; swingDir: 1 | -1;
    }> = [];

    for (const [roomId, roomDef] of Object.entries(layout.rooms)) {
      const bounds = ROOM_BOUNDS[roomId];
      if (!bounds) continue;
      for (const door of (roomDef as any).doors as DoorDef[]) {
        const anchor = { type: 'wall' as const, wall: door.wall as any, along: door.along };
        const [x, , z] = resolveAnchor(anchor, bounds, { distFromWall: 0 });
        const wallAxis: 'X' | 'Z' = (door.wall === 'W1' || door.wall === 'W3') ? 'X' : 'Z';
        result.push({
          key: door.id, model: door.model, x, z,
          wallAxis, swingDir: (door.swingDir ?? 1) as 1 | -1,
        });
      }
    }
    return result;
  }, []);

  return (
    <group>
      {doors.map(d => (
        <GLBDoor
          key={d.key}
          model={d.model}
          x={d.x}
          z={d.z}
          wallAxis={d.wallAxis}
          swingDir={d.swingDir}
          open={unlocked}
        />
      ))}
    </group>
  );
}

// Preload door models
['Door1','Door2','Door3','Door4','Door5','Door6','Door7','Door8'].forEach(m =>
  useGLTF.preload(QUAT + m + '.glb')
);
```

- [ ] **Step 4.2: Visually verify doors**

Check in browser:
- Doors appear at wall midpoints in each room
- Saying "unlock the door" (or toggling smart-lock in UI) causes doors to swing open
- Doors do not float or clip through walls significantly

- [ ] **Step 4.3: Commit**

```bash
git add src/components/canvas/Doors.tsx
git commit -m "feat(doors): GLB quaternius doors with wall-anchor placement"
```

---

## Task 5: Camera — Full OrbitControls with Room Focus

**Files:**
- Modify: `src/components/canvas/CameraController.tsx`
- Modify: `src/components/canvas/DigitalTwinCanvas.tsx` (enable OrbitControls pan)

The current camera uses orthographic + manual lerp. Keep the room-focus animation but ensure OrbitControls is enabled for pan (right drag), orbit (left drag), and zoom (scroll).

- [ ] **Step 5.1: Check current OrbitControls config in DigitalTwinCanvas.tsx**

```bash
grep -n "OrbitControls\|enablePan\|enableZoom\|enableRotate" frontend/src/components/canvas/DigitalTwinCanvas.tsx
```

- [ ] **Step 5.2: Enable full OrbitControls**

In `src/components/canvas/DigitalTwinCanvas.tsx`, find the `<OrbitControls` block and ensure it has:

```tsx
<OrbitControls
  makeDefault
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }}
  touches={{
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  }}
  minDistance={3}
  maxDistance={40}
  onStart={() => { cameraTransitionRef.current = false; }}
/>
```

- [ ] **Step 5.3: Verify camera in browser**

- Default view: isometric (camera at ~45°)
- Left-drag: orbits around scene
- Right-drag: pans
- Scroll: zooms
- Clicking a room in UI: camera smoothly animates to room focus, then allows manual orbit from that angle

- [ ] **Step 5.4: Commit**

```bash
git add src/components/canvas/DigitalTwinCanvas.tsx src/components/canvas/CameraController.tsx
git commit -m "feat(camera): full orbit/pan/zoom with smooth room-focus animation"
```

---

## Task 6: Curtains as Window Children

**Files:**
- Modify: `src/components/canvas/HouseDecor.tsx` — place windows from anchorLayout.json
- Modify: `src/components/canvas/Curtains.tsx` — become child of window, not standalone

Currently windows are hardcoded in `HouseDecor.tsx` and curtains are positioned independently. Curtains must be children of windows so they inherit position.

- [ ] **Step 6.1: Read current Curtains.tsx**

```bash
cat -n frontend/src/components/canvas/Curtains.tsx
```

- [ ] **Step 6.2: Rewrite Curtains.tsx — child of window**

Replace `src/components/canvas/Curtains.tsx`:

```typescript
import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../../store/store';

// Curtain is always rendered as a child of a <Window> group.
// Position is (0, 0, 0.08) — slightly in front of the wall plane.
// Only the fabric mesh animates (idle sway). The group never moves.
export function Curtain({ open }: { open?: boolean }) {
  const { scene } = useGLTF('/models/quaternius/CurtainsDouble.glb');
  const fabricRef = useRef<THREE.Object3D | null>(null);
  const swayRef = useRef(0);

  const cloned = useRef<THREE.Group | null>(null);
  if (!cloned.current) {
    cloned.current = scene.clone(true);
    // Scale to window width (~1.3m wide, 1.6m tall)
    const box = new THREE.Box3().setFromObject(cloned.current);
    const s = box.getSize(new THREE.Vector3());
    const scale = 1.3 / (Math.max(s.x, s.z) || 1);
    cloned.current.scale.set(scale, 1.5 / (s.y || 1), scale);
    cloned.current.traverse(c => {
      if (c.name.toLowerCase().includes('curtain') || c instanceof THREE.Mesh) {
        fabricRef.current = c;
      }
    });
  }

  useFrame((state) => {
    if (!fabricRef.current) return;
    swayRef.current = Math.sin(state.clock.elapsedTime * 0.5) * 0.012;
    fabricRef.current.rotation.z = swayRef.current;
  });

  return (
    <group position={[0, 0, 0.08]}>
      <primitive object={cloned.current} />
    </group>
  );
}

useGLTF.preload('/models/quaternius/CurtainsDouble.glb');
```

- [ ] **Step 6.3: Update HouseDecor.tsx — windows use layout JSON**

In `HouseDecor.tsx`, replace the hardcoded `Windows` function. Add imports at top:

```typescript
import layout from '../../constants/anchorLayout.json';
import { ROOM_BOUNDS } from '../../constants/roomBounds';
import { resolveAnchor } from '../../utils/anchorResolver';
import { Curtain } from './Curtains';
```

Replace the `Windows()` component with:

```typescript
const WALL_H = 3;
const WIN_Y = 1.5; // window center height

function ArchWindow({ x, z, rotY, model }: { x: number; z: number; rotY: number; model: string }) {
  const isLarge = model === 'WindowLarge';
  const W = isLarge ? 1.5 : 0.9;
  return (
    <group position={[x, WIN_Y, z]} rotation={[0, rotY, 0]}>
      {/* Frame */}
      <mesh castShadow>
        <boxGeometry args={[W + 0.12, 1.2, 0.1]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, 0, 0.03]}>
        <boxGeometry args={[W, 1.0, 0.02]} />
        <meshStandardMaterial color="#B3DEF5" emissive="#90C8E8" emissiveIntensity={0.25} transparent opacity={0.52} />
      </mesh>
      {/* Cross bar */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[W, 0.04, 0.04]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[0.04, 1.0, 0.04]} />
        <meshStandardMaterial color="#8B6F47" roughness={0.6} />
      </mesh>
      {/* Curtain as child — inherits this group's position */}
      <Curtain />
    </group>
  );
}

function Windows() {
  const wins: JSX.Element[] = [];
  for (const [roomId, roomDef] of Object.entries(layout.rooms)) {
    const bounds = ROOM_BOUNDS[roomId];
    if (!bounds) continue;
    for (const win of (roomDef as any).windows as Array<{ id: string; wall: string; along: number; model: string }>) {
      const anchor = { type: 'wall' as const, wall: win.wall as any, along: win.along };
      const [x, , z] = resolveAnchor(anchor, bounds, { distFromWall: 0 });
      // Wall-normal rotation: W1/W3 face south/north (rotY=0/π), W2/W4 face west/east (rotY=±π/2)
      const rotY = win.wall === 'W2' ? -Math.PI / 2
                 : win.wall === 'W4' ?  Math.PI / 2
                 : win.wall === 'W3' ?  Math.PI : 0;
      wins.push(<ArchWindow key={win.id} x={x} z={z} rotY={rotY} model={win.model} />);
    }
  }
  return <group>{wins}</group>;
}
```

Then in the `HouseDecor` component's return, replace `<Windows />` calls with the new `<Windows />`.

- [ ] **Step 6.4: Verify curtains in browser**

- Windows appear on correct exterior walls
- Each window has a curtain mesh beneath it
- Curtains gently sway (visible when zoomed in)
- No floating curtains exist outside of window groups

- [ ] **Step 6.5: Commit**

```bash
git add src/components/canvas/Curtains.tsx src/components/canvas/HouseDecor.tsx
git commit -m "feat(windows): anchor-placed windows with curtains as children"
```

---

## Task 7: Final Validation + Polish Pass

**Files:**
- Modify: `src/constants/anchorLayout.json` (fix any collision warnings from console)
- Modify: `src/components/canvas/RoomFurniture.tsx` (tweak sizes/offsets if needed after visual check)

- [ ] **Step 7.1: Run dev server and systematically check each room**

```bash
cd frontend && npm run dev
```

Check each room by clicking it in the room selector:

| Room | Verify |
|------|--------|
| Living Room | TV on console against N wall; sofa faces TV; ceiling fan at y=3; rug under coffee table |
| Master Bedroom | Bed against N wall; nightstands flanking bed; wardrobe on W wall; fan at y=3 |
| Bathroom | Bathtub on E wall; toilet on W wall; sink on N wall |
| Home Office | Desk on E wall; monitor on desk; bookshelf on W wall; fan at y=3 |
| Kitchen+Dining | Counter on E wall; fridge NE corner; dining table at center |
| Hallway | Rug at center; plant at SE corner |

- [ ] **Step 7.2: Fix any console validation warnings**

If `[RoomFurniture] placement warnings:` appears, adjust the offending piece's `distFromWall` or `along` value in `anchorLayout.json`.

- [ ] **Step 7.3: Run full test suite**

```bash
cd frontend && npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7.4: Final commit**

```bash
git add -A
git commit -m "feat(env-v4): complete architectural placement system — all rooms validated"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Room anchor system (W1/W2/W3/W4 + corners + center + ceiling + object) — Task 2
- [x] JSON layout spec first (Option C) — Task 1
- [x] Every object belongs to a room — anchorLayout.json structure
- [x] Curtains as children of windows — Task 6
- [x] Ceiling fans with spin animation on `isOn` — Task 3
- [x] GLB doors from quaternius — Task 4
- [x] `premium_tvconsole` with TV on top (object anchor) — Task 1 lr-tvconsole/lr-tv
- [x] Ground object anchors (nightstands off bed, monitor off desk) — Task 1
- [x] Full OrbitControls orbit/pan/zoom — Task 5
- [x] Validation pass before render — Task 2+3
- [x] Real-world scale 1 unit=1m — preserved from existing layout.ts

**Type consistency:** `AnchorDef`, `RoomBounds`, `resolveAnchor`, `validateLayout` — all used consistently across Tasks 2, 3, 4, 6.

**Placeholders:** None.
