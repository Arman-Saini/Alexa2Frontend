import { useCallback, useEffect, useRef, useState } from 'react';
import type { DerivedFrame, PipelinePlayer, Scenario, Stage } from './types';
import { deriveFrame, globalTToStage } from './deriveFrame';
import { defaultThemeForPose } from './poses';

// The one stateful smoothing in the whole engine (plan: "~k=3/s").
const THEME_DAMP_K = 3;

function themeTarget(stage: Stage): number {
  const theme = stage.theme ?? defaultThemeForPose(stage.cameraPose);
  return theme === 'light' ? 1 : 0;
}

/**
 * Single timeline engine: ONE rAF loop, all playback state in refs, React state
 * only for the reactive fields (scenario/playing/ended/stageIndex/stage) and only
 * set when they actually change. Every 60fps update flows through frameRef /
 * subscribe — never through setState.
 */
export function usePipelinePlayer(scenarios: Scenario[]): PipelinePlayer {
  // ── Authoritative playback state (refs only) ──────────────────────────
  const scenarioRef = useRef<Scenario | null>(null);
  const stageIndexRef = useRef<number>(-1);
  const stageTRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const endedRef = useRef<boolean>(false);
  const themeTRef = useRef<number>(0);

  const frameRef = useRef<DerivedFrame | null>(null);
  const subscribersRef = useRef<Set<(f: DerivedFrame) => void>>(new Set());

  const rafIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const wasPlayingRef = useRef<boolean>(false);

  const scenariosRef = useRef<Scenario[]>(scenarios);
  useEffect(() => {
    scenariosRef.current = scenarios;
  }, [scenarios]);

  // ── Reactive mirrors (React state — set only at boundaries, only on change) ──
  const [scenario, setScenarioState] = useState<Scenario | null>(null);
  const [playing, setPlayingState] = useState(false);
  const [ended, setEndedState] = useState(false);
  const [stageIndex, setStageIndexState] = useState(-1);
  const [stage, setStageState] = useState<Stage | null>(null);

  // Shadow refs tracking the last value actually committed to React state, so we
  // can guard every setState call with a real compare (never per-frame).
  const committedScenarioRef = useRef<Scenario | null>(null);
  const committedStageIndexRef = useRef<number>(-1);
  const committedStageRef = useRef<Stage | null>(null);
  const committedPlayingRef = useRef<boolean>(false);
  const committedEndedRef = useRef<boolean>(false);

  const syncReactiveState = useCallback(() => {
    const sc = scenarioRef.current;
    if (committedScenarioRef.current !== sc) {
      committedScenarioRef.current = sc;
      setScenarioState(sc);
    }
    const idx = stageIndexRef.current;
    if (committedStageIndexRef.current !== idx) {
      committedStageIndexRef.current = idx;
      setStageIndexState(idx);
    }
    const st = sc && idx >= 0 ? sc.stages[idx] : null;
    if (committedStageRef.current !== st) {
      committedStageRef.current = st;
      setStageState(st);
    }
    const pl = playingRef.current;
    if (committedPlayingRef.current !== pl) {
      committedPlayingRef.current = pl;
      setPlayingState(pl);
    }
    const en = endedRef.current;
    if (committedEndedRef.current !== en) {
      committedEndedRef.current = en;
      setEndedState(en);
    }
  }, []);

  // ── The one rAF loop ──────────────────────────────────────────────────
  const stopLoop = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  const tick = useCallback((timestamp: number) => {
    rafIdRef.current = requestAnimationFrame(tick);

    if (lastTimeRef.current == null) lastTimeRef.current = timestamp;
    const rawDt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    const dt = Math.min(rawDt, 100); // clamp: a hitch/tab-stall slows the demo, never skips stages

    const sc = scenarioRef.current;
    if (!sc) return;

    if (playingRef.current && !endedRef.current) {
      let remainingMs = dt;
      // Bounded by stage count; dt<=100ms and durationMs>=3000ms in practice means
      // this resolves in a single hop, but the loop stays correct for any values.
      let guard = sc.stages.length + 2;
      while (remainingMs > 0 && guard-- > 0) {
        const curStage = sc.stages[stageIndexRef.current];
        const remainingStageMs = (1 - stageTRef.current) * curStage.durationMs;
        if (remainingMs < remainingStageMs) {
          stageTRef.current += remainingMs / curStage.durationMs;
          remainingMs = 0;
        } else {
          remainingMs -= remainingStageMs;
          if (stageIndexRef.current >= sc.stages.length - 1) {
            stageTRef.current = 1;
            playingRef.current = false;
            endedRef.current = true;
            remainingMs = 0;
          } else {
            stageIndexRef.current += 1;
            stageTRef.current = 0;
          }
        }
      }
    }

    const curStage = sc.stages[stageIndexRef.current];
    const target = themeTarget(curStage);
    const dtSec = dt / 1000;
    themeTRef.current += (target - themeTRef.current) * Math.min(1, THEME_DAMP_K * dtSec);

    frameRef.current = deriveFrame(sc, stageIndexRef.current, stageTRef.current, themeTRef.current);
    subscribersRef.current.forEach((cb) => cb(frameRef.current!));

    syncReactiveState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLoop = useCallback(() => {
    if (rafIdRef.current != null) return; // one loop only
    lastTimeRef.current = null;
    rafIdRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── visibilitychange: self-suspend while hidden ───────────────────────
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        wasPlayingRef.current = playingRef.current;
        playingRef.current = false;
        stopLoop();
        syncReactiveState();
      } else if (scenarioRef.current) {
        // lastTime was cleared by stopLoop, so the dt clamp is the backstop
        // against any giant gap; resuming here re-arms the single rAF loop.
        playingRef.current = wasPlayingRef.current;
        syncReactiveState();
        startLoop();
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [startLoop, stopLoop, syncReactiveState]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopLoop();
      subscribersRef.current.clear();
    };
  }, [stopLoop]);

  // ── Controls (stable identities) ──────────────────────────────────────
  const load = useCallback(
    (id: Scenario['id'], autoplay: boolean = false) => {
      const found = scenariosRef.current.find((s) => s.id === id) ?? null;
      stopLoop();
      scenarioRef.current = found;
      stageIndexRef.current = found ? 0 : -1;
      stageTRef.current = 0;
      playingRef.current = !!(found && autoplay);
      endedRef.current = false;
      frameRef.current = found ? deriveFrame(found, 0, 0, themeTRef.current) : null;
      syncReactiveState();
      if (found) startLoop();
    },
    [startLoop, stopLoop, syncReactiveState]
  );

  const play = useCallback(() => {
    if (!scenarioRef.current) return;
    playingRef.current = true;
    syncReactiveState();
    startLoop(); // idempotent — ensures the loop is running
  }, [startLoop, syncReactiveState]);

  const pause = useCallback(() => {
    playingRef.current = false;
    syncReactiveState();
  }, [syncReactiveState]);

  const next = useCallback(() => {
    const sc = scenarioRef.current;
    if (!sc) return;
    stageIndexRef.current = Math.min(stageIndexRef.current + 1, sc.stages.length - 1);
    stageTRef.current = 0;
    endedRef.current = false;
    syncReactiveState();
  }, [syncReactiveState]);

  const prev = useCallback(() => {
    const sc = scenarioRef.current;
    if (!sc) return;
    if (stageTRef.current > 0.15) {
      stageTRef.current = 0; // music-player semantics: restart current stage
    } else {
      stageIndexRef.current = Math.max(stageIndexRef.current - 1, 0);
      stageTRef.current = 0;
    }
    endedRef.current = false;
    syncReactiveState();
  }, [syncReactiveState]);

  const seekGlobal = useCallback(
    (t: number) => {
      const sc = scenarioRef.current;
      if (!sc) return;
      const { stageIndex: idx, stageT: st } = globalTToStage(sc, t);
      stageIndexRef.current = idx;
      stageTRef.current = st;
      endedRef.current = false;
      frameRef.current = deriveFrame(sc, idx, st, themeTRef.current);
      subscribersRef.current.forEach((cb) => cb(frameRef.current!));
      syncReactiveState();
    },
    [syncReactiveState]
  );

  const seekStage = useCallback(
    (index: number) => {
      const sc = scenarioRef.current;
      if (!sc) return;
      const idx = Math.max(0, Math.min(index, sc.stages.length - 1));
      stageIndexRef.current = idx;
      stageTRef.current = 0;
      endedRef.current = false;
      frameRef.current = deriveFrame(sc, idx, 0, themeTRef.current);
      subscribersRef.current.forEach((cb) => cb(frameRef.current!));
      syncReactiveState();
    },
    [syncReactiveState]
  );

  const stop = useCallback(() => {
    stopLoop();
    scenarioRef.current = null;
    stageIndexRef.current = -1;
    stageTRef.current = 0;
    playingRef.current = false;
    endedRef.current = false;
    frameRef.current = null;
    syncReactiveState();
  }, [stopLoop, syncReactiveState]);

  const subscribe = useCallback((cb: (f: DerivedFrame) => void) => {
    subscribersRef.current.add(cb);
    return () => {
      subscribersRef.current.delete(cb);
    };
  }, []);

  return {
    scenario,
    scenarios,
    playing,
    ended,
    stageIndex,
    stage,
    frameRef,
    subscribe,
    load,
    play,
    pause,
    next,
    prev,
    seekGlobal,
    seekStage,
    stop,
  };
}
