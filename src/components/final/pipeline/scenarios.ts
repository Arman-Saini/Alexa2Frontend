import type { Scenario } from './types';
import { TIER_META } from './types';
import { PULSE_IO, PULSE_T0, PULSE_T1, PULSE_T2, PULSE_T3 } from './poses';

// ─────────────────────────────────────────────────────────────────────────
// A — lights-t1 · "Turn on the living room lights" (T1 fast path, ~50s)
// ─────────────────────────────────────────────────────────────────────────
const lightsT1: Scenario = {
  id: 'lights-t1',
  label: 'Turn on the living room lights',
  utterance: 'Turn on the living room lights',
  language: 'en',
  finalTier: 'T1',
  accent: TIER_META.T1.color,
  icon: '💡',
  stages: [
    {
      id: 'wake', tier: 'IO', title: 'IO · WAKE — On-device wake word detection',
      body: 'Wake word fires on-device — nothing has left the room yet.',
      tech: 'Wake word · on-device DSP · <5ms · $0',
      activeLayer: null, cameraPose: 'assembled', flowPath: ['mic'],
      pulse: PULSE_IO, durationMs: 4000, expression: 'curious',
    },
    {
      id: 'open', tier: 'IO', title: 'IO · INSIDE THE SHELL — Opening the CPU stack',
      body: "Let's look inside while it works.",
      tech: 'Shell hinge open · CPU stack exposed',
      activeLayer: null, cameraPose: 'shell-open', flowPath: ['mic'],
      pulse: PULSE_IO, durationMs: 5000, expression: 'excited',
    },
    {
      id: 'stt', tier: 'IO', title: 'IO · STT — Speech to text',
      body: 'Speech becomes text — already in English, so no translation is needed.',
      tech: 'Groq Whisper STT · translate passthrough (EN)',
      badges: ['EN'],
      activeLayer: 1, cameraPose: 'splay-flat', flowPath: ['mic', 1],
      pulse: PULSE_IO, durationMs: 6000,
    },
    {
      id: 't0-check', tier: 'T0', title: 'T0 · REFLEX — Checking compiled rules',
      body: 'First stop, always: the reflex table. No compiled rule matches.',
      tech: 'runT0RuleEngine · pattern match · <10ms · $0',
      badges: ['NO MATCH'],
      activeLayer: 0, cameraPose: 'splay-flat', flowPath: [1, 0],
      pulse: PULSE_T0, durationMs: 6000, latencyMs: 8,
    },
    {
      id: 't1-nlu', tier: 'T1', title: 'T1 · PERCEPTION — Local intent match',
      body: 'Local perception matches `light_on(living_room)` with regex NLU. No cloud, no cost.',
      tech: 'regex NLU · Hinglish patterns · <100ms · $0',
      badges: ['MATCH'],
      activeLayer: 1, cameraPose: 'splay-flat', cameraFocus: { layer: 1, zoom: 1.5 },
      flowPath: [0, 1], pulse: PULSE_T1, durationMs: 8000, latencyMs: 60,
    },
    {
      id: 'actuate', tier: 'IO', title: 'IO · ACTUATE — MCP device interposer',
      body: 'The interposer dispatches the command straight to the device.',
      tech: 'executeTool · MCP device interposer · Hue bridge',
      activeLayer: 2, cameraPose: 'splay-flat', flowPath: [1, 2, 'device'],
      pulse: PULSE_IO, durationMs: 7000,
      effects: [{ at: 0.4, durationMs: 3000, kind: 'device-actuate', anchor: 'device', label: 'hue.light_on → LIVING_ROOM' }],
    },
    {
      id: 'log', tier: 'IO', title: 'IO · MEMORY — Event history log',
      body: 'Every resolution is remembered — event history feeds the nightly rule miner.',
      tech: 'event log write · feeds 02:00 nightly miner',
      activeLayer: 3, cameraPose: 'splay-flat', flowPath: [2, 3],
      pulse: PULSE_IO, durationMs: 5000,
      effects: [{ at: 0.3, durationMs: 2500, kind: 'event-log', anchor: 3, label: 'event logged · light_on' }],
    },
    {
      id: 'respond', tier: 'IO', title: 'IO · RESPOND — Text to speech',
      body: 'The answer is spoken back, in English.',
      tech: 'buildSpokenResponse → Polly en-IN',
      activeLayer: null, cameraPose: 'rejoin', flowPath: [1, 'mic'],
      pulse: PULSE_IO, durationMs: 6000, expression: 'happy',
    },
    {
      id: 'close', tier: 'IO', title: 'IO · TRACE — What just happened',
      body: 'Trace: `[device, t0, t1]` · "Thinks locally" · ~70ms · $0',
      tech: '[device, t0, t1] · "Thinks locally" · ~70ms · $0',
      activeLayer: null, cameraPose: 'closed', flowPath: [],
      pulse: PULSE_IO, durationMs: 4000,
    },
  ],
  summary: { response: 'Living room lights on.', latencyMs: 72, costUsd: 0, tierTag: 'T1·local' },
};

// ─────────────────────────────────────────────────────────────────────────
// B — khata-t0 · "Doodhwala ka hisab likh do — 40 rupaye" (khata vault intercept, ~45s)
// ─────────────────────────────────────────────────────────────────────────
const khataT0: Scenario = {
  id: 'khata-t0',
  label: "Log the doodhwala's khata entry",
  utterance: 'Doodhwala ka hisab likh do — 40 rupaye',
  language: 'hinglish',
  finalTier: 'T0',
  accent: TIER_META.T0.color,
  icon: '📒',
  stages: [
    {
      id: 'wake', tier: 'IO', title: 'IO · WAKE — On-device wake word detection',
      body: 'Wake word fires on-device — nothing has left the room yet.',
      tech: 'Wake word · on-device DSP · <5ms · $0',
      activeLayer: null, cameraPose: 'assembled', flowPath: ['mic'],
      pulse: PULSE_IO, durationMs: 4000, expression: 'curious',
    },
    {
      id: 'stt', tier: 'IO', title: 'IO · STT + TRANSLATE — Hinglish detected',
      body: 'Hinglish speech is detected and translated to English before anything else runs.',
      tech: 'Whisper → llama-3.1-8b translate → EN',
      badges: ['HINGLISH DETECTED'],
      activeLayer: 1, cameraPose: 'shell-open', flowPath: ['mic', 1],
      pulse: PULSE_IO, durationMs: 7000,
    },
    {
      id: 'intercept', tier: 'T0', title: 'T0 · REFLEX — Hard-coded interceptor',
      body: 'Before ANY engine runs, a hard-coded interceptor recognizes a ledger command. The khata never needs the cloud.',
      tech: 'parseKhataUtteranceMock · pre-engine intercept · <10ms · $0',
      badges: ['INTERCEPTED · T0'],
      activeLayer: 0, cameraPose: 'splay-flat', cameraFocus: { layer: 0, zoom: 1.5 },
      flowPath: [1, 0], pulse: PULSE_T0, durationMs: 11000, latencyMs: 9,
    },
    {
      id: 'vault', tier: 'T0', title: 'T0 · VAULT — Filing the ledger entry',
      body: 'The entry is filed in the khata vault — private, on-device, structured.',
      tech: 'khataStore.add · on-device vault · $0',
      activeLayer: 0, cameraPose: 'splay-flat', flowPath: [0],
      pulse: PULSE_T0, durationMs: 10000,
      effects: [{ at: 0.2, durationMs: 4000, kind: 'vault-write', anchor: 0, label: '+₹40 · doodhwala' }],
    },
    {
      id: 'respond', tier: 'IO', title: 'IO · RESPOND — Speaking back in Hindi',
      body: 'The confirmation is translated back and spoken in Hindi.',
      tech: 'translateFromEnglish → Sarvam bulbul:v2 hi-IN',
      activeLayer: null, cameraPose: 'rejoin', flowPath: [0, 1, 'mic'],
      pulse: PULSE_IO, durationMs: 9000, expression: 'wink',
    },
    {
      id: 'close', tier: 'IO', title: 'IO · TRACE — What just happened',
      body: 'Trace: `[device, t0]` · "Instant reflex" · 9ms · $0',
      tech: '[device, t0] · "Instant reflex" · 9ms · $0',
      activeLayer: null, cameraPose: 'closed', flowPath: [],
      pulse: PULSE_IO, durationMs: 4000,
    },
  ],
  summary: { response: 'Doodhwala ke khate mein ₹40 likh diya.', latencyMs: 9, costUsd: 0, tierTag: 'T0·local' },
};

// ─────────────────────────────────────────────────────────────────────────
// C — hue-t3 · "Jab main so jaun, baaki lights band karke hue scene 'relax' laga do" (full T3, ~100s)
// ─────────────────────────────────────────────────────────────────────────
const hueT3: Scenario = {
  id: 'hue-t3',
  label: 'Bedtime Hue scene, multi-device',
  utterance: "Jab main so jaun, baaki lights band karke hue scene 'relax' laga do",
  language: 'hinglish',
  finalTier: 'T3',
  accent: TIER_META.T3.color,
  icon: '🌙',
  stages: [
    {
      id: 'wake', tier: 'IO', title: 'IO · WAKE — On-device wake word detection',
      body: 'Wake word fires on-device — nothing has left the room yet.',
      tech: 'Wake word · on-device DSP · <5ms · $0',
      activeLayer: null, cameraPose: 'assembled', flowPath: ['mic'],
      pulse: PULSE_IO, durationMs: 4000,
    },
    {
      id: 'stt-translate', tier: 'IO', title: 'IO · STT + TRANSLATE — Hinglish detected',
      body: 'Hinglish speech is detected and translated to English before anything else runs.',
      tech: 'Whisper → llama-3.1-8b translate → EN',
      badges: ['HINGLISH DETECTED'],
      activeLayer: 1, cameraPose: 'shell-open', flowPath: ['mic', 1],
      pulse: PULSE_IO, durationMs: 7000,
    },
    {
      id: 'overview', tier: 'IO', title: 'IO · OVERVIEW — Climbing the full cascade',
      body: 'A conditional, multi-device command. Watch it climb the whole cascade.',
      tech: 'blueprint trace · all tiers visible',
      activeLayer: null, cameraPose: 'blueprint', flowPath: [1, 0, 3, 4, 5],
      pulse: PULSE_IO, durationMs: 7000,
    },
    {
      id: 't0-check', tier: 'T0', title: 'T0 · REFLEX — Checking compiled rules',
      body: 'First stop, always: the reflex table. No compiled rule matches.',
      tech: 'runT0RuleEngine · pattern match · <10ms · $0',
      badges: ['NO MATCH'],
      activeLayer: 0, cameraPose: 'splay-flat', flowPath: [1, 0],
      pulse: PULSE_T0, durationMs: 5000, latencyMs: 8,
    },
    {
      id: 't1-check', tier: 'T1', title: 'T1 · PERCEPTION — Too conditional for local NLU',
      body: 'Too conditional for pattern matching.',
      tech: 'regex NLU · needsT3Escalation gate · <100ms · $0',
      badges: ['ESCALATE'],
      activeLayer: 1, cameraPose: 'splay-flat', flowPath: [0, 1],
      pulse: PULSE_T1, durationMs: 6000, latencyMs: 40,
    },
    {
      id: 'recall', tier: 'T2', title: 'T2 · RECALL — Semantic cache lookup',
      body: 'Recall checks: solved before? djb2 hash, 30-minute TTL. Miss.',
      tech: 'djb2 hash · semantic cache · 30-min TTL',
      badges: ['CACHE MISS'],
      activeLayer: 3, cameraPose: 'splay-flat', flowPath: [1, 3],
      pulse: PULSE_T2, durationMs: 8000, latencyMs: 120,
    },
    {
      id: 'ratelimit', tier: 'T3', title: 'T3 · REASON — Bedrock rate limit gate',
      body: 'One last local gate before spending money.',
      tech: 'rate limiter · 15 Bedrock calls/min',
      badges: ['3/15 CALLS · OK'],
      activeLayer: 4, cameraPose: 'splay-flat', flowPath: [3, 4],
      pulse: PULSE_T3, durationMs: 5000,
    },
    {
      id: 'triage', tier: 'T3', title: 'T3 · REASON — Supervisor triage',
      body: 'Supervisor (Nova Micro) triages → HOME_CONTROL specialist.',
      tech: 'Nova Micro triage · COMMERCE|HOME_CONTROL|KNOWLEDGE',
      badges: ['→ HOME_CONTROL'],
      activeLayer: 5, cameraPose: 'splay-flat', cameraFocus: { layer: 5, zoom: 1.5 },
      flowPath: [4, 5, 'cloud'], pulse: PULSE_T3, durationMs: 10000, costUsd: 0.0004,
    },
    {
      id: 'specialist', tier: 'T3', title: 'T3 · REASON — Claude Haiku specialist',
      body: "Claude Haiku plans with tools, ≤3 loop iterations. `set_hue_scene` is only on the menu because the Hue skill is installed.",
      tech: 'Claude Haiku · tool loop ≤3 · HOME_CONTROL specialist',
      badges: ['SKILL: philips-hue', 'TOOL LOOP 2/3'],
      activeLayer: 5, cameraPose: 'splay-flat', flowPath: ['cloud', 5],
      pulse: PULSE_T3, durationMs: 12000, costUsd: 0.003, latencyMs: 1900,
    },
    {
      id: 'authorize', tier: 'T3', title: 'T3 · REASON — Authorizer gate',
      body: "Every proposed action passes the authorizer: safety class, sleep-regime noise guard, identity confidence. Propose, don't impose.",
      tech: 'authorizeTool() · safety class · regime guard',
      badges: ['AUTHORIZED ✓'],
      activeLayer: 4, cameraPose: 'splay-flat', flowPath: [5, 4],
      pulse: PULSE_T3, durationMs: 9000,
    },
    {
      id: 'actuate', tier: 'IO', title: 'IO · ACTUATE — MCP device interposer',
      body: 'The authorized actions are dispatched to the Hue bridge and the other lights.',
      tech: "executeTool · set_hue_scene + lights_off",
      activeLayer: 2, cameraPose: 'splay-flat', flowPath: [4, 2, 'device'],
      pulse: PULSE_IO, durationMs: 7000,
      effects: [{ at: 0.3, durationMs: 3000, kind: 'device-actuate', anchor: 'device', label: "set_hue_scene('relax') + lights_off(others)" }],
    },
    {
      id: 'cache-set', tier: 'T2', title: 'T2 · RECALL — Writing the semantic cache',
      body: 'Success teaches Recall — next time this is a 100ms answer.',
      tech: 'semanticCache.set · TTL 30m',
      activeLayer: 3, cameraPose: 'splay-flat', flowPath: [5, 3],
      pulse: PULSE_T2, durationMs: 8000,
      effects: [{ at: 0.25, durationMs: 4000, kind: 'cache-set', anchor: 3, label: 'recall stored · TTL 30m' }],
    },
    {
      id: 'respond', tier: 'IO', title: 'IO · RESPOND — Text to speech',
      body: 'The plan is confirmed back to the user, in Hinglish.',
      tech: 'cleanSpokenResponse → translateFromEnglish → Sarvam',
      badges: ['BEDROCK↓? → Groq fallback ready'],
      activeLayer: null, cameraPose: 'rejoin', flowPath: [1, 'mic'],
      pulse: PULSE_IO, durationMs: 7000, expression: 'happy',
    },
    {
      id: 'close', tier: 'IO', title: 'IO · TRACE — What just happened',
      body: 'Trace: `[device,t0,t1,cache,t3]` · "Asks the cloud" · 2.4s · $0.0038',
      tech: '[device,t0,t1,cache,t3] · "Asks the cloud" · 2.4s · $0.0038',
      activeLayer: null, cameraPose: 'closed', flowPath: [],
      pulse: PULSE_IO, durationMs: 5000,
    },
  ],
  summary: { response: 'Done — relax scene set for tonight.', latencyMs: 2400, costUsd: 0.0038, tierTag: 'T3·cloud' },
};

// ─────────────────────────────────────────────────────────────────────────
// D — routine-t0 · Sensor: water tank full → motor auto-off (~55s, no wake word)
// ─────────────────────────────────────────────────────────────────────────
const routineT0: Scenario = {
  id: 'routine-t0',
  label: 'Silent routine: tank full → motor off',
  utterance: 'Water tank sensor: 98% full (no wake word — automated routine trigger)',
  language: 'en',
  finalTier: 'T0',
  accent: TIER_META.T0.color,
  icon: '💧',
  stages: [
    {
      id: 'sensor', tier: 'IO', title: 'IO · SENSOR — Tank sensor trigger (no wake word)',
      body: 'No one spoke. A tank sensor reports 98%.',
      tech: 'sensor event · water_tank_level=98% · no wake word',
      activeLayer: null, cameraPose: 'assembled', flowPath: ['device'],
      pulse: PULSE_IO, durationMs: 5000, expression: 'sleepy',
    },
    {
      id: 'reflex', tier: 'T0', title: 'T0 · REFLEX — Compiled routine fires',
      body: 'A compiled reflex fires in under 10ms: `water_motor_auto_off`. Regime guard passes (NORMAL). Trigger #34.',
      tech: 'runT0RuleEngine · water_motor_auto_off · <10ms · $0',
      badges: ['REGIME ✓', 'trigger_count: 34'],
      activeLayer: 0, cameraPose: 'splay-flat', cameraFocus: { layer: 0, zoom: 1.5 },
      flowPath: ['device', 0], pulse: PULSE_T0, durationMs: 9000, latencyMs: 6,
    },
    {
      id: 'actuate', tier: 'IO', title: 'IO · ACTUATE — MCP device interposer',
      body: 'The motor is switched off, silently — no one needed to ask.',
      tech: 'executeTool · motor.off',
      activeLayer: 2, cameraPose: 'splay-flat', flowPath: [0, 2, 'device'],
      pulse: PULSE_IO, durationMs: 6000,
      effects: [{ at: 0.3, durationMs: 2500, kind: 'device-actuate', anchor: 'device', label: 'motor.off' }],
    },
    {
      id: 'origin-1', tier: 'T3', title: 'T3 · REASON — Where reflexes come from',
      body: 'Where did that rule come from? Every night at 02:00 a classical miner (no LLM) reads event history and finds this pattern, confidence 0.91.',
      tech: 'nightly rule miner · classical stats, no LLM · 02:00',
      badges: ['NIGHTLY MINER · conf 0.91 ≥ 0.85'],
      activeLayer: 5, cameraPose: 'splay-flat', flowPath: [3, 5],
      pulse: PULSE_T3, durationMs: 10000,
    },
    {
      id: 'origin-2', tier: 'T3', title: 'T3 · REASON — Forging the new rule',
      body: '≥0.85 auto-promotes; below that the user confirms.',
      tech: 'confidence ≥0.85 → auto-promote',
      activeLayer: 5, cameraPose: 'splay-flat', flowPath: [5],
      pulse: PULSE_T3, durationMs: 8000,
      effects: [{ at: 0.3, durationMs: 3500, kind: 'rule-forge', anchor: 5, label: 'rule: water_motor_auto_off' }],
    },
    {
      id: 'promote', tier: 'T0', title: 'T0 · REFLEX — Rule promoted from cloud',
      body: "The forged rule descends to the reflex layer. Reasoning was expensive exactly once — now it's free forever.",
      tech: 'rule_promote · T3 → T0 · one-time cost',
      activeLayer: 0, cameraPose: 'splay-flat', flowPath: [5, 0],
      pulse: PULSE_T0, durationMs: 9000,
      effects: [{ at: 0.15, durationMs: 5000, kind: 'rule-promote', anchor: 0, label: 'promoted → T0 reflex' }],
    },
    {
      id: 'log', tier: 'IO', title: 'IO · MEMORY — Event history log',
      body: 'Every resolution is remembered — event history feeds the nightly rule miner.',
      tech: 'event log write · feeds 02:00 nightly miner',
      activeLayer: 3, cameraPose: 'splay-flat', flowPath: [0, 3],
      pulse: PULSE_IO, durationMs: 4000,
      effects: [{ at: 0.3, durationMs: 2000, kind: 'event-log', anchor: 3, label: 'event logged · water_motor_auto_off' }],
    },
    {
      id: 'close', tier: 'IO', title: 'IO · TRACE — What just happened',
      body: 'Trace: `[device,t0]` · "Instant reflex" · 6ms · $0',
      tech: '[device,t0] · "Instant reflex" · 6ms · $0',
      activeLayer: null, cameraPose: 'closed', flowPath: [],
      pulse: PULSE_IO, durationMs: 4000, expression: 'resting',
    },
  ],
  summary: { response: '(silent routine) Water motor off — tank full.', latencyMs: 6, costUsd: 0, tierTag: 'T0·local' },
};

export const SCENARIOS: Scenario[] = [lightsT1, khataT0, hueT3, routineT0];
