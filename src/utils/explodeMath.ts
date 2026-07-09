import * as THREE from 'three';

/**
 * Maps virtual scroll offset (0-1) to an exponential explode progress (0-1).
 * Stays near 0 through most of the range, then snaps toward 1 late —
 * layers barely move until the last third of the scroll, then blow apart.
 */
export function easedExplodeProgress(
  scrollOffset: number,
  start = 0.15,
  range = 0.65,
  exponent = 2.6,
): number {
  const raw = THREE.MathUtils.clamp((scrollOffset - start) / range, 0, 1);
  return Math.pow(raw, exponent);
}

export function layerTargetY(closedY: number, expandedY: number, eased: number): number {
  return THREE.MathUtils.lerp(closedY, expandedY, eased);
}
