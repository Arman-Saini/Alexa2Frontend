import { useEffect, useRef, useCallback, useState } from 'react';
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

// ─── Module-level singleton ───────────────────────────────────────────────────
const MAX_RETRIES = 8;
let _ws: WebSocket | null = null;
let _retryCount = 0;
let _circuitOpen = false;
let _circuitTimer: ReturnType<typeof setTimeout> | null = null;
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _initialized = false;

const _msgCallbacks: Set<(msg: WsMessage) => void> = new Set();
// Components subscribe here to get notified when connection state changes
const _connListeners: Set<(open: boolean) => void> = new Set();

function notifyConnState(open: boolean) {
  _connListeners.forEach(fn => { try { fn(open); } catch { /* ignore */ } });
}

function createSocket() {
  if (!env.WS_ENABLED) return;
  if (backendState.source === 'offline') { notifyConnState(false); return; }
  if (_circuitOpen) return;
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;

  const url = backendState.url.replace(/^http/, 'ws') + `/ws?home_id=${env.HOME_ID}`;
  console.log('[WS] Connecting to', url);

  try {
    const ws = new WebSocket(url);
    _ws = ws;

    ws.onopen = () => {
      _retryCount = 0;
      _circuitOpen = false;
      console.info('[WS] Connected');
      notifyConnState(true);
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === 'ping') return;
        _msgCallbacks.forEach(cb => { try { cb(msg); } catch { /* ignore */ } });
      } catch { /* ignore malformed */ }
    };

    ws.onclose = () => {
      if (_ws === ws) _ws = null;
      notifyConnState(false);
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

    ws.onerror = (e) => {
      console.warn('[WS] Error:', e);
      ws.close();
    };
  } catch (err) {
    console.error('[WS] Could not create WebSocket:', err);
  }
}

function boot() {
  if (_initialized) return;
  _initialized = true;
  if (!backendState.isResolved) {
    onBackendResolved(createSocket);
  } else {
    createSocket();
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useWebSocket() {
  const addNotification = useAppStore((s) => s.addNotification);
  const notifRef = useRef(addNotification);
  notifRef.current = addNotification;

  const [isConnected, setIsConnected] = useState(() => _ws?.readyState === WebSocket.OPEN);

  // Boot singleton once, track connection state reactively
  useEffect(() => {
    boot();

    // Sync current state immediately in case WS already open
    setIsConnected(_ws?.readyState === WebSocket.OPEN);

    const onStateChange = (open: boolean) => setIsConnected(open);
    _connListeners.add(onStateChange);
    return () => { _connListeners.delete(onStateChange); };
  }, []);

  // Handle side-effect notifications (device updates, regime changes, etc.)
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
    _msgCallbacks.add(handler);
    return () => { _msgCallbacks.delete(handler); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subscribe = useCallback((cb: (msg: WsMessage) => void) => {
    _msgCallbacks.add(cb);
    return () => { _msgCallbacks.delete(cb); };
  }, []);

  const send = useCallback((msg: WsMessage): boolean => {
    if (_ws?.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({ ...msg, timestamp: new Date().toISOString() }));
      return true;
    }
    // If still connecting, retry once after open
    if (_ws?.readyState === WebSocket.CONNECTING) {
      const payload = JSON.stringify({ ...msg, timestamp: new Date().toISOString() });
      const onOpen = () => {
        _ws?.send(payload);
        _ws?.removeEventListener('open', onOpen);
      };
      _ws.addEventListener('open', onOpen);
      return true; // optimistically true — will send on open
    }
    console.warn('[WS] send failed — not connected (state:', _ws?.readyState, ')');
    return false;
  }, []);

  return { subscribe, send, isConnected };
}
