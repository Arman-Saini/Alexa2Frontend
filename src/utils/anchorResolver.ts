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
export const WALL_HEIGHT = 3.5;

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
      if (!opts.resolvedParentPos) {
        console.warn(`[anchorResolver] object anchor for parentId "${anchor.parentId}" has no resolved parent — falling back to room center`);
      }
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
      errors.push(`${item.id}: pos [${x.toFixed(2)}, ${z.toFixed(2)}] outside room "${item.room}"`);
    }
  }
  return errors;
}
