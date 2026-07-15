import type { CameraPose, PulseSpec } from './types';

export const POSE_S: Record<CameraPose, number> = {
  assembled: 0,
  'shell-open': 0.22,
  fanned: 0.36,
  'splay-flat': 0.50,
  blueprint: 0.55,
  rejoin: 0.78,
  closed: 1.0,
};

export const LIFT_HEIGHT = 0.9;

// World pan per layer offset: (layer - 2.5) * 6.5 * 0.20 (group scale 0.20).
// FOCUS_PAN_PER_LAYER is the constant multiplier tuned visually against that formula.
export const FOCUS_PAN_PER_LAYER = 1.3;

export const BASE_CAM_ZOOM = 200;

export const PULSE_IO: PulseSpec = { bpm: 65, strength: 0.3 };
export const PULSE_T0: PulseSpec = { bpm: 110, strength: 0.25 };
export const PULSE_T1: PulseSpec = { bpm: 90, strength: 0.45 };
export const PULSE_T2: PulseSpec = { bpm: 75, strength: 0.55 };
export const PULSE_T3: PulseSpec = { bpm: 45, strength: 1.0 };

export function defaultThemeForPose(pose: CameraPose): 'dark' | 'light' {
  return pose === 'splay-flat' || pose === 'blueprint' ? 'light' : 'dark';
}
