// Barrel export — import from '@/api' (or '../../api') to access all API modules.
// Never import directly from sub-modules in components or hooks.

export { apiClient, ApiError } from './client';
export { endpoints } from './endpoints';
export { homeApi } from './homeApi';
export { voiceApi } from './voiceApi';
export { simulateApi } from './simulateApi';

export type { Anticipation, AnticipationsResponse, DigitalTwinResponse, TwinModeInfo, TwinRoom, HomeDevice } from './homeApi';
export type { TranscribeResponse, TtsResponse } from './voiceApi';
export type { SimulateResult, SimulateEndpoint } from './simulateApi';
