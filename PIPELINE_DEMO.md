# PipelineDemo — embed-mode spec

## Overview

`PipelineDemo` is a self-contained, scripted, scenario-driven demonstration of
the voice assistant's pipeline: **wake → STT/translate → T0 Reflex → T1
Perception → T2 Recall → T3 Reason (supervisor triage → specialist →
authorizer gate) → actuate → memory writes → TTS**. It renders the pipeline
as a heart / blood-flow metaphor over a 3D exploded-view canvas — a pulsing
core with "blood cells" of state flowing along tier-to-tier paths, synced to
a scripted timeline (stage-by-stage narration, HUD, and an optional phone
mock) rather than a live backend call. `/showcase-live` is simply
`<PipelineDemo mode="full" />`; nothing else lives on that route.

The component is fully self-contained: it owns its own playback engine
(`usePipelinePlayer`), quality tiering, canvas↔HUD bridge, theme lerp, and
end-of-scenario reset/loop. It does not reach into or mutate anything outside
its own tree, which is what makes it safe to mount a second time in an
embedded side panel alongside another page's own UI (e.g. a future
`/cartoon` page).

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `mode` | `'full' \| 'embedded'` | `'full'` | `'full'`: fixed, `inset-0`, viewport-filling page (used by `/showcase-live`). `'embedded'`: `absolute inset-0` — fills its *positioned* parent instead of the viewport. |
| `initialScenarioId` | `'lights-t1' \| 'khata-t0' \| 'hue-t3' \| 'routine-t0'` | `undefined` | Scenario to load on mount. If omitted, the demo opens on the prompt picker (no scenario running) unless a scenario is loaded programmatically later. |
| `autoplay` | `boolean` | `true` | Whether the initial scenario (if any) starts playing immediately on load. |
| `loop` | `boolean` | `mode === 'embedded'` (i.e. `false` for `'full'`, `true` for `'embedded'`) | When the scenario ends, whether it dwells, crossfades, and restarts automatically. |
| `showPhone` | `boolean` | `mode === 'full' ? !isMobileViewport : false` | Whether the floating `SmartphoneWidget` mock is rendered. Defaults on for full-page desktop, off for full-page mobile and for embedded. |
| `showHeader` | `boolean` | `mode === 'full'` | Whether the `ALEXA.LIVE` header bar (with the "← BACK TO SHOWCASE" link) is rendered. Off by default in embedded mode. |
| `onStageChange` | `(e: { scenarioId: string; stageIndex: number; stage: Stage }) => void` | `undefined` | Fired whenever the active stage changes (boundary-gated, not per-frame). |
| `onScenarioEnd` | `(scenarioId: string) => void` | `undefined` | Fired once when a scenario reaches its final stage (before the dwell/crossfade/loop sequence). |
| `onExit` | `() => void` | `undefined` | Fired when the player returns to "no scenario loaded" (e.g. user backs out to the picker) — not fired for the demo's own internal programmatic `stop()` calls during the loop-reset crossfade. |
| `className` | `string` | `undefined` | Extra class names appended to the root container. |

## Usage

### Full-page (`/showcase-live`)

```tsx
<PipelineDemo mode="full" />
```

This is the entire content of the `ShowcaseLivePage` route — fixed inset-0,
header + phone mock on desktop, no autoplay-into-scenario by default (opens
on the prompt picker).

### Embedded side panel

```tsx
<div style={{ position: 'relative', width: 480, height: 360 }}>
  <PipelineDemo
    mode="embedded"
    autoplay
    initialScenarioId="lights-t1"
    onStageChange={(e) => console.log(e.scenarioId, e.stageIndex, e.stage.title)}
  />
</div>
```

The parent element **must** be positioned (`position: relative` or
`absolute`/`fixed`) and have **explicit dimensions** — the embedded root is
`absolute inset-0` and simply fills whatever box it's given. There is no
`fixed` or viewport-unit (`100vw`/`100vh`) sizing in embedded mode, so it
composes safely inside an arbitrary layout (sidebar, card, modal, etc.).
`loop` defaults to `true` in this mode so a side panel keeps demonstrating
itself without further input; pass `loop={false}` to disable that.

## Scenarios

Read from `src/components/final/pipeline/scenarios.ts`:

| id | label / utterance | one-line description |
|---|---|---|
| `lights-t1` | "Turn on the living room lights" | English fast path: T0 no-match → T1 local regex NLU match → actuate, ~70ms, $0. |
| `khata-t0` | "Doodhwala ka hisab likh do — 40 rupaye" | Hinglish khata (ledger) command hard-intercepted at T0 before any engine runs — vault write, ~9ms, $0. |
| `hue-t3` | "Jab main so jaun, baaki lights band karke hue scene 'relax' laga do" | Conditional, multi-device bedtime command that escalates the full cascade: T0 → T1 → T2 (cache miss) → T3 (triage → Claude Haiku specialist with the Hue skill → authorizer) → actuate → cache write, ~2.4s, $0.0038. |
| `routine-t0` | Water tank sensor at 98% full (no wake word) | Silent, sensor-triggered routine: a compiled T0 reflex turns the motor off instantly, then flashes back to show where that reflex came from (nightly rule miner, confidence-gated auto-promotion from a one-time T3 reasoning cost). |

## Quality tiers

`detectQuality()` (in `quality.ts`) picks a tier at mount:

- `prefers-reduced-motion: reduce` → `'low'`
- `navigator.hardwareConcurrency <= 4` → `'low'`
- `navigator.deviceMemory <= 4` (Chrome-only; defaults to generous `8` where unsupported) → `'low'`
- otherwise → `'high'`

`QUALITY_PRESETS`:

| | `dpr` range | blood cells | cell segments | core detail | core glow sprite | plates breathe | ECG fps |
|---|---|---|---|---|---|---|---|
| `high` | `[1, 1.75]` | 24 | 12 | 1 | yes | yes | 30 |
| `low` | `[0.75, 1.25]` | 10 | 6 | 0 | no | no (static) | 15 |

**Escape hatch:** appending `?q=low` or `?q=high` to the URL force-pins the
tier (and disables the runtime auto-demotion probe below) — useful for
screenshotting a specific tier or working around a misdetected device.

**Runtime demotion (one-way):** independent of the initial `detectQuality()`
result, an FPS probe keeps an EMA of per-frame time while quality is `'high'`
and not URL-forced. If that EMA stays above 40ms (≈ <25fps) for a continuous
3 seconds, quality demotes to `'low'` for the rest of the session. There is
no promotion back to `'high'` at runtime — a demoted session stays demoted
until reload.

**Reduced-motion behavior:** `prefers-reduced-motion` forces `'low'` quality
*and* zeroes `motionScale`, which makes anime.js-driven transitions (scenario
intro, end-of-scenario crossfade, pose/camera tweens) resolve instantly
instead of animating. Scripted playback itself (stage timing, the rAF loop)
still runs at normal speed — reduced motion affects transition animation
duration, not the demo's pacing.

## Pause behavior

- **Tab hidden:** `usePipelinePlayer` self-suspends its single rAF loop on
  `document.visibilitychange` (`document.hidden`), remembering whether it was
  playing, and resumes automatically (honoring that remembered `wasPlaying`)
  when the tab becomes visible again. This applies in both `'full'` and
  `'embedded'` modes.
- **Scrolled out of view (`embedded` mode only):** `PipelineDemo` observes
  its own root container with an `IntersectionObserver` (`threshold: [0,
  0.25]`). When visibility drops below 25% *and* the player is currently
  playing, it calls `player.pause()` and remembers that it did so. When
  visibility returns to ≥25%, it calls `player.play()` **only if** it was the
  one that paused — if the user had already manually paused before the panel
  scrolled out, re-entering the viewport will not auto-resume it. There is no
  such observer at all in `'full'` mode (a full-page demo has no meaningful
  "scrolled out of view" state). The observer is skipped entirely in
  environments without `IntersectionObserver` (e.g. jsdom/tests) and is
  disconnected on unmount.

## Future `/cartoon` merge notes

The intended integration shape for a future page (working name `/cartoon`,
with its own animated character/robot) is: the host page mounts
`PipelineDemo` inside a **fixed side panel** with `mode="embedded"`. The
contract `PipelineDemo` upholds for that to work:

- It fills whatever positioned box its parent provides (`absolute inset-0`)
  — never `fixed`, never `100vw`/`100vh` — so the host controls placement
  and size entirely from the outside.
- Its canvas manages its own capped device-pixel-ratio (via the quality
  preset's `dpr` range) independent of the host page's own canvas/DPR
  handling.
- Its HUD is already compact in embedded mode (`compact = mode ===
  'embedded' || isMobileViewport`), so it doesn't assume full-page chrome
  space.
- `onStageChange` (and `onScenarioEnd`) let the host react to tier/stage
  transitions — e.g. driving the cartoon robot's expression or pose changes
  in lockstep with the pipeline demo's own tier, without the host needing to
  reach into `PipelineDemo`'s internals.

## Caveats

- **WebGL context budget:** browsers cap the number of live WebGL contexts
  per page (commonly ~8–16, browser-dependent). If the host page already has
  its own canvas(es) (e.g. the `/cartoon` robot), don't stack multiple
  `PipelineDemo` instances or leave hidden/off-screen ones mounted — unmount
  the demo (rather than merely hiding it with CSS) when it's not needed, so
  its canvas's WebGL context is released instead of accumulating.
- **Visibility-pause interactions:** the tab-hidden suspend (via
  `usePipelinePlayer`) and the embedded viewport-based pause (via
  `IntersectionObserver`, embedded mode only) are independent mechanisms that
  can both apply to the same instance — e.g. an embedded panel that is both
  scrolled out of view and in a hidden tab. Both remember "was I playing when
  I paused myself" independently and only resume what they themselves
  paused, so a manual user pause is never silently overridden by either
  mechanism.
