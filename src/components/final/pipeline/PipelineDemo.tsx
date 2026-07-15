// Self-contained pipeline-demo orchestrator: owns the player, quality/motion
// tiers, the canvas↔HUD bridge, theme lerp, end-reset crossfade and phone
// wiring. Consumed directly by ShowcaseLivePage (mode="full") and, in future,
// by an embedded side panel (mode="embedded", see PIPELINE_DEMO.md).
//
// This file does NOT modify any pipeline/* (W1-W4), Final* component or
// SmartphoneWidget — everything below works around their existing, frozen
// contracts.
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Link } from 'react-router-dom';
import { FinalAlexaCanvas } from '../FinalAlexaCanvas';
import { SmartphoneWidget, type ChatSummary } from '../../phone/SmartphoneWidget';
import { useIsMobileViewport } from '../../../hooks/useIsMobileViewport';
import { PipelineHud } from './PipelineHud';
import { PipelineGuideAvatar } from './PipelineGuideAvatar';
import { StorageGraph } from './StorageGraph';
import { usePipelinePlayer } from './usePipelinePlayer';
import { SCENARIOS } from './scenarios';
import { BASE_CAM_ZOOM } from './poses';
import { endResetFade, scenarioIntro } from './hudAnimations';
import {
  detectQuality,
  getMotionScale,
  type MotionScale,
  type Quality,
} from './quality';
import { IO_COLOR, TIER_META } from './types';
import type {
  ActiveEffect,
  DerivedFrame,
  ExpressionType,
  PathNodeId,
  Scenario,
  Stage,
  TierId,
} from './types';
import { TIER_TO_SCENARIO } from '../../../store/pipelineBridge';

export interface PipelineDemoProps {
  mode?: 'full' | 'embedded';
  initialScenarioId?: Scenario['id'];
  autoplay?: boolean;
  loop?: boolean;
  showPhone?: boolean;
  showHeader?: boolean;
  onStageChange?(e: { scenarioId: string; stageIndex: number; stage: Stage }): void;
  onScenarioEnd?(scenarioId: string): void;
  onExit?(): void;
  className?: string;
  /** External play command (e.g. from a bridge store): bump `token` to force
   * (re)loading `scenarioId`, including replaying the currently loaded one. */
  playRequest?: { scenarioId: Scenario['id']; token: number };
}

// ── Layer → tier mapping (plan's "Layer → tier mapping" table) ─────────────
const LABEL_OVERRIDES: ({ title: string; desc: string } | null)[] = [
  { title: 'T0 · REFLEX', desc: 'Rule engine, interceptors, fail-safes' },
  { title: 'T1 · PERCEPTION', desc: 'Wake word, STT feed, local NLU' },
  { title: 'ACTUATE', desc: 'MCP device interposer (executeTool)' },
  { title: 'T2 · RECALL', desc: 'Semantic cache & memory' },
  { title: 'GUARD', desc: 'authorizeTool() gate & rate limits' },
  { title: 'T3 · REASON', desc: 'Nova Micro triage → Claude Haiku specialist' },
];

function tierAccent(tier: TierId): string {
  return tier === 'IO' ? IO_COLOR : TIER_META[tier].color;
}

// ── Canvas bridge: the deliberate, bounded re-render exception (see report) ─
interface CanvasBridge {
  scrollProgress: number;
  explodedProgress: number;
  dismantleMode: boolean;
  layerLifts: number[];
  labelVisibility: number[];
  activeLayer: number | null;
  heart: { bpm: number; strength: number; flowPath: PathNodeId[] } | null;
  effects: ActiveEffect[];
  debugCamPanX: number;
  debugCamZoom: number;
  pulseBpm: number;
  heartAccent: string;
  highlightColors: string[];
}

const IDLE_BRIDGE: CanvasBridge = {
  scrollProgress: 0,
  explodedProgress: 0,
  dismantleMode: false,
  layerLifts: [0, 0, 0, 0, 0, 0],
  labelVisibility: [0, 0, 0, 0, 0, 0],
  activeLayer: null,
  heart: null,
  effects: [],
  debugCamPanX: 0,
  debugCamZoom: BASE_CAM_ZOOM,
  pulseBpm: 60,
  heartAccent: IO_COLOR,
  highlightColors: [],
};

function frameToBridge(frame: DerivedFrame): CanvasBridge {
  const accent = tierAccent(frame.stage.tier);
  return {
    scrollProgress: frame.cpuScrollProgress,
    explodedProgress: frame.explodedProgress,
    dismantleMode: frame.dismantleActive,
    layerLifts: frame.layerLifts,
    labelVisibility: frame.labelVisibility,
    activeLayer: frame.activeLayer,
    heart: frame.heart,
    effects: frame.effects,
    debugCamPanX: frame.cameraFocus?.panX ?? 0,
    debugCamZoom: BASE_CAM_ZOOM * (frame.cameraFocus?.zoomMul ?? 1),
    pulseBpm: frame.heart.bpm,
    heartAccent: accent,
    highlightColors: [accent, accent, accent, accent, accent, accent],
  };
}

// ── Theme bg lerp (dynamicTheme port) — direct DOM write, not React state ──
const THEME_BG_DARK = '#161514';
const THEME_BG_LIGHT = '#f5f2ec';

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function lerpHexColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const c = clamp01(t);
  return `rgb(${Math.round(ar + (br - ar) * c)}, ${Math.round(ag + (bg - ag) * c)}, ${Math.round(ab + (bb - ab) * c)})`;
}

const THEME_TEXT = {
  dark: { text: '#e0dbd5', subText: '#8e867b', border: 'rgba(255, 255, 255, 0.12)' },
  light: { text: '#1a1816', subText: '#7a7168', border: 'rgba(74, 65, 55, 0.15)' },
} as const;

// ── Quality: ?q=low / ?q=high escape hatch ──────────────────────────────────
function readQualityParam(): Quality | null {
  if (typeof window === 'undefined') return null;
  const q = new URLSearchParams(window.location.search).get('q');
  return q === 'low' || q === 'high' ? q : null;
}

function fmtTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatPulseRoute(stage: Stage): string {
  const names: Record<PathNodeId, string> = {
    mic: 'microphone', device: 'device', cloud: 'cloud',
    0: 'T0 Reflex', 1: 'T1 Perception', 2: 'Actuate',
    3: 'T2 Recall', 4: 'Guard', 5: 'T3 Reason',
  };
  return stage.flowPath.map((node) => names[node]).join(' → ') || 'response channel';
}

function finalResponseDetail(scenario: Scenario): string {
  const route = scenario.stages
    .map((stage) => stage.tier)
    .filter((tier, index, all) => index === 0 || tier !== all[index - 1])
    .join(' → ');
  return `Route: ${route}. ${TIER_META[scenario.finalTier].blurb}`;
}

export function PipelineDemo({
  mode = 'full',
  initialScenarioId,
  autoplay = true,
  loop,
  showPhone,
  showHeader,
  onStageChange,
  onScenarioEnd,
  onExit,
  className,
  playRequest,
}: PipelineDemoProps) {
  // Full-screen demo must finish before attention drops; embedded usage keeps
  // the original pace for pages that need more time beside it.
  const player = usePipelinePlayer(SCENARIOS, mode === 'full' ? 2.2 : 1);
  const isMobileViewport = useIsMobileViewport();
  const compact = mode === 'embedded' || isMobileViewport;
  const showPhoneResolved = showPhone ?? (mode === 'full' ? !isMobileViewport : false);
  const showHeaderResolved = showHeader ?? mode === 'full';
  const loopResolved = loop ?? mode === 'embedded';

  // ── Quality tiers + potato-PC FPS probe (one-way demotion) ───────────────
  const [quality, setQuality] = useState<Quality>(() => readQualityParam() ?? detectQuality());
  const qualityForcedRef = useRef(readQualityParam() !== null);
  const qualityRef = useRef(quality);
  useEffect(() => {
    qualityRef.current = quality;
  }, [quality]);
  const motionScale: MotionScale = useMemo(
    () => getMotionScale() * (quality === 'low' ? 0.5 : 1),
    [quality]
  );

  // The dismantled stages need an HDR environment. Preload local asset while
  // picker is visible, so later stage transitions never wait on remote CDN I/O.
  useEffect(() => {
    if (mode !== 'full') return;
    const existing = document.querySelector<HTMLLinkElement>('link[data-pipeline-hdri]');
    if (existing) return;
    const preload = document.createElement('link');
    preload.rel = 'preload';
    // Environment loader fetches HDR bytes, so preload with same destination
    // and CORS mode. This lets browser reuse response instead of double-fetch.
    preload.as = 'fetch';
    preload.href = '/hdri/interior_2k.hdr';
    preload.crossOrigin = 'anonymous';
    preload.dataset.pipelineHdri = 'true';
    document.head.appendChild(preload);
    return () => preload.remove();
  }, [mode]);

  // ── Refs for the imperative bits ──────────────────────────────────────────
  const pageRootRef = useRef<HTMLDivElement | null>(null);
  const hudWrapRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pickerSnapshotRef = useRef<HTMLElement | null>(null);
  const prevScenarioIdRef = useRef<string | null>(null);
  const themeBucketRef = useRef<'dark' | 'light'>('dark');
  const programmaticStopRef = useRef(false);
  const loadedSummaryIdRef = useRef<string | null>(null);
  const fpsProbeRef = useRef<{ ema: number; badSince: number | null }>({ ema: 16, badSince: null });
  const lastTsRef = useRef<number | null>(null);

  const onStageChangeRef = useRef(onStageChange);
  onStageChangeRef.current = onStageChange;
  const onScenarioEndRef = useRef(onScenarioEnd);
  onScenarioEndRef.current = onScenarioEnd;
  const onExitRef = useRef(onExit);
  onExitRef.current = onExit;

  // ── Embedded-mode viewport pause: mirrors of player state for the
  //    IntersectionObserver callback below (avoids stale closures without
  //    recreating the observer on every play/pause/stage tick) ─────────────
  const playingRef = useRef(player.playing);
  useEffect(() => {
    playingRef.current = player.playing;
  }, [player.playing]);
  const canResumeRef = useRef(false);
  useEffect(() => {
    canResumeRef.current = !!player.scenario && !player.ended;
  }, [player.scenario, player.ended]);
  const wasPlayingOnExitRef = useRef(false);

  // ── Reactive state (boundary-gated, per plan) ─────────────────────────────
  const [bridge, setBridge] = useState<CanvasBridge>(IDLE_BRIDGE);
  const [themeBucket, setThemeBucket] = useState<'dark' | 'light'>('dark');
  const [alexaOpacityOverride, setAlexaOpacityOverride] = useState<number | undefined>(undefined);
  const [cameraResetSignal, setCameraResetSignal] = useState<number | undefined>(undefined);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [phoneSummaries, setPhoneSummaries] = useState<ChatSummary[]>([]);
  const [watchChip, setWatchChip] = useState<Scenario['id'] | null>(null);
  const prevPhoneSummariesRef = useRef<ChatSummary[]>([]);

  // ── Picker snapshot: clone the picker panel into our own overlay before it
  //    unmounts, so scenarioIntro's exit half has a real (visible) element to
  //    animate — PipelineHud (frozen, W3) swaps PromptPicker → HUD chrome the
  //    instant scenario becomes non-null, with no exit transition of its own.
  const snapshotPicker = useCallback(() => {
    const panel = hudWrapRef.current?.querySelector('[data-hud-picker]');
    if (panel && overlayRef.current) {
      const clone = panel.cloneNode(true) as HTMLElement;
      clone.style.pointerEvents = 'none';
      overlayRef.current.replaceChildren(clone);
      pickerSnapshotRef.current = clone;
    }
  }, []);

  const handleHudCaptureClick = useCallback(
    (e: ReactMouseEvent) => {
      if ((e.target as HTMLElement).closest('[data-picker-card]')) snapshotPicker();
    },
    [snapshotPicker]
  );

  // load() wrapper used by every PipelineDemo-initiated load (autoplay, the
  // phone "Watch how that worked" chip). Picker-card clicks call
  // player.load() directly from inside PipelineHud; the capture handler
  // above covers the snapshot for that path.
  const loadScenario = useCallback(
    (id: Scenario['id'], autoplayFlag = true) => {
      if (!player.scenario) snapshotPicker();
      player.load(id, autoplayFlag);
    },
    [player, snapshotPicker]
  );

  // ── Scenario-loaded boundary: phone summary push, scenarioIntro entrance,
  //    bridge seed (avoids a 1-frame flash of idle defaults). Fires exactly
  //    once per fresh load, regardless of which path triggered it.
  useLayoutEffect(() => {
    const curId = player.scenario?.id ?? null;
    const prevId = prevScenarioIdRef.current;
    prevScenarioIdRef.current = curId;

    if (curId && curId !== prevId) {
      const scenario = player.scenario!;
      if (player.frameRef.current) setBridge(frameToBridge(player.frameRef.current));

      if (showPhoneResolved) {
        const summaryId = `pl-${scenario.id}-${Date.now()}`;
        loadedSummaryIdRef.current = summaryId;
        setPhoneSummaries((prev) => [
          ...prev,
          {
            id: summaryId,
            timestamp: fmtTime(),
            utterance: scenario.utterance,
            response: 'I’m tracing this request through every decision now.',
            detail: 'Watch guide and colored pulse. Each stop explains what changed, why it ran, and whether data stayed local.',
            status: 'info',
            latency: 0,
            cost: 0,
          },
        ]);
      }

      const hudEl = hudWrapRef.current;
      const chromeEls = hudEl
        ? Array.from(hudEl.querySelectorAll<HTMLElement>('[data-hud-chrome]'))
        : [];
      if (chromeEls.length > 0) {
        const pickerEl = pickerSnapshotRef.current ?? document.createElement('div');
        scenarioIntro(pickerEl, chromeEls, motionScale);
      }
      if (pickerSnapshotRef.current) {
        const node = pickerSnapshotRef.current;
        pickerSnapshotRef.current = null;
        window.setTimeout(() => node.remove(), 260 * motionScale + 80);
      }
    } else if (!curId && prevId) {
      setBridge(IDLE_BRIDGE);
      if (!programmaticStopRef.current) onExitRef.current?.();
      programmaticStopRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.scenario]);

  // Phone mirrors active stage. This makes the response useful during the
  // animation instead of leaving user with an empty placeholder until finish.
  useEffect(() => {
    const summaryId = loadedSummaryIdRef.current;
    const stage = player.stage;
    if (!summaryId || !stage || player.ended) return;
    setPhoneSummaries((prev) =>
      prev.map((summary) =>
        summary.id === summaryId
          ? {
              ...summary,
              response: `Following pulse: ${stage.title.replace(/^.*?—\s*/, '')}`,
              detail: `${stage.body} Route: ${formatPulseRoute(stage)}.`,
            }
          : summary
      )
    );
  }, [player.ended, player.stage, player.stageIndex]);

  // ── onStageChange ──────────────────────────────────────────────────────
  useEffect(() => {
    if (player.scenario && player.stage && player.stageIndex >= 0) {
      onStageChangeRef.current?.({
        scenarioId: player.scenario.id,
        stageIndex: player.stageIndex,
        stage: player.stage,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.scenario, player.stageIndex, player.stage]);

  // ── Per-tick bridge: FPS probe + theme bg + throttled (~30fps) canvas props
  useEffect(() => {
    let lastWrite = 0;
    const unsub = player.subscribe((frame) => {
      const now = performance.now();

      if (!qualityForcedRef.current && qualityRef.current === 'high') {
        const dt = now - (lastTsRef.current ?? now);
        const probe = fpsProbeRef.current;
        probe.ema = probe.ema * 0.9 + dt * 0.1;
        if (probe.ema > 40) {
          if (probe.badSince == null) probe.badSince = now;
          else if (now - probe.badSince > 3000) setQuality('low');
        } else {
          probe.badSince = null;
        }
      }
      lastTsRef.current = now;

      if (now - lastWrite < 33) return; // cap at ~30fps
      lastWrite = now;

      if (pageRootRef.current) {
        pageRootRef.current.style.setProperty(
          '--pipeline-bg',
          lerpHexColor(THEME_BG_DARK, THEME_BG_LIGHT, frame.themeT)
        );
      }
      const bucket: 'dark' | 'light' = frame.themeT > 0.5 ? 'light' : 'dark';
      if (bucket !== themeBucketRef.current) {
        themeBucketRef.current = bucket;
        setThemeBucket(bucket);
      }

      setBridge(frameToBridge(frame));
    });
    return unsub;
  }, [player.subscribe]);

  // ── Embedded-mode viewport pause: pause when <25% visible, auto-resume only
  //    if we were the one who paused it (never fights a user's manual pause) ─
  useEffect(() => {
    if (mode !== 'embedded') return;
    if (typeof IntersectionObserver === 'undefined') return; // jsdom/test envs
    const el = pageRootRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < 0.25) {
          if (playingRef.current) {
            wasPlayingOnExitRef.current = true;
            player.pause();
          }
        } else if (wasPlayingOnExitRef.current) {
          wasPlayingOnExitRef.current = false;
          if (canResumeRef.current) player.play();
        }
      },
      { threshold: [0, 0.25] }
    );
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ── End reset: dwell → crossfade (endResetFade) → stop() at midpoint → loop
  useEffect(() => {
    if (!player.ended) return;
    const scenarioId = player.scenario?.id;
    if (!scenarioId) return;
    const scenario = player.scenario!;

    onScenarioEndRef.current?.(scenarioId);
    if (showPhoneResolved && loadedSummaryIdRef.current) {
      const summaryId = loadedSummaryIdRef.current;
      setPhoneSummaries((prev) =>
        prev.map((s) =>
          s.id === summaryId
            ? {
                ...s,
                response: `${scenario.summary.response} I completed this through ${scenario.summary.tierTag.replace('·', ' ')}.`,
                detail: finalResponseDetail(scenario),
                status: 'success',
                latency: scenario.summary.latencyMs,
                cost: scenario.summary.costUsd,
                tier: scenario.summary.tierTag,
              }
            : s
        )
      );
    }

    let cancelled = false;
    const dwellTimer = window.setTimeout(() => {
      if (cancelled) return;
      setAlexaOpacityOverride(0);
      const proxy = { v: 0 };
      const midMs = Math.max(0, 400 * motionScale);
      const midTimer = window.setTimeout(() => {
        if (cancelled) return;
        programmaticStopRef.current = true;
        player.stop();
      }, midMs);

      const anim = endResetFade(
        proxy,
        () => {
          if (!cancelled) setAlexaOpacityOverride(proxy.v);
        },
        motionScale
      );
      void anim.then(() => {
        window.clearTimeout(midTimer);
        if (cancelled) return;
        setAlexaOpacityOverride(undefined);
        if (loopResolved) loadScenario(scenarioId, true);
      });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(dwellTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.ended]);

  // ── Initial scenario (mount-only) ─────────────────────────────────────────
  useEffect(() => {
    if (initialScenarioId) loadScenario(initialScenarioId, autoplay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── External play command (e.g. pipelineBridge): bumping `token` (re)loads
  //    `scenarioId`, including replaying the one already playing — player.load
  //    fully resets, so re-invoking mid-idle or mid-play is safe. ────────────
  useEffect(() => {
    if (playRequest) loadScenario(playRequest.scenarioId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playRequest?.token]);

  // ── Phone wiring: live typed/spoken commands resolving → "Watch how that
  //    worked" chip (never auto-hijacks the canvas). ────────────────────────
  const handleSummariesChange = useCallback((next: ChatSummary[]) => {
    setPhoneSummaries(next);
    const prev = prevPhoneSummariesRef.current;
    for (const s of next) {
      if (s.tier && s.status !== 'info') {
        const prevEntry = prev.find((p) => p.id === s.id);
        if (!prevEntry?.tier) {
          const mapped = TIER_TO_SCENARIO[s.tier];
          if (mapped) setWatchChip(mapped);
          break;
        }
      }
    }
    prevPhoneSummariesRef.current = next;
  }, []);

  const expression: ExpressionType = player.stage ? player.stage.expression ?? 'resting' : 'happy';
  const isStorageTour = player.scenario?.id === 'storage-tour';
  const themeVars = THEME_TEXT[themeBucket];

  const containerCls =
    mode === 'full'
      ? 'fixed inset-0 overflow-hidden select-none font-sans transition-colors duration-150'
      : 'absolute inset-0 overflow-hidden select-none font-sans transition-colors duration-150';

  return (
    <div
      ref={pageRootRef}
      className={`${containerCls}${className ? ` ${className}` : ''}`}
      style={
        {
          background: 'var(--pipeline-bg, #161514)',
          color: themeVars.text,
          '--pipeline-bg': THEME_BG_DARK,
        } as React.CSSProperties
      }
    >
      {/* Noise texture (ported from ShowcaseLivePage) */}
      <div
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {showHeaderResolved && (
        <header className="absolute top-0 left-0 right-0 z-40 flex flex-col md:flex-row items-center justify-between px-6 py-4 gap-4 pointer-events-none md:px-8">
          <div className="flex items-center space-x-3 pointer-events-auto w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-[#3a7ca5] animate-pulse" />
              <span
                className="text-xs font-bold tracking-[0.2em] font-mono transition-colors duration-300"
                style={{ color: themeBucket === 'light' ? themeVars.subText : '#B8AFA4' }}
              >
                ALEXA.LIVE
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full border border-[#3bf574]/30 text-[#3bf574] bg-[#3bf574]/5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3bf574] animate-pulse" />
                LIVE
              </span>
            </div>
            <Link
              to="/showcase"
              className="md:hidden flex items-center space-x-2 px-3 py-1 text-[10px] font-mono tracking-wider transition-all duration-200 border bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662]"
              style={{ borderColor: themeVars.border, color: themeVars.text }}
            >
              ← BACK
            </Link>
          </div>
          <div className="pointer-events-auto flex items-center space-x-3">
            <Link
              to="/showcase"
              className="hidden md:flex items-center space-x-2 px-4 py-1.5 text-xs font-mono tracking-wider transition-all duration-200 border bg-black/30 hover:bg-[#C08662]/10 hover:border-[#C08662] hover:text-[#C08662]"
              style={{ borderColor: themeVars.border, color: themeVars.text }}
            >
              ← BACK TO SHOWCASE
            </Link>
          </div>
        </header>
      )}

      {/* 3D Canvas */}
      <div className="relative w-full h-full flex items-center justify-center z-10">
        <div className="absolute inset-0">
          <FinalAlexaCanvas
            expression={expression}
            bodyColor="#e2d5c3"
            ledColor="#00f3ff"
            ledMode="pulse"
            outlineThickness={1.3}
            explodedProgress={bridge.explodedProgress}
            isPanelOpen={isPanelOpen}
            setIsPanelOpen={setIsPanelOpen}
            isSpeaking={false}
            isSinging={false}
            dismantleMode={bridge.dismantleMode}
            cpuScrollProgress={bridge.scrollProgress}
            resetSignal={cameraResetSignal}
            debugCamPanX={bridge.debugCamPanX}
            debugCamZoom={bridge.debugCamZoom}
            alexaOpacityOverride={alexaOpacityOverride}
            layerLifts={bridge.layerLifts}
            labelVisibility={bridge.labelVisibility}
            focusLayer={bridge.activeLayer}
            labelOverrides={LABEL_OVERRIDES}
            labelTheme={themeBucket}
            pulseBpm={bridge.pulseBpm}
            highlightColors={bridge.highlightColors}
            heart={bridge.heart}
            effects={bridge.effects}
            quality={quality}
            heartAccent={bridge.heartAccent}
          />
        </div>

        {!player.scenario && (
          <div className="absolute bottom-6 left-6 right-6 flex justify-between text-[10px] font-mono text-[#7A7168] pointer-events-none z-20">
            <div>DRAG TO ROTATE</div>
            <div className="text-[#B8AFA4]">PICK A PROMPT TO WATCH THE PIPELINE THINK</div>
          </div>
        )}

        {!player.scenario && watchChip && mode === 'full' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const id = watchChip;
                setWatchChip(null);
                loadScenario(id, true);
              }}
              className="text-[11px] font-mono flex items-center gap-2 px-5 h-9 rounded-full shadow-lg border transition-all duration-200 hover:scale-105"
              style={{
                background: `${TIER_META[SCENARIOS.find((s) => s.id === watchChip)?.finalTier ?? 'T1'].color}18`,
                borderColor: `${TIER_META[SCENARIOS.find((s) => s.id === watchChip)?.finalTier ?? 'T1'].color}60`,
                color: TIER_META[SCENARIOS.find((s) => s.id === watchChip)?.finalTier ?? 'T1'].color,
              }}
            >
              <span>▶</span>
              <span>Watch how that worked</span>
            </button>
          </div>
        )}
      </div>

      {/* Picker-exit ghost overlay (see snapshotPicker) */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-30" />

      <div ref={hudWrapRef} onClickCapture={handleHudCaptureClick}>
        <PipelineHud
          player={player}
          compact={compact}
          themeBucket={themeBucket}
          motionScale={motionScale}
          onResetCamera={() => setCameraResetSignal((n) => (n ?? 0) + 1)}
        />
      </div>

      {isStorageTour && <StorageGraph stageIndex={player.stageIndex} stage={player.stage} />}

      {mode === 'full' && !isMobileViewport && player.scenario && !isStorageTour && (
        <PipelineGuideAvatar
          scenario={player.scenario}
          stage={player.stage}
          stageIndex={player.stageIndex}
        />
      )}

      {showPhoneResolved && !isStorageTour && (
        <div
          style={{
            position: 'fixed',
            bottom: 'var(--space-6, 24px)',
            right: 'var(--space-6, 24px)',
            zIndex: 50,
            pointerEvents: 'auto',
          }}
        >
          <SmartphoneWidget
            customSummaries={phoneSummaries}
            onSummariesChange={handleSummariesChange}
            showExitButton={false}
          />
        </div>
      )}
    </div>
  );
}

export default PipelineDemo;
