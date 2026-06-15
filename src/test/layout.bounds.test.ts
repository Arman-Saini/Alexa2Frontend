import { describe, it, expect } from 'vitest';
import { DEFAULT_PLACED_OBJECTS } from '../constants/defaults';
import { DEFAULT_ROOMS } from '../constants/assets';

// Guards against the "furniture placed outside the house / wrong room" class of bugs.
// Every default object's centre must sit inside its room's footprint.

const roomById = new Map(DEFAULT_ROOMS.map((r) => [r.id, r]));

describe('default furniture placement', () => {
  it('every object references a real room', () => {
    for (const o of DEFAULT_PLACED_OBJECTS) {
      expect(roomById.has(o.parentRoomId ?? ''), `${o.id} → ${o.parentRoomId}`).toBe(true);
    }
  });

  it('every object centre is inside its room footprint', () => {
    const offenders: string[] = [];
    for (const o of DEFAULT_PLACED_OBJECTS) {
      const r = roomById.get(o.parentRoomId ?? '');
      if (!r) continue;
      const minX = r.position.x - r.width / 2;
      const maxX = r.position.x + r.width / 2;
      const minZ = r.position.z - r.depth / 2;
      const maxZ = r.position.z + r.depth / 2;
      const { x, z } = o.position;
      if (x < minX || x > maxX || z < minZ || z > maxZ) {
        offenders.push(`${o.id} (${x},${z}) outside ${r.id} x[${minX},${maxX}] z[${minZ},${maxZ}]`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('no two objects share the exact same footprint position (ceiling fixtures excepted)', () => {
    // Ceiling bulbs + fans intentionally share the room centre, so exclude them.
    const ceiling = new Set(['smart-bulb', 'ceiling-fan']);
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const o of DEFAULT_PLACED_OBJECTS) {
      if (ceiling.has(o.type)) continue;
      const key = `${o.position.x.toFixed(2)},${o.position.z.toFixed(2)}`;
      if (seen.has(key)) clashes.push(`${o.id} overlaps ${seen.get(key)} at ${key}`);
      else seen.set(key, o.id);
    }
    expect(clashes, clashes.join('\n')).toEqual([]);
  });
});
