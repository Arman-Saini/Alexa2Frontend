// Narration HUD for the pipeline demo — presentational only, anime.js + direct
// DOM (no 3D or legacy motion library imports, no playback logic). React
// re-renders happen ONLY on the player's reactive state (scenario / playing /
// ended / stageIndex / stage); every continuous value (tickers, scrubber
// thumb, stage arc) arrives via player.subscribe() and is written to the DOM
// directly.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { JSAnimation } from 'animejs';
import type { PipelinePlayer, Stage, TierId, DerivedFrame } from './types';
import { TIER_META, IO_COLOR } from './types';
import type { MotionScale } from './quality';
import { cardEnter, cardExit, badgesIn, pickerIn, tickerPop } from './hudAnimations';

export interface PipelineHudProps {
  player: PipelinePlayer;          // from types.ts
  compact?: boolean;               // mobile / embedded
  themeBucket: 'dark' | 'light';
  motionScale: MotionScale;
  onResetCamera?: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function tierAccent(tier: TierId): string {
  return tier === 'IO' ? IO_COLOR : TIER_META[tier].color;
}

function fmtExpectedLatency(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

function fmtExpectedCost(usd: number): string {
  return usd === 0 ? '$0' : `$${usd.toFixed(4)}`;
}

function hudVars(themeBucket: 'dark' | 'light', accent: string): CSSProperties {
  const dark = themeBucket === 'dark';
  return {
    '--hud-accent': accent,
    '--hud-border': `${accent}59`, // ~35% opacity accent border
    '--hud-glow': `${accent}22`,
    '--hud-bg': dark ? 'rgba(10, 9, 8, 0.88)' : 'rgba(250, 247, 242, 0.90)',
    '--hud-fg': dark ? '#ECE6DF' : '#1c1712',
    '--hud-fg-dim': dark ? 'rgba(236, 230, 223, 0.62)' : 'rgba(28, 23, 18, 0.62)',
    '--hud-chip-bg': dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
  } as CSSProperties;
}

// ── Card content (shared by the live card and the exiting ghost) ─────────────

function CardContent({ stage }: { stage: Stage }) {
  const accent = tierAccent(stage.tier);
  const tierLabel =
    stage.tier === 'IO' ? 'IO' : `${stage.tier} · ${TIER_META[stage.tier].name}`;
  return (
    <div className="px-4 pt-4 pb-3">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="rounded px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em]"
          style={{ color: accent, background: `${accent}18`, border: `1px solid ${accent}40` }}
        >
          {tierLabel}
        </span>
        {stage.tier !== 'IO' && (
          <span
            className="ml-auto rounded px-2 py-0.5 font-mono text-[9px] font-bold"
            style={{ color: accent, background: `${accent}12` }}
          >
            {TIER_META[stage.tier].latency}
          </span>
        )}
      </div>
      <h3
        data-hud-title
        className="mb-1.5 font-display text-base font-bold leading-snug"
        style={{ color: 'var(--hud-fg)' }}
      >
        {stage.title}
      </h3>
      <p data-hud-body className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--hud-fg-dim)' }}>
        {stage.body}
      </p>
      <div
        data-hud-tech
        className="mb-2 rounded px-2 py-1 font-mono text-[10px] tracking-wide"
        style={{
          color: 'var(--hud-fg-dim)',
          background: 'var(--hud-chip-bg)',
          border: '1px solid var(--hud-border)',
        }}
      >
        {stage.tech}
      </div>
      {stage.badges && stage.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {stage.badges.map((b) => (
            <span
              key={b}
              data-badge
              className="rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider"
              style={{ color: accent, border: `1px solid ${accent}59`, background: `${accent}0f` }}
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── NarrationCard ─────────────────────────────────────────────────────────────
// On stage change the new card content mounts (keyed) and runs cardEnter +
// badgesIn; the previous stage's content is kept in an absolutely-positioned
// ghost overlay running cardExit, removed on completion. In-flight animations
// are cancelled before starting new ones so rapid scrubbing always leaves
// exactly one live card and at most one ghost.

function NarrationCard({
  player,
  compact,
  motionScale,
}: {
  player: PipelinePlayer;
  compact: boolean;
  motionScale: MotionScale;
}) {
  const { scenario, stage, stageIndex } = player;
  const subscribe = player.subscribe;
  const frameRef = player.frameRef;

  const contentRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const latRef = useRef<HTMLSpanElement | null>(null);
  const costRef = useRef<HTMLSpanElement | null>(null);

  const enterAnimRef = useRef<JSAnimation | null>(null);
  const badgeAnimRef = useRef<JSAnimation | null>(null);
  const exitAnimRef = useRef<JSAnimation | null>(null);
  const popAnimsRef = useRef<JSAnimation[]>([]);
  const prevStageRef = useRef<Stage | null>(null);
  const exitKeyRef = useRef(0);
  const [exiting, setExiting] = useState<{ stage: Stage; key: number } | null>(null);

  // Stage swap: cancel in-flight enter/badge/pop animations, ghost the old card.
  useEffect(() => {
    if (!stage) return;
    const prev = prevStageRef.current;
    prevStageRef.current = stage;
    if (prev && prev !== stage) {
      setExiting({ stage: prev, key: ++exitKeyRef.current });
    }
    enterAnimRef.current?.cancel();
    badgeAnimRef.current?.cancel();
    const el = contentRef.current;
    if (el) {
      enterAnimRef.current = cardEnter(el, motionScale);
      const chips = Array.from(el.querySelectorAll<HTMLElement>('[data-badge]'));
      if (chips.length > 0) badgeAnimRef.current = badgesIn(chips, motionScale);
    }
    for (const a of popAnimsRef.current) a.cancel();
    popAnimsRef.current = [];
    if (latRef.current) popAnimsRef.current.push(tickerPop(latRef.current, motionScale));
    if (costRef.current) popAnimsRef.current.push(tickerPop(costRef.current, motionScale));
  }, [stage, motionScale]);

  // Ghost exit: one ghost at a time; replacing/unmounting cancels the old anim.
  useEffect(() => {
    if (!exiting) return;
    const el = ghostRef.current;
    if (!el) {
      setExiting(null);
      return;
    }
    const key = exiting.key;
    const anim = cardExit(el, motionScale);
    exitAnimRef.current = anim;
    void anim.then(() => {
      setExiting((cur) => (cur && cur.key === key ? null : cur));
    });
    return () => {
      anim.cancel();
    };
  }, [exiting, motionScale]);

  // Cancel everything on unmount.
  useEffect(
    () => () => {
      enterAnimRef.current?.cancel();
      badgeAnimRef.current?.cancel();
      exitAnimRef.current?.cancel();
      for (const a of popAnimsRef.current) a.cancel();
    },
    []
  );

  // Live tickers: direct textContent writes from subscribe, throttled to 10Hz.
  useEffect(() => {
    const write = (f: DerivedFrame) => {
      if (latRef.current) latRef.current.textContent = `${Math.round(f.tickers.latencyMs)}ms`;
      if (costRef.current) costRef.current.textContent = `$${f.tickers.costUsd.toFixed(4)}`;
    };
    const seed = frameRef.current;
    if (seed) write(seed);
    let last = 0;
    const unsub = subscribe((f) => {
      const now = performance.now();
      if (now - last < 100) return;
      last = now;
      write(f);
    });
    return unsub;
  }, [subscribe, frameRef]);

  if (!scenario || !stage) return null;

  const containerCls = compact
    ? 'pointer-events-auto relative w-full max-h-[40vh] overflow-y-auto overflow-x-hidden rounded-t-2xl'
    : 'pointer-events-auto absolute left-6 top-1/2 w-[380px] max-w-[92vw] -translate-y-1/2 rounded-2xl';

  return (
    <div
      data-hud-chrome="card"
      className={containerCls}
      style={{
        background: 'var(--hud-bg)',
        border: '1px solid var(--hud-border)',
        boxShadow: '0 0 40px var(--hud-glow), 0 20px 60px rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="relative">
        <div key={`${scenario.id}:${stageIndex}`} ref={contentRef} data-hud-card="active">
          <CardContent stage={stage} />
        </div>
        {exiting && (
          <div
            key={`ghost:${exiting.key}`}
            ref={ghostRef}
            data-hud-card="ghost"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            style={{ background: 'var(--hud-bg)' }}
          >
            <CardContent stage={exiting.stage} />
          </div>
        )}
      </div>
      <div
        className="flex items-center gap-3 border-t px-4 py-2.5"
        style={{ borderColor: 'var(--hud-border)' }}
      >
        <div className="ml-auto text-right">
          <div
            className="font-mono text-[8px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--hud-fg-dim)' }}
          >
            Latency
          </div>
          <span
            ref={latRef}
            data-hud-latency
            className="inline-block font-mono text-xs font-bold"
            style={{ color: 'var(--hud-fg)' }}
          >
            0ms
          </span>
        </div>
        <div className="text-right">
          <div
            className="font-mono text-[8px] uppercase tracking-[0.2em]"
            style={{ color: 'var(--hud-fg-dim)' }}
          >
            Cost
          </div>
          <span
            ref={costRef}
            data-hud-cost
            className="inline-block font-mono text-xs font-bold"
            style={{ color: 'var(--hud-fg)' }}
          >
            $0.0000
          </span>
        </div>
      </div>
    </div>
  );
}

// ── PromptPicker ─────────────────────────────────────────────────────────────

function PromptPicker({
  player,
  compact,
  motionScale,
}: {
  player: PipelinePlayer;
  compact: boolean;
  motionScale: MotionScale;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<JSAnimation | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const els = Array.from(grid.querySelectorAll<HTMLElement>('[data-picker-card]'));
    if (els.length > 0) animRef.current = pickerIn(els, motionScale);
    return () => {
      animRef.current?.cancel();
      animRef.current = null;
    };
  }, [motionScale]);

  return (
    <div className="absolute inset-0 grid place-items-center p-4">
      <div
        data-hud-picker
        className="pointer-events-auto w-full max-w-[92vw]"
        style={{ maxWidth: compact ? '92vw' : 680 }}
      >
        <div className="mb-4 text-center">
          <div
            className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.3em]"
            style={{ color: 'var(--hud-fg-dim)' }}
          >
            Pick a prompt
          </div>
          <div className="font-display text-lg font-bold" style={{ color: 'var(--hud-fg)' }}>
            Watch the pipeline think
          </div>
        </div>
        <div ref={gridRef} className="grid grid-cols-2 gap-3">
          {player.scenarios.map((s) => {
            const meta = TIER_META[s.finalTier];
            return (
              <button
                key={s.id}
                type="button"
                data-picker-card
                onClick={() => player.load(s.id, true)}
                className="rounded-2xl p-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--hud-bg)',
                  border: `1px solid ${meta.color}59`,
                  boxShadow: `0 0 24px ${meta.color}14`,
                  backdropFilter: 'blur(12px)',
                  opacity: 0, // pickerIn animates 0 → 1
                }}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xl leading-none">{s.icon}</span>
                  <span
                    className="flex-1 font-display text-sm font-bold leading-tight"
                    style={{ color: 'var(--hud-fg)' }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold"
                    style={{
                      color: meta.color,
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}40`,
                    }}
                  >
                    {s.finalTier}
                  </span>
                </div>
                <p className="mb-2 text-xs italic leading-relaxed" style={{ color: 'var(--hud-fg-dim)' }}>
                  “{s.utterance}”
                </p>
                <div
                  className="font-mono text-[9px] uppercase tracking-wider"
                  style={{ color: 'var(--hud-fg-dim)' }}
                >
                  ~{fmtExpectedLatency(s.summary.latencyMs)} · {fmtExpectedCost(s.summary.costUsd)} ·{' '}
                  <span style={{ color: meta.color }}>{meta.name}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── StageRail ────────────────────────────────────────────────────────────────
// One dot per stage, colored by tier. done = filled, active = ring + SVG
// progress arc (stroke-dashoffset written from subscribe, ~30fps), pending =
// dim. Dot size/position changes are plain CSS transitions.

const ARC_R = 9;
const ARC_BOX = 22;
const ARC_C = 2 * Math.PI * ARC_R;

function StageRail({ player, compact }: { player: PipelinePlayer; compact: boolean }) {
  const scenario = player.scenario;
  const stageIndex = player.stageIndex;
  const subscribe = player.subscribe;
  const arcRef = useRef<SVGCircleElement | null>(null);
  const lastRef = useRef(0);

  useEffect(() => {
    const unsub = subscribe((f) => {
      const now = performance.now();
      if (now - lastRef.current < 33) return; // ~30fps, timestamp-gated
      lastRef.current = now;
      const arc = arcRef.current;
      if (arc) {
        const t = Math.min(1, Math.max(0, f.stageT));
        arc.style.strokeDashoffset = String(ARC_C * (1 - t));
      }
    });
    return unsub;
  }, [subscribe]);

  if (!scenario) return null;
  const dotSize = compact ? 10 : 12;

  return (
    <div
      data-hud-chrome="rail"
      className="pointer-events-auto flex max-w-[92vw] flex-wrap items-center justify-center gap-1.5 rounded-full px-2.5 py-1"
      style={{ background: 'var(--hud-bg)', border: '1px solid var(--hud-border)', backdropFilter: 'blur(12px)' }}
    >
      {scenario.stages.map((stg, i) => {
        const color = tierAccent(stg.tier);
        const done = i < stageIndex;
        const active = i === stageIndex;
        const size = active ? ARC_BOX : dotSize;
        return (
          <button
            key={stg.id}
            type="button"
            data-stage-dot={i}
            title={stg.title}
            aria-label={`Go to stage ${i + 1}: ${stg.id}`}
            onClick={() => player.seekStage(i)}
            className="relative grid place-items-center rounded-full transition-all duration-300"
            style={{ width: size, height: size }}
          >
            <span
              className="rounded-full transition-all duration-300"
              style={{
                width: compact ? 6 : 8,
                height: compact ? 6 : 8,
                background: done || active ? color : 'transparent',
                border: `1px solid ${color}`,
                opacity: done || active ? 1 : 0.35,
                boxShadow: active ? `0 0 8px ${color}` : 'none',
              }}
            />
            {active && (
              <svg
                className="pointer-events-none absolute inset-0"
                viewBox={`0 0 ${ARC_BOX} ${ARC_BOX}`}
                width={size}
                height={size}
                aria-hidden="true"
              >
                <circle
                  cx={ARC_BOX / 2}
                  cy={ARC_BOX / 2}
                  r={ARC_R}
                  fill="none"
                  stroke={color}
                  strokeOpacity={0.25}
                  strokeWidth={1.5}
                />
                <circle
                  ref={arcRef}
                  data-hud-stage-arc
                  cx={ARC_BOX / 2}
                  cy={ARC_BOX / 2}
                  r={ARC_R}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeDasharray={ARC_C}
                  strokeDashoffset={ARC_C}
                  transform={`rotate(-90 ${ARC_BOX / 2} ${ARC_BOX / 2})`}
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── TimelineScrubber ─────────────────────────────────────────────────────────
// Re-implements the old AnimeTimelineScrubber drag interaction with pointer
// events and zero React state: the thumb is positioned from subscribe
// (style.left, ~30fps) and drags/clicks call player.seekGlobal(x / width).

function TimelineScrubber({ player, compact }: { player: PipelinePlayer; compact: boolean }) {
  const subscribe = player.subscribe;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    const unsub = subscribe((f) => {
      if (draggingRef.current) return; // the finger owns the thumb while dragging
      const now = performance.now();
      if (now - lastWriteRef.current < 33) return; // ~30fps
      lastWriteRef.current = now;
      if (thumbRef.current) thumbRef.current.style.left = `${f.globalT * 100}%`;
    });
    return unsub;
  }, [subscribe]);

  const seekFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width <= 0) return;
    const t = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (thumbRef.current) thumbRef.current.style.left = `${t * 100}%`;
    player.seekGlobal(t);
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggingRef.current = true;
    seekFromClientX(e.clientX);
    const onMove = (ev: PointerEvent) => {
      if (draggingRef.current) seekFromClientX(ev.clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={trackRef}
      data-hud-scrubber
      onPointerDown={onPointerDown}
      className="pointer-events-auto relative h-6 select-none rounded-full"
      style={{
        width: compact ? 120 : 180,
        background: 'var(--hud-chip-bg)',
        border: '1px solid var(--hud-border)',
        cursor: 'ew-resize',
        touchAction: 'none',
      }}
    >
      <div className="pointer-events-none absolute inset-x-2 inset-y-0 flex items-center justify-between">
        {Array.from({ length: 20 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          return (
            <div
              key={i}
              className="w-[1.2px]"
              style={{
                height: isMajor ? 8 : 4,
                backgroundColor: isMajor ? 'var(--hud-fg-dim)' : 'var(--hud-border)',
              }}
            />
          );
        })}
      </div>
      <div
        ref={thumbRef}
        data-hud-scrubber-thumb
        className="pointer-events-none absolute top-1/2"
        style={{
          left: '0%',
          transform: 'translate(-50%, -50%)',
          width: 2,
          height: 12,
          background: 'var(--hud-accent)',
          boxShadow: '0 0 6px var(--hud-accent)',
        }}
      />
    </div>
  );
}

// ── Transport ────────────────────────────────────────────────────────────────

function TransportButton({
  label,
  onClick,
  children,
  emphasis,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto grid h-7 min-w-7 place-items-center rounded-full px-1.5 font-mono text-[10px] font-bold transition-colors duration-200"
      style={{
        color: emphasis ? 'var(--hud-accent)' : 'var(--hud-fg)',
        background: emphasis ? 'var(--hud-glow)' : 'transparent',
        border: emphasis ? '1px solid var(--hud-border)' : '1px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

function Transport({ player, compact }: { player: PipelinePlayer; compact: boolean }) {
  const { playing } = player;
  return (
    <div
      data-hud-chrome="transport"
      className="pointer-events-auto flex max-w-[92vw] items-center gap-1.5 rounded-full px-2.5 py-1.5"
      style={{ background: 'var(--hud-bg)', border: '1px solid var(--hud-border)', backdropFilter: 'blur(12px)' }}
    >
      <TransportButton label="Previous stage" onClick={() => player.prev()}>
        ⏮
      </TransportButton>
      <TransportButton
        label={playing ? 'Pause' : 'Play'}
        onClick={() => (playing ? player.pause() : player.play())}
        emphasis
      >
        {playing ? '❚❚' : '▶'}
      </TransportButton>
      <TransportButton label="Next stage" onClick={() => player.next()}>
        ⏭
      </TransportButton>
      <TimelineScrubber player={player} compact={compact} />
      <button
        type="button"
        aria-label="End demo"
        onClick={() => player.stop()}
        className="pointer-events-auto ml-0.5 rounded-full px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] transition-colors duration-200"
        style={{ color: 'var(--hud-fg-dim)', border: '1px solid var(--hud-border)' }}
      >
        ✕ End
      </button>
    </div>
  );
}

// ── PipelineHud (root) ───────────────────────────────────────────────────────

export function PipelineHud({
  player,
  compact = false,
  themeBucket,
  motionScale,
  onResetCamera,
}: PipelineHudProps) {
  const { scenario, stage } = player;
  const accent = stage ? tierAccent(stage.tier) : scenario ? scenario.accent : IO_COLOR;

  return (
    <div
      data-pipeline-hud
      className="pointer-events-none absolute inset-0 z-30 font-sans"
      style={hudVars(themeBucket, accent)}
    >
      {onResetCamera && (
        <button
          type="button"
          aria-label="Reset camera"
          onClick={onResetCamera}
          className="pointer-events-auto absolute right-4 top-4 rounded-full px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.2em] transition-colors duration-300"
          style={{
            background: 'var(--hud-bg)',
            border: '1px solid var(--hud-border)',
            color: 'var(--hud-fg-dim)',
            backdropFilter: 'blur(12px)',
          }}
        >
          Reset Camera
        </button>
      )}
      {!scenario ? (
        <PromptPicker player={player} compact={compact} motionScale={motionScale} />
      ) : compact ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2">
          <StageRail player={player} compact />
          <Transport player={player} compact />
          <NarrationCard player={player} compact motionScale={motionScale} />
        </div>
      ) : (
        <>
          <NarrationCard player={player} compact={false} motionScale={motionScale} />
          <div className="pointer-events-none absolute bottom-5 left-1/2 flex max-w-[92vw] -translate-x-1/2 flex-col items-center gap-2.5">
            <StageRail player={player} compact={false} />
            <Transport player={player} compact={false} />
          </div>
        </>
      )}
    </div>
  );
}
