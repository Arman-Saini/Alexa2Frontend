import { describe, it, expect } from 'vitest';
import { resolveAnchor, validateLayout } from '../utils/anchorResolver';
import type { RoomBounds } from '../constants/roomBounds';

const lr: RoomBounds = { xMin: -1.5, xMax: 6.5, zMin: -5, zMax: 1 };

describe('resolveAnchor', () => {
  it('resolves W1 center along=0.5', () => {
    const [x, y, z] = resolveAnchor({ type: 'wall', wall: 'W1', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(2.5);   // lerp(-1.5, 6.5, 0.5)
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-5);    // zMin + 0
  });

  it('resolves W1 with distFromWall pushes into room', () => {
    const [, , z] = resolveAnchor({ type: 'wall', wall: 'W1', along: 0.5 }, lr, { distFromWall: 0.3 });
    expect(z).toBeCloseTo(-5 + 0.3);
  });

  it('resolves W2 center along=0.5', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W2', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(6.5);
    expect(z).toBeCloseTo(-2);    // lerp(-5, 1, 0.5)
  });

  it('resolves W3 center along=0.5', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W3', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(2.5);
    expect(z).toBeCloseTo(1);     // zMax - 0
  });

  it('resolves W3 with distFromWall pushes north into room', () => {
    const [, , z] = resolveAnchor({ type: 'wall', wall: 'W3', along: 0.5 }, lr, { distFromWall: 0.3 });
    expect(z).toBeCloseTo(1 - 0.3);  // zMax - distFromWall
  });

  it('resolves W4 center along=0.5', () => {
    const [x, , z] = resolveAnchor({ type: 'wall', wall: 'W4', along: 0.5 }, lr, { distFromWall: 0 });
    expect(x).toBeCloseTo(-1.5);
    expect(z).toBeCloseTo(-2);
  });

  it('resolves center anchor at room XZ midpoint', () => {
    const [x, y, z] = resolveAnchor({ type: 'center' }, lr, {});
    expect(x).toBeCloseTo(2.5);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-2);
  });

  it('resolves ceiling anchor at y=3', () => {
    const [x, y, z] = resolveAnchor({ type: 'ceiling' }, lr, {});
    expect(y).toBe(3);
    expect(x).toBeCloseTo(2.5);
    expect(z).toBeCloseTo(-2);
  });

  it('resolves NE corner with inset from NE', () => {
    const [x, , z] = resolveAnchor({ type: 'corner', corner: 'NE' }, lr, {});
    expect(x).toBeCloseTo(6.5 - 0.4);
    expect(z).toBeCloseTo(-5 + 0.4);
  });

  it('resolves object anchor using parent position + offset', () => {
    const parentPos: [number, number, number] = [2, 0, -3];
    const [x, y, z] = resolveAnchor(
      { type: 'object', parentId: 'lr-tvconsole' }, lr,
      { resolvedParentPos: parentPos, objectOffset: [0.5, 0, 0] }
    );
    expect(x).toBeCloseTo(2.5);
    expect(y).toBe(0);
    expect(z).toBeCloseTo(-3);
  });

  it('resolves object anchor with no offset uses parent position', () => {
    const parentPos: [number, number, number] = [3, 0, -4];
    const [x, , z] = resolveAnchor(
      { type: 'object', parentId: 'any' }, lr,
      { resolvedParentPos: parentPos }
    );
    expect(x).toBeCloseTo(3);
    expect(z).toBeCloseTo(-4);
  });
});

describe('validateLayout', () => {
  it('returns no errors for valid positions inside room bounds', () => {
    const errors = validateLayout(
      [{ id: 'a', room: 'livingRoom', pos: [2.5, 0, -2] }],
      { 'livingRoom': lr }
    );
    expect(errors).toHaveLength(0);
  });

  it('flags position outside room on x axis', () => {
    const errors = validateLayout(
      [{ id: 'a', room: 'livingRoom', pos: [10, 0, -2] }],
      { 'livingRoom': lr }
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('a');
  });

  it('flags unknown room', () => {
    const errors = validateLayout(
      [{ id: 'b', room: 'unknownRoom', pos: [0, 0, 0] }],
      { 'livingRoom': lr }
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('b');
  });

  it('allows positions just inside margin', () => {
    const errors = validateLayout(
      [{ id: 'c', room: 'livingRoom', pos: [-1.5 + 0.04, 0, -5 + 0.04] }],
      { 'livingRoom': lr }
    );
    expect(errors).toHaveLength(0);
  });
});
