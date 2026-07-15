import * as THREE from 'three';
import type { PathNodeId } from './types';

/**
 * Pure per-frame target-position formula for a CPU stack layer, extracted
 * verbatim from FinalLayerGroup.tsx's useFrame (previously inlined at
 * lines ~177-221). Given a layer `index` (0..5) and the CPU dismantle
 * scroll progress `s` (0..1), returns the layer's local-space target X/Y
 * BEFORE damping is applied (FinalLayerGroup still damps toward this value
 * every frame — this function is the undamped target only).
 *
 * Do not change this math: FinalLayerGroup imports it directly and a
 * freeze test (src/test/pipeline/layerLayout.test.ts) locks the output
 * against hand-computed values from the original inline formula.
 */
export function layerTargetXY(index: number, s: number): { x: number; y: number } {
  let targetX = 0;
  let targetY = 0;

  if (s < 0.20) {
    // Phase 1: Rise stacked together (0.0 -> 0.20)
    targetX = 0;
    targetY = 0;
  } else if (s < 0.40) {
    // Phase 2: Separate vertically (0.20 -> 0.40) - separate downwards under base plate
    const t = (s - 0.20) / 0.20;
    targetX = 0;
    targetY = -index * 1.2 * t;
  } else if (s < 0.60) {
    // Phase 3-6: Horizontal Splay (0.40 -> 0.60)
    // Splay completes at scroll 0.50 and remains splayed.
    const splayT = s < 0.50 ? (s - 0.40) / 0.10 : 1.0;
    const splayX = (index - 2.5) * 6.5;

    targetX = THREE.MathUtils.lerp(0, splayX, splayT);
    targetY = THREE.MathUtils.lerp(-index * 1.2, 0, splayT);
  } else {
    // Phase 7: Sequential Joining (0.60 -> 1.00) - stack downwards under base plate
    const splayX = (index - 2.5) * 6.5;

    if (index === 0) {
      targetX = 0;
      targetY = 0;
    } else {
      const start = 0.60 + (index - 1) * 0.08;
      const end = start + 0.08;

      if (s < start) {
        targetX = splayX;
        targetY = 0;
      } else if (s < end) {
        const t = (s - start) / 0.08;
        const eased = THREE.MathUtils.smoothstep(t, 0, 1);
        targetX = THREE.MathUtils.lerp(splayX, 0, eased);
        targetY = THREE.MathUtils.lerp(0, -index * 0.22, eased);
      } else {
        targetX = 0;
        targetY = -index * 0.22;
      }
    }
  }

  return { x: targetX, y: targetY };
}

// Tunable world-space offsets applied to the IO/cloud path anchors relative
// to their nearest layer's target position (see pathAnchor below).
export const MIC_OFFSET_Y = 3.0;
export const DEVICE_OFFSET_Y = -3.0;
export const CLOUD_OFFSET_X = 4.0;
export const CLOUD_OFFSET_Y = 2.5;

/**
 * Resolves a blood-flow path node (numeric layer index, or one of the IO
 * bookends 'mic' | 'device' | 'cloud') to a world-ish local-space position
 * at CPU scroll progress `s`, reusing the same layerTargetXY layout the
 * chips themselves animate toward. Numeric nodes sit directly on their
 * layer's target position (z=0); 'mic' hovers above Layer 1; 'device'
 * sits below Layer 2; 'cloud' floats above-right of Layer 5.
 */
export function pathAnchor(node: PathNodeId, s: number): { x: number; y: number; z: number } {
  if (typeof node === 'number') {
    const { x, y } = layerTargetXY(node, s);
    return { x, y, z: 0 };
  }

  if (node === 'mic') {
    const { x, y } = layerTargetXY(1, s);
    return { x, y: y + MIC_OFFSET_Y, z: 0 };
  }

  if (node === 'device') {
    const { x, y } = layerTargetXY(2, s);
    return { x, y: y + DEVICE_OFFSET_Y, z: 0 };
  }

  // 'cloud'
  const { x, y } = layerTargetXY(5, s);
  return { x: x + CLOUD_OFFSET_X, y: y + CLOUD_OFFSET_Y, z: 0 };
}
