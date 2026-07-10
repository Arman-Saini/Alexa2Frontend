import { apiClient } from './client';
import { endpoints } from './endpoints';
import { env } from '../config/env';

// ── Response types ────────────────────────────────────────────────────────────

export interface SimulateResult {
  success: boolean;
  message: string;
  tier?: string;
  actions_taken?: Array<{ device_id: string; action: string }>;
}

// ── API functions ─────────────────────────────────────────────────────────────

const homeBody = () => ({ home_id: env.HOME_ID });

export const simulateApi = {
  studyMode: () =>
    apiClient.post<SimulateResult>(endpoints.simulateStudyMode, homeBody()),

  nightSafetyCheck: () =>
    apiClient.post<SimulateResult>(endpoints.simulateNightSafety, homeBody()),

  powerCut: () =>
    apiClient.post<SimulateResult>(endpoints.simulatePowerCut, homeBody()),

  voiceCommand: (utterance: string, homeId = env.HOME_ID) =>
    apiClient.post<any>(endpoints.simulateVoiceCommand, { home_id: homeId, utterance }),

  simulateInventoryDrop: (homeId = env.HOME_ID) =>
    apiClient.post<any>(endpoints.simulateInventoryDrop, { home_id: homeId }),
};

export type SimulateEndpoint = 'studyMode' | 'nightSafetyCheck' | 'powerCut';
