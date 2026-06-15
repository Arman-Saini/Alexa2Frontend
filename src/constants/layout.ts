import type { LayoutNode, WallSegment } from '../types';

// ── Smart-home floor plan , 13m × 10m, 1 world unit = 1 meter ───────────────────
// Origin centred. x: −6.5 (West/W4) → +6.5 (East/W2).  z: −5 (North/W1) → +5 (South/W3).
//
//   x:  -6.5      -1.5            6.5
//      +----------+----------------+  z=-5  (North / W1)
//      | MASTER   |                |
//      | BEDROOM  |   LIVING ROOM  |
//      |  5x5     |     8x6 (hero) |
//  z=0 +----------+                |
//      | BATHROOM |                |
//  z=1 |  5x2     +-------+--------+  z=1
//      +----------+ HALL  | KITCHEN|
//      | OFFICE   | WAY   | +DINING|
//      |  5x3     | 3x4   |  5x4   |
//      +----------+-------+--------+  z=5  (South / W3)
//
// Living room is open to the hallway on its SW (no wall on segment l→o).

export const LAYOUT_NODES: Record<string, LayoutNode> = {
  nw:  { id: 'nw',  x: -13, z: -10 },  // north-west corner
  nbl: { id: 'nbl', x:  -3, z: -10 },  // bedroom/living divider, north edge
  ne:  { id: 'ne',  x:  13, z: -10 },  // north-east corner
  e1:  { id: 'e1',  x:  13, z:   2 },  // living/kitchen divider, east edge
  se:  { id: 'se',  x:  13, z:  10 },  // south-east corner
  sf:  { id: 'sf',  x:   3, z:  10 },  // kitchen/hallway divider, south edge
  sg:  { id: 'sg',  x:  -3, z:  10 },  // hallway/office divider, south edge
  sw:  { id: 'sw',  x: -13, z:  10 },  // south-west corner
  wi:  { id: 'wi',  x: -13, z:   4 },  // bathroom/office divider, west edge
  wj:  { id: 'wj',  x: -13, z:   0 },  // bedroom/bathroom divider, west edge
  k:   { id: 'k',   x:  -3, z:   0 },  // bedroom SE / bathroom NE / living
  l:   { id: 'l',   x:  -3, z:   2 },  // living SW / hallway NW
  m:   { id: 'm',   x:  -3, z:   4 },  // bathroom SE / office NE / hallway
  o:   { id: 'o',   x:   3, z:   2 },  // living S / kitchen NW / hallway NE
};

const H = 3.5; // wall height (m)

export const WALL_SEGMENTS: WallSegment[] = [
  // ── Exterior perimeter ──────────────────────────────────────────────
  { id: 'ext-n-mb',  fromId: 'nw',  toId: 'nbl', height: H, sharedBy: ['master-bedroom'] },
  { id: 'ext-n-lr',  fromId: 'nbl', toId: 'ne',  height: H, sharedBy: ['living-room'] },
  { id: 'ext-e-lr',  fromId: 'ne',  toId: 'e1',  height: H, sharedBy: ['living-room'] },
  { id: 'ext-e-kt',  fromId: 'e1',  toId: 'se',  height: H, sharedBy: ['kitchen'] },
  { id: 'ext-s-kt',  fromId: 'se',  toId: 'sf',  height: H, sharedBy: ['kitchen'] },
  { id: 'ext-s-hw',  fromId: 'sf',  toId: 'sg',  height: H, sharedBy: ['hallway'] },
  { id: 'ext-s-of',  fromId: 'sg',  toId: 'sw',  height: H, sharedBy: ['office'] },
  { id: 'ext-w-of',  fromId: 'sw',  toId: 'wi',  height: H, sharedBy: ['office'] },
  { id: 'ext-w-ba',  fromId: 'wi',  toId: 'wj',  height: H, sharedBy: ['bathroom'] },
  { id: 'ext-w-mb',  fromId: 'wj',  toId: 'nw',  height: H, sharedBy: ['master-bedroom'] },

  // ── Interior dividers ───────────────────────────────────────────────
  { id: 'int-mb-lr', fromId: 'nbl', toId: 'k',   height: H, sharedBy: ['master-bedroom', 'living-room'] },
  { id: 'int-mb-ba', fromId: 'wj',  toId: 'k',   height: H, sharedBy: ['master-bedroom', 'bathroom'] },
  { id: 'int-ba-of', fromId: 'wi',  toId: 'm',   height: H, sharedBy: ['bathroom', 'office'] },
  { id: 'int-ba-lr', fromId: 'k',   toId: 'l',   height: H, sharedBy: ['bathroom', 'living-room'] },
  { id: 'int-ba-hw', fromId: 'l',   toId: 'm',   height: H, sharedBy: ['bathroom', 'hallway'] },
  { id: 'int-of-hw', fromId: 'm',   toId: 'sg',  height: H, sharedBy: ['office', 'hallway'] },
  { id: 'int-lr-kt', fromId: 'o',   toId: 'e1',  height: H, sharedBy: ['living-room', 'kitchen'] },
  { id: 'int-hw-kt', fromId: 'o',   toId: 'sf',  height: H, sharedBy: ['hallway', 'kitchen'] },
  // NOTE: l→o (z=1, x[-1.5,1.5]) intentionally has NO wall , living room is open to the hallway.
];
