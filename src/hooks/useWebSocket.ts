import { useEffect, useRef, useCallback } from 'react';
import { backendState, onBackendResolved } from '../config/backendState';
import { useAppStore } from '../store/store';
import { env } from '../config/env';

export type WsMessageType =
  | 'event_result'
  | 'device_update'
  | 'regime_change'
  | 'rule_proposed'
  | 'stats_update'
  | 'ping'
  | 'voice_command'
  | 'voice_thinking'
  | 'voice_response'
  | 'lookup_request'
  | 'lookup_approved'
  | 'lookup_result';

export interface WsMessage {
  type: WsMessageType;
  payload?: Record<string, unknown>;
  home_id?: string;
  timestamp?: string;
}

const MAX_RETRIES = 8;

// Module-level singleton — one real socket shared across all hook instances
let _ws: WebSocket | null = null;
let _retryCount = 0;
let _circuitOpen = false;
let _circuitTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const _callbacks: Set<(msg: WsMessage) => void> = new Set();

function getWsUrl(): string {
  return backendState.url.replace(/^http/, 'ws') + `/ws?home_id=${env.HOME_ID}`;
}

function createSocket() {
  if (!env.WS_ENABLED) return;
  if (backendState.source === 'offline') return;
  if (_circuitOpen) return;
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;

  const url = getWsUrl();
  console.log('[WS] Connecting to', url);

  try {
    const ws = new WebSocket(url);
    _ws = ws;

    ws.onopen = () => {
      _retryCount = 0;
      _circuitOpen = false;
      console.info('[WS] Connected');
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === 'ping') return;
        _callbacks.forEach(cb => { try { cb(msg); } catch { /* ignore */ } });
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (_ws === ws) _ws = null;
      _retryCount++;
      if (_retryCount >= MAX_RETRIES) {
        _circuitOpen = true;
        console.warn('[WS] Circuit open after', MAX_RETRIES, 'failures — pausing 30s');
        if (_circuitTimer) clearTimeout(_circuitTimer);
        _circuitTimer = setTimeout(() => {
          _circuitOpen = false;
          _retryCount = 0;
          createSocket();
        }, 30_000);
        return;
      }
      const delay = Math.min(1500 * Math.pow(2, _retryCount - 1), 30_000);
      if (_reconnectTimer) clearTimeout(_reconnectTimer);
      _reconnectTimer = setTimeout(createSocket, delay);
    };

    ws.onerror = () => ws.close();
  } catch {
    /* WebSocket unavailable */
  }
}

function ensureConnected() {
  if (!backendState.isResolved) {
    onBackendResolved(createSocket);
  } else {
    createSocket();
  }
}

export function useWebSocket() {
  const addNotification = useAppStore((s) => s.addNotification);
  // Keep a stable ref to this instance's notification handler
  const notifRef = useRef(addNotification);
  notifRef.current = addNotification;

  // Register a side-effect handler for device/regime/rule notifications
  useEffect(() => {
    const handler = (msg: WsMessage) => {
      if (msg.type === 'regime_change' && msg.payload) {
        notifRef.current(`Home mode changed to ${msg.payload.new_regime as string}`, 'info');
      }
      if (msg.type === 'rule_proposed' && msg.payload) {
        notifRef.current(`New rule proposed: "${msg.payload.title ?? 'Auto rule'}"`, 'success');
      }
      if (msg.type === 'device_update' && msg.payload) {
        const { device_id, property, new_value } = msg.payload as { device_id: string; property: string; new_value: unknown };
        notifRef.current(`${device_id}: ${property} → ${new_value}`, 'info');
        try {
          const store = useAppStore.getState();
          const match = store.placedObjects.find(o => o.alexaDeviceId === device_id);
          if (match) {
            const camelKey = property.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
            store.updateAlexaState(match.id, { [camelKey]: new_value } as Partial<import('../types').AlexaDeviceState>);
          }
        } catch { /* ignore */ }
      }
    };
    _callbacks.add(handler);
    return () => { _callbacks.delete(handler); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Boot the singleton once per app lifetime
  useEffect(() => {
    ensureConnected();
  }, []);

  const subscribe = useCallback((cb: (msg: WsMessage) => void) => {
    _callbacks.add(cb);
    return () => { _callbacks.delete(cb); };
  }, []);

  const send = useCallback((msg: WsMessage): boolean => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ ...msg, timestamp: new Date().toISOString() }));
      return true;
    }
    console.warn('[WS] send failed — not connected (state:', _ws?.readyState, ')');
    return false;
  }, []);

  const isConnected = _ws?.readyState === WebSocket.OPEN;

  return { subscribe, send, isConnected };
}
