import { apiClient } from './client';
import { endpoints } from './endpoints';

// ── Response types ────────────────────────────────────────────────────────────

export interface SimulateResult {
  success: boolean;
  message: string;
  tier?: string;
  actions_taken?: Array<{ device_id: string; action: string }>;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const simulateApi = {
  studyMode: () =>
    apiClient.post<SimulateResult>(endpoints.simulateStudyMode),

  nightSafetyCheck: () =>
    apiClient.post<SimulateResult>(endpoints.simulateNightSafety),

  powerCut: () =>
    apiClient.post<SimulateResult>(endpoints.simulatePowerCut),
};

export type SimulateEndpoint = keyof typeof simulateApi;
