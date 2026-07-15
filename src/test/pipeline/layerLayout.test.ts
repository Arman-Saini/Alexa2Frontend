import { describe, it, expect } from 'vitest';
import {
  layerTargetXY,
  pathAnchor,
  MIC_OFFSET_Y,
  DEVICE_OFFSET_Y,
  CLOUD_OFFSET_X,
  CLOUD_OFFSET_Y,
} from '../../components/final/pipeline/layerLayout';
import type { PathNodeId } from '../../components/final/pipeline/types';

/**
 * FREEZE TEST — these literals were hand-computed from the ORIGINAL inline
 * target-position formula in FinalLayerGroup.tsx's useFrame (lines ~177-221,
 * before extraction into layerLayout.ts), evaluated with THREE.MathUtils
 * semantics (lerp(x,y,t) = (1-t)*x + t*y; clamped hermite smoothstep).
 * They lock the extracted layerTargetXY against any behavioral drift.
 * Indexed as EXPECTED[s][index] -> { x, y }.
 */
const EXPECTED: Record<string, { x: number; y: number }[]> = {
  '0.1': [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ],
  '0.3': [
    { x: 0, y: 0 },
    { x: 0, y: -0.5999999999999999 },
    { x: 0, y: -1.1999999999999997 },
    { x: 0, y: -1.7999999999999994 },
    { x: 0, y: -2.3999999999999995 },
    { x: 0, y: -2.999999999999999 },
  ],
  '0.45': [
    { x: -8.124999999999998, y: 0 },
    { x: -4.874999999999999, y: -0.6000000000000001 },
    { x: -1.6249999999999996, y: -1.2000000000000002 },
    { x: 1.6249999999999996, y: -1.8000000000000003 },
    { x: 4.874999999999999, y: -2.4000000000000004 },
    { x: 8.124999999999998, y: -3.000000000000001 },
  ],
  '0.55': [
    { x: -16.25, y: 0 },
    { x: -9.75, y: 0 },
    { x: -3.25, y: 0 },
    { x: 3.25, y: 0 },
    { x: 9.75, y: 0 },
    { x: 16.25, y: 0 },
  ],
  '0.7': [
    { x: 0, y: 0 },
    { x: 0, y: -0.22 },
    { x: -2.742187499999999, y: -0.06875000000000012 },
    { x: 3.25, y: 0 },
    { x: 9.75, y: 0 },
    { x: 16.25, y: 0 },
  ],
  '1': [
    { x: 0, y: 0 },
    { x: 0, y: -0.22 },
    { x: 0, y: -0.44 },
    { x: 0, y: -0.66 },
    { x: 0, y: -0.88 },
    { x: 0, y: -1.1 },
  ],
};

describe('layerTargetXY freeze test (must match the original FinalLayerGroup formula)', () => {
  for (const [sKey, perIndex] of Object.entries(EXPECTED)) {
    const s = Number(sKey);
    for (let index = 0; index <= 5; index++) {
      it(`index ${index} at s=${sKey}`, () => {
        const { x, y } = layerTargetXY(index, s);
        expect(Math.abs(x - perIndex[index].x)).toBeLessThan(1e-9);
        expect(Math.abs(y - perIndex[index].y)).toBeLessThan(1e-9);
      });
    }
  }
});

describe('pathAnchor', () => {
  const ALL_NODES: PathNodeId[] = ['mic', 'device', 'cloud', 0, 1, 2, 3, 4, 5];

  it('returns finite numbers for all node ids at s=0.5', () => {
    for (const node of ALL_NODES) {
      const { x, y, z } = pathAnchor(node, 0.5);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(y)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
    }
  });

  it('numeric nodes sit exactly on their layerTargetXY position (z=0)', () => {
    for (const index of [0, 1, 2, 3, 4, 5] as const) {
      const anchor = pathAnchor(index, 0.5);
      const layer = layerTargetXY(index, 0.5);
      expect(anchor.x).toBe(layer.x);
      expect(anchor.y).toBe(layer.y);
      expect(anchor.z).toBe(0);
    }
  });

  it('IO anchors apply their exported offsets from the neighbouring layer', () => {
    const s = 0.5;
    const l1 = layerTargetXY(1, s);
    const l2 = layerTargetXY(2, s);
    const l5 = layerTargetXY(5, s);

    const mic = pathAnchor('mic', s);
    expect(mic.x).toBeCloseTo(l1.x, 12);
    expect(mic.y).toBeCloseTo(l1.y + MIC_OFFSET_Y, 12);

    const device = pathAnchor('device', s);
    expect(device.x).toBeCloseTo(l2.x, 12);
    expect(device.y).toBeCloseTo(l2.y + DEVICE_OFFSET_Y, 12);

    const cloud = pathAnchor('cloud', s);
    expect(cloud.x).toBeCloseTo(l5.x + CLOUD_OFFSET_X, 12);
    expect(cloud.y).toBeCloseTo(l5.y + CLOUD_OFFSET_Y, 12);
  });
});
