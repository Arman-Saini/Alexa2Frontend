import { apiClient } from './client';
import { endpoints } from './endpoints';
import { env } from '../config/env';

// ── Response types ────────────────────────────────────────────────────────────
// Bedrock-generated, non-deterministic , consumers must handle variable step
// count (3-8) and optional fields, never assume a fixed shape.

export type ScenarioActor = 'user' | 'alexa' | 'device' | 'cloud' | 'app';
export type TracePathHop = 'device' | 't0' | 't1' | 'cache' | 't3';

export interface ScenarioStep {
  n: number;
  actor: ScenarioActor;
  label: string;
  detail: string;
  device_id?: string;
  action?: { property: string; value: unknown };
}

export interface ScenarioTrace {
  path: TracePathHop[];
  latency_ms: number;
  cost_usd: number;
  tier_label: string;
}

export interface ScenarioPlan {
  title: string;
  steps: ScenarioStep[];
  trace: ScenarioTrace;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const scenarioBuilderApi = {
  plan: (scenario: string, homeId = env.HOME_ID) =>
    apiClient.post<ScenarioPlan>(endpoints.scenarioBuilderPlan, { home_id: homeId, scenario }),
};
