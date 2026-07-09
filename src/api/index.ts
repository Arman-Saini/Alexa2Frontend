// Barrel export , import from '@/api' (or '../../api') to access all API modules.
// Never import directly from sub-modules in components or hooks.

export { apiClient, ApiError } from './client';
export { endpoints } from './endpoints';
export { homeApi } from './homeApi';
export { voiceApi } from './voiceApi';
export { simulateApi } from './simulateApi';
export { appStoreApi } from './appStoreApi';
export { backendApi } from './backendApi';
export { scenarioBuilderApi } from './scenarioBuilderApi';
export { demoApi } from './demoApi';
export { khataApi } from './khataApi';

export type { Anticipation, AnticipationsResponse, DigitalTwinResponse, TwinModeInfo, TwinRoom, HomeDevice } from './homeApi';
export type { TranscribeResponse, TtsResponse } from './voiceApi';
export type { SimulateResult, SimulateEndpoint } from './simulateApi';
export type { AppStoreModule, AppStoreStats, GeneratedModule, InstallResult } from './appStoreApi';
export type { RegimeState, T0Rule, ProposedRule, VoiceConfig, HomeStats, ApiResult } from './backendApi';
export type { ScenarioPlan, ScenarioStep, ScenarioTrace, ScenarioActor, TracePathHop } from './scenarioBuilderApi';
export type { DemoStep } from './demoApi';
export type { KhataEntry, KhataVendor, KhataEntryKind, KhataTrace, KhataLogResponse, KhataLedgerResponse, KhataVendorLedger, KhataSettleResponse, KhataSettleLine } from './khataApi';
