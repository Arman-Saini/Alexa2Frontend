import { apiClient } from './client';
import { endpoints } from './endpoints';
import { env } from '../config/env';

// ── Shared types ──────────────────────────────────────────────────────────────

export type KhataVendor = 'doodhwala' | 'dhobi' | 'maid' | 'newspaper';
export type KhataEntryKind = 'delivery' | 'missed' | 'items' | 'payment';

export interface KhataTrace {
  path: Array<'device' | 't0' | 't1' | 'cache' | 't3'>;
  latency_ms: number;
  cost_usd: number;
  tier_label: string;
}

export interface KhataEntry {
  id: string;
  vendor: KhataVendor;
  vendor_hi: string;
  kind: KhataEntryKind;
  quantity: number;
  unit: string;
  amount_inr: number;
  date: string;
  raw: string;
}

// ── Log ───────────────────────────────────────────────────────────────────────

export interface KhataLogResponse {
  entry: KhataEntry;
  speech: string;
  trace: KhataTrace;
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export interface KhataVendorLedger {
  vendor: KhataVendor;
  vendor_hi: string;
  entries: KhataEntry[];
  subtotal_inr: number;
}

export interface KhataLedgerResponse {
  vendors: KhataVendorLedger[];
  month: string;
}

// ── Settle ────────────────────────────────────────────────────────────────────

export interface KhataSettleLine {
  vendor: KhataVendor;
  vendor_hi: string;
  detail: string;
  amount_inr: number;
}

export interface KhataSettleResponse {
  lines: KhataSettleLine[];
  total_inr: number;
  upi_link: string;
  speech: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const khataApi = {
  log: (utterance: string, homeId = env.HOME_ID) =>
    apiClient.post<KhataLogResponse>(endpoints.khataLog(homeId), { utterance }),

  getLedger: (homeId = env.HOME_ID) =>
    apiClient.get<KhataLedgerResponse>(endpoints.khataLedger(homeId)),

  settle: (homeId = env.HOME_ID) =>
    apiClient.post<KhataSettleResponse>(endpoints.khataSettle(homeId)),

  reset: (homeId = env.HOME_ID) =>
    apiClient.post<{ success: boolean; message: string }>(endpoints.khataReset(homeId)),
};
