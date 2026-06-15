// Polls the real backend to keep the dashboard alive with live data.
// Covers: stats, regime, rules, devices, event history, anticipations.

import { useState, useEffect, useCallback, useRef } from 'react';
import { backendApi, homeApi, appStoreApi } from '../api';
import type { HomeStats, RegimeState, T0Rule, ProposedRule } from '../api/backendApi';
import type { HomeDevice, Anticipation, AppStoreModule } from '../api';
import { env } from '../config/env';

export interface LiveDevice extends HomeDevice {
  room_id: string | null;
  friendly_name?: string;
  online?: boolean;
}

export interface LiveBackendData {
  homeStats:      HomeStats | null;
  regime:         RegimeState | null;
  t0Rules:        T0Rule[];
  proposedRules:  ProposedRule[];
  devices:        LiveDevice[];
  eventHistory:   HistoryEvent[];
  anticipations:  Anticipation[];
  storeModules:   AppStoreModule[];
  connected:      boolean;
  lastPing:       number | null;
}

export interface HistoryEvent {
  event_id:     string;
  timestamp:    string;
  intent?:      string;
  tier?:        string;
  description?: string;
  actions?:     unknown[];
}

export function useLiveBackend(): LiveBackendData & {
  mineRules:        () => Promise<void>;
  confirmRule:      (id: string) => Promise<void>;
  rejectRule:       (id: string) => Promise<void>;
  forceRegime:      (regime: string) => Promise<void>;
  seedHome:         () => Promise<void>;
  seedHistory:      () => Promise<void>;
  toggleDevice:     (deviceId: string, property: string, value: unknown) => Promise<void>;
  setDeviceOnline:  (deviceId: string, online: boolean) => Promise<void>;
  deleteDevice:     (deviceId: string) => Promise<void>;
  installModule:    (moduleId: string) => Promise<void>;
  refresh:          () => void;
} {
  const [homeStats,     setHomeStats]     = useState<HomeStats | null>(null);
  const [regime,        setRegime]        = useState<RegimeState | null>(null);
  const [t0Rules,       setT0Rules]       = useState<T0Rule[]>([]);
  const [proposedRules, setProposedRules] = useState<ProposedRule[]>([]);
  const [devices,       setDevices]       = useState<LiveDevice[]>([]);
  const [eventHistory,  setEventHistory]  = useState<HistoryEvent[]>([]);
  const [anticipations, setAnticipations] = useState<Anticipation[]>([]);
  const [storeModules,  setStoreModules]  = useState<AppStoreModule[]>([]);
  const [connected,     setConnected]     = useState(false);
  const [lastPing,      setLastPing]      = useState<number | null>(null);
  const [ruleTick,      setRuleTick]      = useState(0);
  const miningRef = useRef(false);

  // ── Fetchers ────────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const data = await backendApi.getHomeStats();
      setHomeStats(data);
      setConnected(true);
      setLastPing(Date.now());
    } catch {
      setConnected(false);
    }
  }, []);

  const fetchRegime = useCallback(async () => {
    try { setRegime(await backendApi.getRegime()); } catch { /**/ }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const [rulesRes, proposedRes] = await Promise.all([
        backendApi.listT0Rules(),
        backendApi.listProposedRules(),
      ]);
      setT0Rules(rulesRes.rules ?? []);
      setProposedRules(proposedRes.proposed ?? []);
    } catch { /**/ }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const res = await homeApi.getDevices();
      setDevices((res.devices ?? []) as LiveDevice[]);
    } catch { /**/ }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await backendApi.getEventHistory();
      const raw = (res.events ?? []) as HistoryEvent[];
      setEventHistory(raw.slice(0, 40));
    } catch { /**/ }
  }, []);

  const fetchAnticipations = useCallback(async () => {
    try {
      const res = await homeApi.getAnticipations();
      setAnticipations(res.anticipations ?? []);
    } catch { /**/ }
  }, []);

  const fetchStoreModules = useCallback(async () => {
    try {
      const res = await appStoreApi.getModules();
      setStoreModules(res.modules ?? []);
    } catch { /**/ }
  }, []);

  // ── Polling intervals ────────────────────────────────────────────────────────

  useEffect(() => { fetchStats(); const id = setInterval(fetchStats, 5000); return () => clearInterval(id); }, [fetchStats]);
  useEffect(() => { fetchRegime(); const id = setInterval(fetchRegime, 12000); return () => clearInterval(id); }, [fetchRegime]);
  useEffect(() => { fetchRules(); const id = setInterval(fetchRules, 30000); return () => clearInterval(id); }, [fetchRules, ruleTick]);
  useEffect(() => { fetchDevices(); const id = setInterval(fetchDevices, 7000); return () => clearInterval(id); }, [fetchDevices]);
  useEffect(() => { fetchEvents(); const id = setInterval(fetchEvents, 6000); return () => clearInterval(id); }, [fetchEvents]);
  useEffect(() => { fetchAnticipations(); const id = setInterval(fetchAnticipations, 20000); return () => clearInterval(id); }, [fetchAnticipations]);
  useEffect(() => { fetchStoreModules(); }, [fetchStoreModules]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const mineRules = useCallback(async () => {
    if (miningRef.current) return;
    miningRef.current = true;
    try { await backendApi.runRuleMiner(); await fetchRules(); }
    finally { miningRef.current = false; }
  }, [fetchRules]);

  const confirmRule = useCallback(async (id: string) => {
    await backendApi.confirmRule(undefined, id);
    setProposedRules(prev => prev.map(r => r.proposal_id === id ? { ...r, status: 'confirmed' as const } : r));
    setRuleTick(t => t + 1);
  }, []);

  const rejectRule = useCallback(async (id: string) => {
    await backendApi.rejectRule(undefined, id);
    setProposedRules(prev => prev.filter(r => r.proposal_id !== id));
  }, []);

  const forceRegime = useCallback(async (regime: string) => {
    await backendApi.forceRegime(undefined, regime);
    await fetchRegime();
  }, [fetchRegime]);

  const seedHome = useCallback(async () => {
    await homeApi.seedHome();
    await Promise.all([fetchStats(), fetchDevices(), fetchRules()]);
  }, [fetchStats, fetchDevices, fetchRules]);

  const seedHistory = useCallback(async () => {
    await homeApi.seedLearningHistory();
    await fetchEvents();
  }, [fetchEvents]);

  const toggleDevice = useCallback(async (deviceId: string, property: string, value: unknown) => {
    await backendApi.updateDevice(undefined, deviceId, property, value);
    await fetchDevices();
  }, [fetchDevices]);

  const setDeviceOnline = useCallback(async (deviceId: string, online: boolean) => {
    await backendApi.setDeviceOnline(undefined, deviceId, online);
    await fetchDevices();
  }, [fetchDevices]);

  const deleteDevice = useCallback(async (deviceId: string) => {
    await backendApi.deleteDevice(undefined, deviceId);
    await fetchDevices();
  }, [fetchDevices]);

  const installModule = useCallback(async (moduleId: string) => {
    await appStoreApi.installModule(moduleId, env.HOME_ID);
    await fetchDevices();
  }, [fetchDevices]);

  const refresh = useCallback(() => {
    fetchStats(); fetchRegime(); fetchRules(); fetchDevices(); fetchEvents(); fetchAnticipations();
  }, [fetchStats, fetchRegime, fetchRules, fetchDevices, fetchEvents, fetchAnticipations]);

  return {
    homeStats, regime, t0Rules, proposedRules, devices, eventHistory, anticipations, storeModules,
    connected, lastPing,
    mineRules, confirmRule, rejectRule, forceRegime, seedHome, seedHistory,
    toggleDevice, setDeviceOnline, deleteDevice, installModule, refresh,
  };
}
