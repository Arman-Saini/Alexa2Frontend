// PipelineHud render + interaction tests. @testing-library is not installed,
// so these use react-dom/client createRoot + act from 'react' directly.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PipelineHud } from '../../components/final/pipeline/PipelineHud';
import { SCENARIOS } from '../../components/final/pipeline/scenarios';
import type {
  DerivedFrame,
  PipelinePlayer,
} from '../../components/final/pipeline/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// anime.js drives its engine off requestAnimationFrame — make sure it exists.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16)) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) =>
    clearTimeout(id)) as unknown as typeof cancelAnimationFrame;
}

type Sub = (f: DerivedFrame) => void;

interface MockPlayer extends PipelinePlayer {
  emit(f: DerivedFrame): void;
}

// DerivedFrame-shaped object built from SCENARIOS[0] actuation stage.
function buildFrame(stageIndex = 2): DerivedFrame {
  const scenario = SCENARIOS[0];
  const stage = scenario.stages[stageIndex];
  return {
    cpuScrollProgress: 0.5,
    dismantleActive: true,
    explodedProgress: 1,
    layerLifts: [0, 0, 0, 0, 0, 0],
    activeLayer: stage.activeLayer,
    labelVisibility: [0, 0, 0, 0, 0, 0],
    cameraFocus: null,
    focusStrength: 0,
    heart: { bpm: stage.pulse.bpm, strength: stage.pulse.strength, flowPath: stage.flowPath },
    effects: [],
    themeT: 1,
    stage,
    stageIndex,
    stageT: 0.5,
    tickers: { latencyMs: 68, costUsd: 0.0038 },
    expression: 'resting',
    globalT: 0.42,
  };
}

function makePlayer(overrides: Partial<PipelinePlayer> = {}): MockPlayer {
  const subs = new Set<Sub>();
  const player: MockPlayer = {
    scenario: null,
    scenarios: SCENARIOS,
    playing: false,
    ended: false,
    stageIndex: -1,
    stage: null,
    frameRef: { current: buildFrame() },
    subscribe: vi.fn((cb: Sub) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    }),
    load: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    next: vi.fn(),
    prev: vi.fn(),
    seekGlobal: vi.fn(),
    seekStage: vi.fn(),
    stop: vi.fn(),
    emit: (f: DerivedFrame) => {
      for (const cb of subs) cb(f);
    },
    ...overrides,
  };
  return player;
}

function makeActivePlayer(stageIndex = 5, overrides: Partial<PipelinePlayer> = {}): MockPlayer {
  const scenario = SCENARIOS[0];
  return makePlayer({
    scenario,
    stageIndex,
    stage: scenario.stages[stageIndex],
    playing: true,
    frameRef: { current: buildFrame(stageIndex) },
    ...overrides,
  });
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

function render(player: PipelinePlayer, extra: { compact?: boolean } = {}) {
  act(() => {
    root.render(
      <PipelineHud player={player} themeBucket="dark" motionScale={1} compact={extra.compact} />
    );
  });
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
}

describe('PromptPicker', () => {
  it('renders one card per scenario when scenario is null', () => {
    render(makePlayer());
    const cards = container.querySelectorAll('[data-picker-card]');
    expect(cards.length).toBe(4);
    expect(container.textContent).toContain(SCENARIOS[0].utterance);
    expect(container.textContent).toContain(SCENARIOS[2].utterance);
  });

  it('clicking a card calls load(id, true)', () => {
    const player = makePlayer();
    render(player);
    const cards = container.querySelectorAll('[data-picker-card]');
    click(cards[2]);
    expect(player.load).toHaveBeenCalledTimes(1);
    expect(player.load).toHaveBeenCalledWith(SCENARIOS[2].id, true);
  });
});

describe('NarrationCard', () => {
  it('shows title, body and tech line for the active stage', () => {
    const player = makeActivePlayer(2);
    const stage = SCENARIOS[0].stages[2];
    render(player);
    expect(container.querySelector('[data-hud-title]')?.textContent).toBe(stage.title);
    expect(container.querySelector('[data-hud-body]')?.textContent).toBe(stage.body);
    expect(container.querySelector('[data-hud-tech]')?.textContent).toBe(stage.tech);
  });
});

describe('Transport', () => {
  it('wires prev / pause / next / end to the player methods', () => {
    const player = makeActivePlayer(2, { playing: true });
    render(player);
    click(container.querySelector('[aria-label="Previous stage"]')!);
    expect(player.prev).toHaveBeenCalledTimes(1);
    click(container.querySelector('[aria-label="Pause"]')!);
    expect(player.pause).toHaveBeenCalledTimes(1);
    click(container.querySelector('[aria-label="Next stage"]')!);
    expect(player.next).toHaveBeenCalledTimes(1);
    click(container.querySelector('[aria-label="End demo"]')!);
    expect(player.stop).toHaveBeenCalledTimes(1);
  });

  it('shows Play and calls play() when paused', () => {
    const player = makeActivePlayer(2, { playing: false });
    render(player);
    expect(container.querySelector('[aria-label="Pause"]')).toBeNull();
    click(container.querySelector('[aria-label="Play"]')!);
    expect(player.play).toHaveBeenCalledTimes(1);
    expect(player.pause).not.toHaveBeenCalled();
  });
});

describe('TimelineScrubber', () => {
  it('pointerdown at 50% of the track width calls seekGlobal(~0.5)', () => {
    const player = makeActivePlayer(2);
    render(player);
    const track = container.querySelector<HTMLDivElement>('[data-hud-scrubber]')!;
    track.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 0,
        right: 200,
        bottom: 24,
        width: 200,
        height: 24,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    act(() => {
      track.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 100 }));
    });
    expect(player.seekGlobal).toHaveBeenCalledTimes(1);
    const t = (player.seekGlobal as ReturnType<typeof vi.fn>).mock.calls[0][0] as number;
    expect(t).toBeCloseTo(0.5, 2);
  });
});

describe('StageRail', () => {
  it('renders one dot per stage and clicking a dot calls seekStage', () => {
    const player = makeActivePlayer(2);
    render(player);
    const dots = container.querySelectorAll('[data-stage-dot]');
    expect(dots.length).toBe(SCENARIOS[0].stages.length);
    click(container.querySelector('[data-stage-dot="2"]')!);
    expect(player.seekStage).toHaveBeenCalledTimes(1);
    expect(player.seekStage).toHaveBeenCalledWith(2);
  });
});

describe('card swap on rapid stage change', () => {
  it('3 rapid stage changes leave exactly one live card (and at most one ghost)', async () => {
    const scenario = SCENARIOS[0];
    render(makeActivePlayer(0));
    render(makeActivePlayer(1));
    render(makeActivePlayer(2));
    render(makeActivePlayer(3));

    const active = container.querySelectorAll('[data-hud-card="active"]');
    expect(active.length).toBe(1);
    expect(active[0].querySelector('[data-hud-title]')?.textContent).toBe(scenario.stages[3].title);
    expect(container.querySelectorAll('[data-hud-card="ghost"]').length).toBeLessThanOrEqual(1);

    // Let any in-flight exit animation settle inside act (avoids act warnings).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
    expect(container.querySelectorAll('[data-hud-card="active"]').length).toBe(1);
  });
});

describe('HUD tickers', () => {
  it('updates latency and cost when subscribe pushes a frame', () => {
    const player = makeActivePlayer(2);
    render(player);
    expect(() => {
      act(() => {
        player.emit(buildFrame(2));
      });
    }).not.toThrow();
    expect(container.querySelector('[data-hud-latency]')?.textContent).toBe('68ms');
    expect(container.querySelector('[data-hud-cost]')?.textContent).toBe('$0.0038');
  });
});

describe('compact mode', () => {
  it('renders the narration card as a full-width bottom sheet capped at 40vh', () => {
    render(makeActivePlayer(2), { compact: true });
    const card = container.querySelector<HTMLElement>('[data-hud-chrome="card"]')!;
    expect(card.className).toContain('max-h-[40vh]');
    expect(card.className).toContain('w-full');
    expect(card.className).not.toContain('w-[380px]');
  });
});
