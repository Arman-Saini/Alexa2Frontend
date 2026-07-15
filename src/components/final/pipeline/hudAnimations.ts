// Every anime.js (v4) call for the Narration HUD lives in this one module.
// v4 API: `import { animate, createTimeline, stagger } from 'animejs'` — NOT v3's `anime({targets})`.
import { animate, createTimeline, stagger } from 'animejs';
import type { JSAnimation, Timeline } from 'animejs';
import type { MotionScale } from './quality';

// Narration card swap (per stage change; old card kept in DOM until exit completes)
export function cardEnter(el: HTMLElement, ms: MotionScale): JSAnimation {
  return animate(el, { translateY: [24, 0], opacity: [0, 1], duration: 450 * ms, ease: 'out(3)' });
}

export function cardExit(el: HTMLElement, ms: MotionScale): JSAnimation {
  return animate(el, { translateY: [0, -16], opacity: [1, 0], duration: 300 * ms, ease: 'in(2)' });
}

// Badge chips inside a freshly-entered card
export function badgesIn(els: HTMLElement[], ms: MotionScale): JSAnimation {
  return animate(els, {
    opacity: [0, 1], translateY: [6, 0], duration: 300 * ms,
    delay: stagger(70, { start: 200 * ms }), ease: 'out(2)',
  });
}

// Prompt picker entrance (idle state)
export function pickerIn(els: HTMLElement[], ms: MotionScale): JSAnimation {
  return animate(els, {
    opacity: [0, 1], translateY: [20, 0], duration: 500 * ms,
    delay: stagger(90), ease: 'out(3)',
  });
}

// Ticker pop when a stage completes and its latency/cost lands
export function tickerPop(el: HTMLElement, ms: MotionScale): JSAnimation {
  return animate(el, { scale: [1, 1.18, 1], duration: 350 * ms, ease: 'inOut(2)' });
}

// End-reset crossfade — drives three.js opacity via proxy (no React)
export function endResetFade(proxy: { v: number }, onUpdate: () => void, ms: MotionScale): JSAnimation {
  return animate(proxy, { v: 1, duration: 800 * ms, ease: 'inOut(2)', onUpdate });
}

// Scenario-load timeline: picker out → HUD chrome in
export function scenarioIntro(pickerEl: HTMLElement, chromeEls: HTMLElement[], ms: MotionScale): Timeline {
  return createTimeline()
    .add(pickerEl, { opacity: [1, 0], translateY: [0, 12], duration: 250 * ms, ease: 'in(2)' })
    .add(chromeEls, {
      opacity: [0, 1], translateY: [10, 0], duration: 400 * ms,
      delay: stagger(60), ease: 'out(3)',
    }, '-=80');
}
