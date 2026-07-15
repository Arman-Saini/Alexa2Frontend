import type { RefObject } from 'react';
import type { ChatSummary } from '../../phone/SmartphoneWidget';

export type TierId = 'IO' | 'T0' | 'T1' | 'T2' | 'T3'; // IO = bookends (wake/STT/translate/TTS/device)

export type CameraPose =
  | 'assembled'   // robot closed                       (s = 0)
  | 'shell-open'  // robot hinged open, CPU visible     (s = 0.22)
  | 'fanned'      // layers separated vertically        (s = 0.36)
  | 'splay-flat'  // 6 chips in a row, top-down, color  (s = 0.50)
  | 'blueprint'   // white trace/wireframe mode, labels (s = 0.55)
  | 'rejoin'      // layers re-stacking                 (s = 0.78)
  | 'closed';     // fully rejoined, zoomed out         (s = 1.00)

export type PathNodeId = 'mic' | 'device' | 'cloud' | 0 | 1 | 2 | 3 | 4 | 5;

export type EffectKind =
  | 'vault-write' | 'cache-set' | 'cache-hit' | 'rule-forge'
  | 'rule-promote' | 'event-log' | 'device-actuate'
  | 'session-buffer' | 'cloud-history-write';

export interface SideEffect {
  at: number;            // stageT ∈ [0,1] when it starts
  durationMs: number;
  kind: EffectKind;
  anchor: PathNodeId;
  label: string;         // e.g. '+₹40 · doodhwala', 'recall stored · TTL 30m'
}

export interface PulseSpec { bpm: number; strength: number } // strength 0..1

export type ExpressionType =
  | 'resting' | 'happy' | 'curious' | 'wink' | 'sleepy'
  | 'dizzy' | 'excited' | 'sad' | 'yawning';

export interface Stage {
  id: string;                  // unique within scenario, kebab-case
  tier: TierId;
  title: string;               // 'T1 · PERCEPTION — Local intent match'
  body: string;                // plain language, 1–2 sentences
  tech: string;                // mono sub-line: 'regex NLU · Hinglish patterns · <100ms · $0'
  badges?: string[];           // ['CACHE MISS', 'ESCALATE', 'AUTHORIZED', ...]
  activeLayer: number | null;  // 0..5 chip that lifts; null = none
  cameraPose: CameraPose;
  cameraFocus?: { layer: number; zoom: number }; // close-up (zoom ≈ 1.3–1.8 multiplier)
  flowPath: PathNodeId[];      // blood route for this stage
  pulse: PulseSpec;
  durationMs: number;          // autoplay dwell
  transitionFraction?: number; // fraction of stage spent interpolating pose; default 0.35
  theme?: 'dark' | 'light';    // default: light for splay-flat/blueprint, dark otherwise
  effects?: SideEffect[];
  latencyMs?: number;          // added to HUD ticker when stage completes
  costUsd?: number;
  expression?: ExpressionType;
}

export interface Scenario {
  id: 'lights-t1' | 'khata-t0' | 'hue-t3' | 'routine-t0' | 'storage-tour';
  label: string;
  utterance: string;
  language: 'en' | 'hinglish';
  finalTier: Exclude<TierId, 'IO'>;
  accent: string;              // tier hex color
  icon: string;
  stages: Stage[];
  summary: {
    response: string;
    latencyMs: number;
    costUsd: number;
    tierTag: NonNullable<ChatSummary['tier']>; // 'T0·local' | 'T1·local' | 'T3·cloud'
  };
}

export const TIER_META: Record<Exclude<TierId,'IO'>, { name: string; latency: string; color: string; blurb: string }> = {
  T0: { name: 'REFLEX',     latency: '<10ms',     color: '#3bf574', blurb: 'Compiled deterministic rules. On-device, free.' },
  T1: { name: 'PERCEPTION', latency: '<100ms',    color: '#3da5e0', blurb: 'Edge models: wake word, sound events, exact intent.' },
  T2: { name: 'RECALL',     latency: '100–500ms', color: '#e9b44c', blurb: "Semantic cache over T3's past answers. A cache, not a brain." },
  T3: { name: 'REASON',     latency: '0.5–3s',    color: '#ff3333', blurb: 'Bedrock: supervisor triage → specialist → authorizer gate.' },
};
export const IO_COLOR = '#b8afa4';

export interface ActiveEffect { kind: EffectKind; anchor: PathNodeId; label: string; progress: number } // 0..1

export interface DerivedFrame {
  cpuScrollProgress: number;      // feeds existing camera machine
  dismantleActive: boolean;
  explodedProgress: number;       // robot shell, same piecewise map as today
  layerLifts: [number,number,number,number,number,number];
  activeLayer: number | null;
  /** Medium-strength presentation focus. Other stack parts recede. */
  focusStrength: number;
  labelVisibility: [number,number,number,number,number,number];
  cameraFocus: { panX: number; zoomMul: number } | null; // → debugCamPanX / debugCamZoom
  heart: { bpm: number; strength: number; flowPath: PathNodeId[] };
  effects: ActiveEffect[];
  themeT: number;                 // 0 dark → 1 light (damped)
  stage: Stage; stageIndex: number; stageT: number;
  tickers: { latencyMs: number; costUsd: number };
  expression: ExpressionType;
  globalT: number;                 // scrubber thumb, duration-weighted [0,1]; not reactive state
}

export interface PipelinePlayer {
  // ── Reactive state: changes trigger React re-renders. These change at most
  //    once per stage boundary / user action — NEVER per animation frame.
  scenario: Scenario | null;
  scenarios: Scenario[];
  playing: boolean;
  ended: boolean;
  stageIndex: number;             // -1 when idle
  stage: Stage | null;
  // ── Imperative channel: updated every rAF tick, NO re-renders.
  frameRef: RefObject<DerivedFrame | null>;   // 3D reads this inside useFrame
  subscribe(cb: (f: DerivedFrame) => void): () => void; // HUD widgets (tickers,
                                  // scrubber thumb, stage arc) write DOM directly from here
  // ── Controls (stable identities via useCallback):
  load(id: Scenario['id'], autoplay?: boolean): void;
  play(): void; pause(): void;
  next(): void; prev(): void;
  seekGlobal(t: number): void;    // t ∈ [0,1] duration-weighted
  seekStage(index: number): void;
  stop(): void;
}
