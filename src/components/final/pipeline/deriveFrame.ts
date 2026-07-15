// Pure derivation engine: (scenario, stageIndex, stageT, themeT) → DerivedFrame.
// NO React / three.js imports — plain Math only. Scrub-to-point === play-to-point:
// every value here is a pure function of its inputs (themeT is the one exception,
// owned and damped by the calling hook, then passed straight through).

import type {
  ActiveEffect,
  DerivedFrame,
  Scenario,
  Stage,
} from './types';
import { FOCUS_PAN_PER_LAYER, POSE_S } from './poses';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function easeInOutQuad(t: number): number {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

export function smoothstep(t: number, a: number, b: number): number {
  if (a === b) return t < a ? 0 : 1;
  const x = clamp01((t - a) / (b - a));
  return x * x * (3 - 2 * x);
}

// Cumulative durations, in ms: bounds[i] = sum(durationMs for stages[0..i]) inclusive.
export function stageBoundsMs(scenario: Scenario): number[] {
  const bounds: number[] = [];
  let sum = 0;
  for (const stage of scenario.stages) {
    sum += stage.durationMs;
    bounds.push(sum);
  }
  return bounds;
}

export function globalTToStage(
  scenario: Scenario,
  t: number
): { stageIndex: number; stageT: number } {
  const bounds = stageBoundsMs(scenario);
  const lastIdx = bounds.length - 1;
  const total = bounds[lastIdx] ?? 0;
  const clampedT = clamp01(t);
  const targetMs = clampedT * total;

  let stageIndex = bounds.findIndex((b) => targetMs < b);
  if (stageIndex === -1) stageIndex = lastIdx;

  const prevBound = stageIndex > 0 ? bounds[stageIndex - 1] : 0;
  const stage = scenario.stages[stageIndex];
  let stageT = stage.durationMs > 0 ? (targetMs - prevBound) / stage.durationMs : 0;
  stageT = clamp01(stageT);

  return { stageIndex, stageT };
}

function globalTFromStage(scenario: Scenario, stageIndex: number, stageT: number): number {
  const bounds = stageBoundsMs(scenario);
  const lastIdx = bounds.length - 1;
  const total = bounds[lastIdx] ?? 0;
  if (total <= 0) return 0;
  const prevBound = stageIndex > 0 ? bounds[stageIndex - 1] : 0;
  const stage = scenario.stages[stageIndex];
  const ms = prevBound + clamp01(stageT) * stage.durationMs;
  return clamp01(ms / total);
}

// Same piecewise map as ShowcaseLivePage.tsx:278-285, driven by cpuScrollProgress (s).
function explodedProgressFromS(s: number): number {
  if (s < 0.1) return 0;
  if (s < 0.25) return (s - 0.1) / 0.15;
  if (s < 0.6) return 1;
  return Math.max(0, 1 - (s - 0.6) / 0.15);
}

export function deriveFrame(
  scenario: Scenario,
  stageIndex: number,
  stageT: number,
  themeT: number
): DerivedFrame {
  const stage: Stage = scenario.stages[stageIndex];
  const prevStage: Stage | null = stageIndex > 0 ? scenario.stages[stageIndex - 1] : null;

  const tf = stage.transitionFraction ?? 0.35;
  const prevPoseS = prevStage ? POSE_S[prevStage.cameraPose] : 0;
  const poseS = POSE_S[stage.cameraPose];
  const easedT = easeInOutQuad(clamp01(stageT / tf));
  const cpuScrollProgress = prevPoseS + (poseS - prevPoseS) * easedT;

  const explodedProgress = explodedProgressFromS(cpuScrollProgress);

  // layerLifts: only the active layer ever lifts. Ramp in over [tf, tf+0.2], ramp
  // out over the last 10% of the stage. Pure fn of stageT → scrub-safe.
  const layerLifts: [number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0];
  if (stage.activeLayer !== null) {
    const liftIn = smoothstep(stageT, tf, tf + 0.2);
    const liftOut = 1 - smoothstep(stageT, 0.9, 1);
    layerLifts[stage.activeLayer] = liftIn * liftOut;
  }

  const labelVisibility: [number, number, number, number, number, number] =
    stage.cameraPose === 'splay-flat' ? [...layerLifts] : [0, 0, 0, 0, 0, 0];

  let cameraFocus: { panX: number; zoomMul: number } | null = null;
  if (stage.cameraFocus && stage.cameraPose === 'splay-flat') {
    const envelope = stage.activeLayer !== null ? layerLifts[stage.activeLayer] : 0;
    if (envelope > 0) {
      const panXFull = (stage.cameraFocus.layer - 2.5) * FOCUS_PAN_PER_LAYER;
      cameraFocus = {
        panX: panXFull * envelope,
        zoomMul: 1 + (stage.cameraFocus.zoom - 1) * envelope,
      };
    }
  }

  const effects: ActiveEffect[] = [];
  for (const effect of stage.effects ?? []) {
    const start = effect.at;
    const end = effect.at + effect.durationMs / stage.durationMs;
    if (stageT >= start && stageT <= end) {
      const span = end - start;
      const progress = span > 0 ? clamp01((stageT - start) / span) : 1;
      effects.push({ kind: effect.kind, anchor: effect.anchor, label: effect.label, progress });
    }
  }

  let latencyMs = 0;
  let costUsd = 0;
  for (let i = 0; i < stageIndex; i++) {
    latencyMs += scenario.stages[i].latencyMs ?? 0;
    costUsd += scenario.stages[i].costUsd ?? 0;
  }
  latencyMs += (stage.latencyMs ?? 0) * clamp01(stageT);
  costUsd += (stage.costUsd ?? 0) * clamp01(stageT);

  const dismantleActive = !(
    stage.cameraPose === 'assembled' &&
    (stageIndex === 0 || prevStage?.cameraPose === 'assembled')
  );

  const globalT = globalTFromStage(scenario, stageIndex, stageT);

  return {
    cpuScrollProgress,
    dismantleActive,
    explodedProgress,
    layerLifts,
    activeLayer: stage.activeLayer,
    labelVisibility,
    cameraFocus,
    heart: { bpm: stage.pulse.bpm, strength: stage.pulse.strength, flowPath: stage.flowPath },
    effects,
    themeT,
    stage,
    stageIndex,
    stageT,
    tickers: { latencyMs, costUsd },
    expression: stage.expression ?? 'resting',
    globalT,
  };
}
