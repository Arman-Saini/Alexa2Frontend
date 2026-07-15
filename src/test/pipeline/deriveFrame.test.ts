import { describe, it, expect } from 'vitest';
import {
  deriveFrame,
  easeInOutQuad,
  smoothstep,
  stageBoundsMs,
  globalTToStage,
  visualLayerForStage,
} from '../../components/final/pipeline/deriveFrame';
import { SCENARIOS } from '../../components/final/pipeline/scenarios';
import { PULSE_IO } from '../../components/final/pipeline/poses';
import type { Scenario } from '../../components/final/pipeline/types';

function totalMs(scenario: Scenario): number {
  return scenario.stages.reduce((sum, s) => sum + s.durationMs, 0);
}

/** Mirrors the player's playback advance: stageT += dt/durationMs, carry remainder across boundaries. */
function stepTicks(scenario: Scenario, targetMs: number, tickMs: number) {
  let stageIndex = 0;
  let stageT = 0;
  let remaining = targetMs;
  while (remaining > 0) {
    const dt = Math.min(tickMs, remaining);
    remaining -= dt;
    let carryMs = dt;
    while (carryMs > 0) {
      const stage = scenario.stages[stageIndex];
      const remainingStageMs = (1 - stageT) * stage.durationMs;
      if (carryMs < remainingStageMs) {
        stageT += carryMs / stage.durationMs;
        carryMs = 0;
      } else {
        carryMs -= remainingStageMs;
        if (stageIndex >= scenario.stages.length - 1) {
          stageT = 1;
          carryMs = 0;
        } else {
          stageIndex += 1;
          stageT = 0;
        }
      }
    }
  }
  return { stageIndex, stageT };
}

describe('helpers', () => {
  it('easeInOutQuad hits 0 / 0.5 / 1 and clamps', () => {
    expect(easeInOutQuad(0)).toBe(0);
    expect(easeInOutQuad(0.5)).toBeCloseTo(0.5, 12);
    expect(easeInOutQuad(1)).toBe(1);
    expect(easeInOutQuad(-1)).toBe(0);
    expect(easeInOutQuad(2)).toBe(1);
  });

  it('smoothstep is 0 before a, 1 after b, 0.5 at midpoint', () => {
    expect(smoothstep(0.1, 0.2, 0.4)).toBe(0);
    expect(smoothstep(0.5, 0.2, 0.4)).toBe(1);
    expect(smoothstep(0.3, 0.2, 0.4)).toBeCloseTo(0.5, 12);
  });

  it('stageBoundsMs returns cumulative durations', () => {
    for (const scenario of SCENARIOS) {
      const bounds = stageBoundsMs(scenario);
      expect(bounds.length).toBe(scenario.stages.length);
      let sum = 0;
      for (let i = 0; i < scenario.stages.length; i++) {
        sum += scenario.stages[i].durationMs;
        expect(bounds[i]).toBe(sum);
      }
    }
  });

  it('globalTToStage maps 0 → first stage start and 1 → inside last stage', () => {
    for (const scenario of SCENARIOS) {
      expect(globalTToStage(scenario, 0)).toEqual({ stageIndex: 0, stageT: 0 });
      const end = globalTToStage(scenario, 1);
      expect(end.stageIndex).toBe(scenario.stages.length - 1);
      expect(end.stageT).toBeCloseTo(1, 9);
    }
  });
});

describe('deriveFrame determinism', () => {
  it('two calls with identical args produce JSON-deep-equal frames', () => {
    for (const scenario of SCENARIOS) {
      for (const [i, t] of [
        [0, 0], [0, 0.5], [1, 0.2], [scenario.stages.length - 1, 0.99],
      ] as [number, number][]) {
        const a = deriveFrame(scenario, i, t, 0.37);
        const b = deriveFrame(scenario, i, t, 0.37);
        expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
      }
    }
  });
});

describe('scrub-equals-play', () => {
  it("hue-t3 frame at globalT 0.42 equals the frame reached by 16ms ticks", () => {
    const scenario = SCENARIOS.find((s) => s.id === 'hue-t3')!;
    const targetMs = 0.42 * totalMs(scenario);

    const scrub = globalTToStage(scenario, 0.42);
    const scrubbed = deriveFrame(scenario, scrub.stageIndex, scrub.stageT, 0.5);

    const stepped = stepTicks(scenario, targetMs, 16);
    const played = deriveFrame(scenario, stepped.stageIndex, stepped.stageT, 0.5);

    expect(played.stageIndex).toBe(scrubbed.stageIndex);
    expect(Math.abs(played.cpuScrollProgress - scrubbed.cpuScrollProgress)).toBeLessThan(1e-6);
    for (let i = 0; i < 6; i++) {
      expect(Math.abs(played.layerLifts[i] - scrubbed.layerLifts[i])).toBeLessThan(1e-6);
    }
    expect(Math.abs(played.tickers.latencyMs - scrubbed.tickers.latencyMs)).toBeLessThan(1e-6);
    expect(Math.abs(played.tickers.costUsd - scrubbed.tickers.costUsd)).toBeLessThan(1e-6);
    // themeT deliberately excluded — it is stateful (damped by the hook) by design.
  });
});

describe('cpuScrollProgress continuity', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.id}: max |Δs| between adjacent 16ms samples < 0.02`, () => {
      const total = totalMs(scenario);
      let prevS: number | null = null;
      let maxDelta = 0;
      for (let ms = 0; ms <= total; ms += 16) {
        const { stageIndex, stageT } = globalTToStage(scenario, ms / total);
        const frame = deriveFrame(scenario, stageIndex, stageT, 0);
        if (prevS !== null) maxDelta = Math.max(maxDelta, Math.abs(frame.cpuScrollProgress - prevS));
        prevS = frame.cpuScrollProgress;
      }
      expect(maxDelta).toBeLessThan(0.02);
    });
  }
});

describe('tickers monotone', () => {
  for (const scenario of SCENARIOS) {
    it(`${scenario.id}: latencyMs and costUsd are non-decreasing in globalT`, () => {
      const total = totalMs(scenario);
      let prevLatency = -Infinity;
      let prevCost = -Infinity;
      for (let ms = 0; ms <= total; ms += 50) {
        const { stageIndex, stageT } = globalTToStage(scenario, ms / total);
        const { tickers } = deriveFrame(scenario, stageIndex, stageT, 0);
        expect(tickers.latencyMs).toBeGreaterThanOrEqual(prevLatency - 1e-9);
        expect(tickers.costUsd).toBeGreaterThanOrEqual(prevCost - 1e-9);
        prevLatency = tickers.latencyMs;
        prevCost = tickers.costUsd;
      }
    });

    it(`${scenario.id}: end-of-timeline tickers equal the sum over all stages`, () => {
      const expectedLatency = scenario.stages.reduce((s, st) => s + (st.latencyMs ?? 0), 0);
      const expectedCost = scenario.stages.reduce((s, st) => s + (st.costUsd ?? 0), 0);
      const { tickers } = deriveFrame(scenario, scenario.stages.length - 1, 1, 0);
      expect(tickers.latencyMs).toBeCloseTo(expectedLatency, 9);
      expect(tickers.costUsd).toBeCloseTo(expectedCost, 9);
    });
  }
});

describe('explodedProgress piecewise map', () => {
  // Synthetic single-stage scenario: assembled(implicit prev s=0) → closed (s=1),
  // transitionFraction 1 → cpuScrollProgress = easeInOutQuad(stageT). Inverting the
  // ease lets us place s exactly on the piecewise breakpoints of the exploded map.
  const synthetic = {
    id: 'lights-t1',
    label: 'synthetic', utterance: '', language: 'en', finalTier: 'T1',
    accent: '#fff', icon: 'x',
    stages: [{
      id: 'sweep', tier: 'IO', title: '', body: '', tech: '',
      activeLayer: null, cameraPose: 'closed', flowPath: [],
      pulse: PULSE_IO, durationMs: 10000, transitionFraction: 1,
    }],
    summary: { response: '', latencyMs: 0, costUsd: 0, tierTag: 'T1·local' },
  } as unknown as Scenario;

  function inverseEase(y: number): number {
    return y < 0.5 ? Math.sqrt(y / 2) : 1 - Math.sqrt((1 - y) / 2);
  }

  const cases: [number, number][] = [
    [0.05, 0],
    [0.175, 0.5],
    [0.4, 1],
    [0.675, 0.5],
    [0.9, 0],
  ];

  for (const [s, expected] of cases) {
    it(`s=${s} → explodedProgress ${expected}`, () => {
      const frame = deriveFrame(synthetic, 0, inverseEase(s), 0);
      expect(frame.cpuScrollProgress).toBeCloseTo(s, 9);
      expect(frame.explodedProgress).toBeCloseTo(expected, 6);
    });
  }
});

describe('effect windows', () => {
  // khata-t0 'vault' stage: vault-write at=0.2, durationMs 4000 over a 10000ms
  // stage → window [0.2, 0.6] in stageT.
  const scenario = SCENARIOS.find((s) => s.id === 'khata-t0')!;
  const stageIndex = scenario.stages.findIndex((s) => s.id === 'vault');
  const stage = scenario.stages[stageIndex];
  const effect = stage.effects![0];
  const start = effect.at;
  const end = effect.at + effect.durationMs / stage.durationMs;

  it('progress is 0 at window start', () => {
    const frame = deriveFrame(scenario, stageIndex, start, 0);
    expect(frame.effects.length).toBe(1);
    expect(frame.effects[0].kind).toBe(effect.kind);
    expect(frame.effects[0].progress).toBeCloseTo(0, 9);
  });

  it('progress is 1 at window end', () => {
    const frame = deriveFrame(scenario, stageIndex, end, 0);
    expect(frame.effects.length).toBe(1);
    expect(frame.effects[0].progress).toBeCloseTo(1, 9);
  });

  it('progress is linear at window midpoint', () => {
    const frame = deriveFrame(scenario, stageIndex, (start + end) / 2, 0);
    expect(frame.effects[0].progress).toBeCloseTo(0.5, 9);
  });

  it('effect is absent outside the window', () => {
    expect(deriveFrame(scenario, stageIndex, start - 0.01, 0).effects.length).toBe(0);
    expect(deriveFrame(scenario, stageIndex, end + 0.01, 0).effects.length).toBe(0);
  });
});

describe('frame field passthroughs', () => {
  it('uses medium-strength physical focus for every resolved layer', () => {
    const scenario = SCENARIOS.find((entry) => entry.id === 'lights-t1')!;
    const stageIndex = scenario.stages.findIndex((stage) => stage.id === 't1-nlu');
    const frame = deriveFrame(scenario, stageIndex, 0.7, 0);
    expect(frame.focusStrength).toBe(0.55);
    expect(frame.layerLifts[1]).toBeCloseTo(0.55, 12);
  });

  it('heart carries the stage pulse and flowPath; expression defaults to resting', () => {
    for (const scenario of SCENARIOS) {
      for (let i = 0; i < scenario.stages.length; i++) {
        const stage = scenario.stages[i];
        const frame = deriveFrame(scenario, i, 0.5, 0.25);
        expect(frame.heart.bpm).toBe(stage.pulse.bpm);
        expect(frame.heart.strength).toBe(stage.pulse.strength);
        expect(frame.heart.flowPath).toBe(stage.flowPath);
        expect(frame.expression).toBe(stage.expression ?? 'resting');
        expect(frame.stage).toBe(stage);
        expect(frame.stageIndex).toBe(i);
        expect(frame.stageT).toBe(0.5);
        expect(frame.themeT).toBe(0.25);
        expect(frame.activeLayer).toBe(visualLayerForStage(stage));
      }
    }
  });

  it('dismantleActive is false only in an assembled stage entered from assembled/start', () => {
    for (const scenario of SCENARIOS) {
      for (let i = 0; i < scenario.stages.length; i++) {
        const stage = scenario.stages[i];
        const prev = i > 0 ? scenario.stages[i - 1] : null;
        const expected = !(
          stage.cameraPose === 'assembled' && (i === 0 || prev?.cameraPose === 'assembled')
        );
        expect(deriveFrame(scenario, i, 0.5, 0).dismantleActive).toBe(expected);
      }
    }
  });

  it('labelVisibility mirrors the lift envelope only in splay-flat pose', () => {
    for (const scenario of SCENARIOS) {
      for (let i = 0; i < scenario.stages.length; i++) {
        const stage = scenario.stages[i];
        const frame = deriveFrame(scenario, i, 0.7, 0); // mid-stage: lift fully in
        const visualLayer = visualLayerForStage(stage);
        if (stage.cameraPose === 'splay-flat' && visualLayer !== null) {
          expect(frame.labelVisibility[visualLayer]).toBeCloseTo(
            frame.layerLifts[visualLayer], 12
          );
        } else {
          expect(frame.labelVisibility).toEqual([0, 0, 0, 0, 0, 0]);
        }
      }
    }
  });

  it('cameraFocus pans toward the focus layer and scales with the lift envelope', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'lights-t1')!;
    const i = scenario.stages.findIndex((s) => s.id === 't1-nlu'); // focus {layer:1, zoom:1.5}
    const mid = deriveFrame(scenario, i, 0.7, 0); // envelope = 1
    expect(mid.cameraFocus).not.toBeNull();
    expect(mid.cameraFocus!.panX).toBeCloseTo((1 - 2.5) * 1.3, 9);
    expect(mid.cameraFocus!.zoomMul).toBeCloseTo(1.5, 9);
    // envelope 0 at stage start → represented as null
    expect(deriveFrame(scenario, i, 0, 0).cameraFocus).toBeNull();
    // and at the very end of the stage (lift ramped fully out)
    expect(deriveFrame(scenario, i, 1, 0).cameraFocus).toBeNull();
  });

  it('globalT is the duration-weighted position', () => {
    const scenario = SCENARIOS[0];
    const total = totalMs(scenario);
    const frame = deriveFrame(scenario, 1, 0.5, 0);
    const expected = (scenario.stages[0].durationMs + 0.5 * scenario.stages[1].durationMs) / total;
    expect(frame.globalT).toBeCloseTo(expected, 9);
    expect(deriveFrame(scenario, 0, 0, 0).globalT).toBe(0);
    expect(deriveFrame(scenario, scenario.stages.length - 1, 1, 0).globalT).toBeCloseTo(1, 9);
  });
});
