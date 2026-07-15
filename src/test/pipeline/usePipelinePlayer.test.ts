import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { usePipelinePlayer } from '../../components/final/pipeline/usePipelinePlayer';
import { SCENARIOS } from '../../components/final/pipeline/scenarios';
import type { DerivedFrame, PipelinePlayer } from '../../components/final/pipeline/types';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// ── Manual rAF pump ─────────────────────────────────────────────────────────
let rafCallbacks: Map<number, FrameRequestCallback>;
let nextRafId: number;
let now: number;

function installRafStub() {
  rafCallbacks = new Map();
  nextRafId = 1;
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback): number => {
    const id = nextRafId++;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number): void => {
    rafCallbacks.delete(id);
  });
}

/** Advance the clock by dtMs and flush every pending rAF callback once. */
function pump(dtMs: number) {
  now += dtMs;
  const cbs = [...rafCallbacks.values()];
  rafCallbacks.clear();
  act(() => {
    for (const cb of cbs) cb(now);
  });
}

// ── document.hidden control ─────────────────────────────────────────────────
function setDocumentHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
}
function restoreDocumentHidden() {
  delete (document as any).hidden; // fall back to the jsdom prototype getter
}

// ── Host harness (no @testing-library) ──────────────────────────────────────
let renderCount = 0;
let latest: PipelinePlayer = null as unknown as PipelinePlayer;

function Host() {
  renderCount++;
  latest = usePipelinePlayer(SCENARIOS);
  return null;
}

let container: HTMLDivElement;
let root: Root;

function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(createElement(Host));
  });
}

beforeEach(() => {
  installRafStub();
  renderCount = 0;
  mount();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  restoreDocumentHidden();
  vi.unstubAllGlobals();
});

describe('usePipelinePlayer — rAF loop discipline', () => {
  it('registers no rAF while idle, exactly one per frame cycle while loaded', () => {
    expect(rafCallbacks.size).toBe(0);
    act(() => latest.load('lights-t1'));
    expect(rafCallbacks.size).toBe(1);
    for (let i = 0; i < 5; i++) {
      pump(16);
      expect(rafCallbacks.size).toBe(1); // re-registered exactly once per tick
    }
    // play()/load() must never stack a second loop
    act(() => latest.play());
    act(() => latest.play());
    expect(rafCallbacks.size).toBe(1);
    pump(16);
    expect(rafCallbacks.size).toBe(1);
    act(() => latest.load('khata-t0', true));
    expect(rafCallbacks.size).toBe(1);
  });

  it('clamps dt: a 500ms frame gap advances stageT by at most 100ms worth', () => {
    act(() => latest.load('lights-t1', true));
    pump(16); // priming tick establishes lastTime (dt = 0)
    expect(latest.frameRef.current!.stageT).toBe(0);
    pump(500);
    const stage = SCENARIOS[0].stages[0];
    expect(latest.frameRef.current!.stageT).toBeGreaterThan(0);
    expect(latest.frameRef.current!.stageT).toBeLessThanOrEqual(100 / stage.durationMs + 1e-9);
  });
});

describe('usePipelinePlayer — no per-frame re-renders', () => {
  it('a full khata-t0 playthrough re-renders at most stages×2 + 8 times', () => {
    const scenario = SCENARIOS.find((s) => s.id === 'khata-t0')!;
    const totalMs = scenario.stages.reduce((s, st) => s + st.durationMs, 0);

    act(() => latest.load('khata-t0', true));
    pump(16); // prime
    const before = renderCount;
    // dt clamp caps each tick at 100ms of progress → pump 100ms ticks to the end.
    const ticks = Math.ceil(totalMs / 100) + 5;
    for (let i = 0; i < ticks; i++) pump(100);

    expect(latest.ended).toBe(true);
    expect(latest.playing).toBe(false);
    expect(renderCount).toBeLessThanOrEqual(scenario.stages.length * 2 + 8);
    // sanity: renders happened at boundaries, not per tick
    expect(renderCount - before).toBeLessThan(ticks / 4);
  });
});

describe('usePipelinePlayer — subscribe', () => {
  it('receives a frame every pumped tick; unsubscribe stops delivery', () => {
    act(() => latest.load('lights-t1'));
    const frames: DerivedFrame[] = [];
    const unsubscribe = latest.subscribe((f) => frames.push(f));
    pump(16);
    pump(16);
    pump(16);
    expect(frames.length).toBe(3);
    expect(frames[0].stage.id).toBe('wake');
    unsubscribe();
    pump(16);
    expect(frames.length).toBe(3);
  });
});

describe('usePipelinePlayer — seek and play semantics', () => {
  it('seekGlobal publishes a frame synchronously while paused', () => {
    act(() => latest.load('hue-t3'));
    const frames: DerivedFrame[] = [];
    latest.subscribe((f) => frames.push(f));
    act(() => latest.seekGlobal(0.5));
    expect(frames.length).toBe(1); // no pump needed
    expect(latest.frameRef.current!.globalT).toBeCloseTo(0.5, 6);
  });

  it('play after seekGlobal(0.5) resumes from ~0.5, not from 0', () => {
    act(() => latest.load('hue-t3'));
    pump(16); // establish lastTime while paused
    act(() => latest.seekGlobal(0.5));
    act(() => latest.play());
    pump(16);
    const g = latest.frameRef.current!.globalT;
    expect(g).toBeGreaterThan(0.5);
    expect(g).toBeLessThan(0.52);
  });

  it('play() resumes from the current position — it never restarts', () => {
    act(() => latest.load('lights-t1', true));
    pump(16);
    for (let i = 0; i < 10; i++) pump(100); // 1000ms into stage 0 (4000ms)
    const before = latest.frameRef.current!.stageT;
    expect(before).toBeGreaterThan(0.2);
    act(() => latest.pause());
    expect(latest.playing).toBe(false);
    pump(16); // paused ticks do not advance
    expect(latest.frameRef.current!.stageT).toBeCloseTo(before, 9);
    act(() => latest.play());
    pump(16);
    expect(latest.frameRef.current!.stageT).toBeGreaterThanOrEqual(before);
    expect(latest.frameRef.current!.stageT).toBeLessThan(before + 0.02);
  });
});

describe('usePipelinePlayer — prev()/next() semantics', () => {
  it('next() snaps to the start of the next stage and clamps at the last', () => {
    act(() => latest.load('khata-t0'));
    act(() => latest.next());
    expect(latest.stageIndex).toBe(1);
    pump(16);
    expect(latest.frameRef.current!.stageT).toBe(0);
    const last = SCENARIOS.find((s) => s.id === 'khata-t0')!.stages.length - 1;
    for (let i = 0; i < 10; i++) act(() => latest.next());
    expect(latest.stageIndex).toBe(last);
  });

  it('prev() from stageT > 0.15 restarts the current stage', () => {
    act(() => latest.load('khata-t0'));
    // globalT 0.2 of 45000ms = 9000ms → stage 1 (7000ms) at stageT ≈ 0.714
    act(() => latest.seekGlobal(0.2));
    expect(latest.stageIndex).toBe(1);
    expect(latest.frameRef.current!.stageT).toBeGreaterThan(0.15);
    act(() => latest.prev());
    expect(latest.stageIndex).toBe(1); // same stage…
    pump(16);
    expect(latest.frameRef.current!.stageT).toBe(0); // …restarted
  });

  it('prev() from stageT <= 0.15 snaps to the previous stage start and clamps at 0', () => {
    act(() => latest.load('khata-t0'));
    act(() => latest.seekStage(2));
    expect(latest.stageIndex).toBe(2);
    expect(latest.frameRef.current!.stageT).toBe(0);
    act(() => latest.prev());
    expect(latest.stageIndex).toBe(1);
    act(() => latest.prev());
    expect(latest.stageIndex).toBe(0);
    act(() => latest.prev());
    expect(latest.stageIndex).toBe(0);
  });
});

describe('usePipelinePlayer — visibilitychange', () => {
  it('suspends the loop while hidden and resumes honoring wasPlaying', () => {
    act(() => latest.load('lights-t1', true));
    pump(16);
    expect(rafCallbacks.size).toBe(1);

    setDocumentHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(rafCallbacks.size).toBe(0); // loop no longer re-registered
    pump(16); // pumping does nothing while suspended
    expect(rafCallbacks.size).toBe(0);

    setDocumentHidden(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(rafCallbacks.size).toBe(1);
    expect(latest.playing).toBe(true); // wasPlaying honored
    pump(16); // prime (lastTime cleared on suspend → no giant dt)
    const before = latest.frameRef.current!.stageT;
    pump(16);
    expect(latest.frameRef.current!.stageT).toBeGreaterThan(before);
  });

  it('does not force playback on resume when it was paused before hiding', () => {
    act(() => latest.load('lights-t1'));
    expect(latest.playing).toBe(false);

    setDocumentHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    setDocumentHidden(false);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(latest.playing).toBe(false); // wasPlaying = false honored
    expect(rafCallbacks.size).toBe(1); // loop still runs (themeT settling)
    pump(16);
    pump(16);
    expect(latest.frameRef.current!.stageT).toBe(0);
  });
});

describe('usePipelinePlayer — stop() and end behavior', () => {
  it('stop() clears the scenario, frameRef, and the loop', () => {
    act(() => latest.load('lights-t1', true));
    pump(16);
    expect(latest.frameRef.current).not.toBeNull();
    act(() => latest.stop());
    expect(latest.scenario).toBeNull();
    expect(latest.stageIndex).toBe(-1);
    expect(latest.stage).toBeNull();
    expect(latest.playing).toBe(false);
    expect(latest.ended).toBe(false);
    expect(latest.frameRef.current).toBeNull();
    expect(rafCallbacks.size).toBe(0);
  });

  it('reaching the end sets ended=true, playing=false, and clamps to the last stage', () => {
    act(() => latest.load('khata-t0', true));
    pump(16);
    const scenario = SCENARIOS.find((s) => s.id === 'khata-t0')!;
    const totalMs = scenario.stages.reduce((s, st) => s + st.durationMs, 0);
    for (let i = 0; i < Math.ceil(totalMs / 100) + 5; i++) pump(100);
    expect(latest.ended).toBe(true);
    expect(latest.playing).toBe(false);
    expect(latest.stageIndex).toBe(scenario.stages.length - 1);
    expect(latest.frameRef.current!.stageT).toBe(1);
    expect(latest.frameRef.current!.globalT).toBeCloseTo(1, 9);
  });
});
