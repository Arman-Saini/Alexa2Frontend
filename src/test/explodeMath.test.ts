import { describe, it, expect } from 'vitest';
import { easedExplodeProgress, layerTargetY } from '../utils/explodeMath';

describe('easedExplodeProgress', () => {
  it('is 0 before the start threshold', () => {
    expect(easedExplodeProgress(0.1)).toBe(0);
  });

  it('is 0 exactly at the start threshold', () => {
    expect(easedExplodeProgress(0.15)).toBe(0);
  });

  it('is 1 at and past full scroll', () => {
    expect(easedExplodeProgress(0.8)).toBe(1);
    expect(easedExplodeProgress(1.0)).toBe(1);
  });

  it('is exponential, not linear, at the midpoint', () => {
    const mid = easedExplodeProgress(0.15 + 0.65 / 2); // raw = 0.5
    expect(mid).toBeCloseTo(Math.pow(0.5, 2.6), 5);
    expect(mid).toBeLessThan(0.5); // stays under a linear curve until late scroll
  });
});

describe('layerTargetY', () => {
  it('returns closedY when eased is 0', () => {
    expect(layerTargetY(0.2, 4.8, 0)).toBeCloseTo(0.2);
  });

  it('returns expandedY when eased is 1', () => {
    expect(layerTargetY(0.2, 4.8, 1)).toBeCloseTo(4.8);
  });

  it('interpolates linearly between the two given an eased value', () => {
    expect(layerTargetY(0, 10, 0.5)).toBeCloseTo(5);
  });
});
