import { apiClient } from './client';
import { endpoints } from './endpoints';

// ── Response types ────────────────────────────────────────────────────────────

export interface DemoStep {
  id: string;
  caption: string;
  caption_hi?: string;
  endpoint: string;
  method: 'POST';
  body: Record<string, unknown>;
  dwell_ms: number;
}

// ── API functions ─────────────────────────────────────────────────────────────
// Returns a fixed 6-step attract-mode loop script.

export const demoApi = {
  getScript: () => apiClient.get<DemoStep[]>(endpoints.demoScript),
};
