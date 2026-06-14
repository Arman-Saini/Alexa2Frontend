// All backend API route paths in one place.
// Import the `endpoints` object instead of constructing strings inline.

import { env } from '../config/env';

const h = env.HOME_ID; // shorthand

export const endpoints = {
  // ── Health ────────────────────────────────────────────────────────
  health: '/health',

  // ── Homes ─────────────────────────────────────────────────────────
  home: (homeId = h) => `/api/homes/${homeId}`,
  homeDevices: (homeId = h) => `/api/homes/${homeId}/devices`,
  digitalTwin: (homeId = h) => `/api/homes/${homeId}/twin`,
  anticipations: (homeId = h) => `/api/homes/${homeId}/anticipations`,
  seedHistory: (homeId = h) => `/api/homes/${homeId}/seed-learning-history`,

  // ── Events ────────────────────────────────────────────────────────
  event: (homeId = h) => `/api/homes/${homeId}/event`,

  // ── Voice ─────────────────────────────────────────────────────────
  transcribe: '/api/voice/transcribe',
  tts: '/api/voice/tts',

  // ── Simulate ──────────────────────────────────────────────────────
  simulateStudyMode: '/api/simulate/study_mode',
  simulateNightSafety: '/api/simulate/night_safety_check',
  simulatePowerCut: '/api/simulate/power_cut',

  // ── App Store (MCP Modules) ───────────────────────────────────────
  appStore: '/api/app-store/modules',
  appStoreStats: '/api/app-store/stats',
} as const;
