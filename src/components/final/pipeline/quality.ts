export type Quality = 'high' | 'low';

export function detectQuality(): Quality {
  // Unavailable in SSR/jsdom test environments — fall back to the generous preset.
  if (typeof matchMedia === 'undefined' || typeof navigator === 'undefined') return 'high';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as any).deviceMemory ?? 8; // Chrome-only, default generous
  return cores <= 4 || mem <= 4 ? 'low' : 'high';
}

export const QUALITY_PRESETS = {
  high: { dpr: [1, 1.75] as [number, number], bloodCells: 24, cellSegments: 12,
          coreDetail: 1, coreGlowSprite: true, plateBreathes: true, ecgFps: 30 },
  low:  { dpr: [0.75, 1.25] as [number, number], bloodCells: 10, cellSegments: 6,
          coreDetail: 0, coreGlowSprite: false, plateBreathes: false, ecgFps: 15 },
} as const;

export type MotionScale = number; // 1 normally; 0.5 on quality 'low'; 0 when prefers-reduced-motion

export function getMotionScale(): MotionScale {
  if (typeof matchMedia === 'undefined') return 1;
  return matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1;
}
