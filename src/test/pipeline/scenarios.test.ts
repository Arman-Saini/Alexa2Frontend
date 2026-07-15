import { describe, it, expect } from 'vitest';
import { SCENARIOS } from '../../components/final/pipeline/scenarios';
import { POSE_S } from '../../components/final/pipeline/poses';
import { heartWave } from '../../components/final/pipeline/heartWave';
import { QUALITY_PRESETS } from '../../components/final/pipeline/quality';
import type { PathNodeId } from '../../components/final/pipeline/types';

const VALID_TIER_TAGS = ['T0·local', 'T1·local', 'T3·cloud'] as const;

function isValidPathNode(n: unknown): n is PathNodeId {
  return n === 'mic' || n === 'device' || n === 'cloud' || (typeof n === 'number' && n >= 0 && n <= 5);
}

describe('SCENARIOS data invariants', () => {
  it('has exactly 4 scenarios', () => {
    expect(SCENARIOS.length).toBe(4);
  });

  for (const scenario of SCENARIOS) {
    describe(`scenario ${scenario.id}`, () => {
      it('has unique stage ids', () => {
        const ids = scenario.stages.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
      });

      it('every stage has a valid activeLayer', () => {
        for (const stage of scenario.stages) {
          expect(stage.activeLayer === null || (stage.activeLayer >= 0 && stage.activeLayer <= 5)).toBe(true);
        }
      });

      it('every stage has a valid cameraPose (key of POSE_S)', () => {
        for (const stage of scenario.stages) {
          expect(Object.prototype.hasOwnProperty.call(POSE_S, stage.cameraPose)).toBe(true);
        }
      });

      it('every stage has durationMs >= 3000', () => {
        for (const stage of scenario.stages) {
          expect(stage.durationMs).toBeGreaterThanOrEqual(3000);
        }
      });

      it('every stage flowPath has valid nodes', () => {
        for (const stage of scenario.stages) {
          for (const node of stage.flowPath) {
            expect(isValidPathNode(node)).toBe(true);
          }
        }
      });

      it('every effect window is within [0,1.05]', () => {
        for (const stage of scenario.stages) {
          for (const effect of stage.effects ?? []) {
            expect(effect.at).toBeGreaterThanOrEqual(0);
            expect(effect.at).toBeLessThanOrEqual(1);
            const end = effect.at + effect.durationMs / stage.durationMs;
            expect(end).toBeLessThanOrEqual(1.05);
          }
        }
      });

      it('total scenario duration is between 40000 and 120000 ms', () => {
        const total = scenario.stages.reduce((sum, s) => sum + s.durationMs, 0);
        expect(total).toBeGreaterThanOrEqual(40000);
        expect(total).toBeLessThanOrEqual(120000);
      });

      it('summary.tierTag is a valid ChatSummary tier', () => {
        expect(VALID_TIER_TAGS).toContain(scenario.summary.tierTag);
      });
    });
  }
});

describe('heartWave', () => {
  it('returns values in [0, 1.7]', () => {
    for (let bpm of [45, 65, 90, 110]) {
      for (let t = 0; t < 5; t += 0.05) {
        const v = heartWave(t, bpm);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1.7);
      }
    }
  });

  it('is periodic with period 60/bpm seconds', () => {
    const bpm = 60;
    for (const t of [0, 0.1, 0.25, 0.5, 0.9, 1.3, 2.7]) {
      expect(Math.abs(heartWave(t, bpm) - heartWave(t + 1, bpm))).toBeLessThan(1e-9);
    }
  });

  it('handles negative t without throwing and stays in range', () => {
    for (const t of [-0.1, -1, -2.5]) {
      const v = heartWave(t, 75);
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1.7);
    }
  });
});

describe('QUALITY_PRESETS', () => {
  it('has exactly keys high and low', () => {
    expect(Object.keys(QUALITY_PRESETS).sort()).toEqual(['high', 'low']);
  });
});
