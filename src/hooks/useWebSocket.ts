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
  | 'ping';

export interface WsMessage {
  type: WsMessageType;
  payload?: Record<string, unknown>;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsCallbacksRef = useRef<Array<(msg: WsMessage) => void>>([]);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Wait until the backend probe completes before attempting WS
    if (!backendState.isResolved) {
      onBackendResolved(() => { if (mountedRef.current) connect(); });
      return;
    }

    // If backend is unreachable, don't spam connection attempts
    if (backendState.source === 'offline') return;

    const wsUrl = backendState.url.replace(/^http/, 'ws') + `/ws?home_id=${env.HOME_ID}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.info('[WS] Connected to backend');
      };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data);
          if (msg.type === 'ping') return;

          wsCallbacksRef.current.forEach((cb) => cb(msg));

          if (msg.type === 'regime_change' && msg.payload) {
            const regime = msg.payload.new_regime as string;
            addNotification(`Home mode changed to ${regime}`, 'info');
          }

          if (msg.type === 'rule_proposed' && msg.payload) {
            addNotification(`New rule proposed: "${msg.payload.title ?? 'Auto rule'}"`, 'success');
          }

          if (msg.type === 'device_update' && msg.payload) {
            const { device_id, property, new_value } = msg.payload;
            addNotification(`${device_id}: ${property} → ${new_value}`, 'info');
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        if (!mountedRef.current) return;
        // Reconnect after 8s — longer gap to reduce noise when server is down
        reconnectRef.current = setTimeout(connect, 8000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      // WebSocket API not available
    }
  }, [addNotification]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((cb: (msg: WsMessage) => void) => {
    wsCallbacksRef.current.push(cb);
    return () => {
      wsCallbacksRef.current = wsCallbacksRef.current.filter((c) => c !== cb);
    };
  }, []);

  const isConnected = wsRef.current?.readyState === WebSocket.OPEN;

  return { subscribe, isConnected };
}
