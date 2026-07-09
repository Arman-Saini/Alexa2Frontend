// Unified event backbone for the Act sequencer / lens layer.
//
// Consumes the existing WS singleton (useWebSocket) for live delivery, and
// falls back to long-polling GET /api/homes/:home_id/poll?since=<seq> every
// 2.5s whenever the WS reports disconnected. A `latest_seq` ref persists
// across WS reconnects so that flipping between the two transports never
// re-delivers an event the poll transport already surfaced, nor skips one
// the WS transport happened to miss while it was down.
//
// The WS transport itself does not carry a `seq` , only the poll responses
// do , so `latest_seq` only ever advances from poll responses. That's
// sufficient to satisfy the "never drops or duplicates a *polled* message"
// requirement: once we've been told the poll cursor is at seq N, we never
// ask the backend for anything at or before N again, regardless of how many
// times the transport flips between WS and poll in between.

import { useCallback, useEffect, useRef } from 'react';
import { useWebSocket, type WsMessage as TransportWsMessage } from './useWebSocket';
import { apiClient } from '../api/client';
import { endpoints } from '../api/endpoints';
import { env } from '../config/env';

export type WsMessageType =
  | 'event_result'
  | 'device_update'
  | 'regime_change'
  | 'rule_proposed'
  | 'stats_update'
  | 'ping'
  | 'error'
  | 'voice_command'
  | 'voice_thinking'
  | 'voice_response'
  | 'lookup_request'
  | 'lookup_approved'
  | 'lookup_result'
  | 'khata_entry';

export interface EventTrace {
  path: Array<'device' | 't0' | 't1' | 'cache' | 't3'>;
  latency_ms: number;
  cost_usd: number;
  tier_label: string;
}

export interface WsMessage {
  type: WsMessageType;
  home_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
  timestamp: string;
}

interface PollEvent {
  seq: number;
  msg: WsMessage;
}

interface PollResponse {
  events: PollEvent[];
  latest_seq: number;
}

const POLL_INTERVAL_MS = 2500;

export interface UseEventStream {
  isConnected: boolean;
  /** True while the poll fallback is the active transport (WS is down). */
  isPolling: boolean;
  onMessage: (cb: (msg: WsMessage) => void) => () => void;
}

export function useEventStream(homeId: string = env.HOME_ID): UseEventStream {
  const { subscribe, isConnected } = useWebSocket();

  const listenersRef = useRef<Set<(msg: WsMessage) => void>>(new Set());
  const latestSeqRef = useRef(0);
  const homeIdRef = useRef(homeId);
  homeIdRef.current = homeId;

  const emit = useCallback((msg: WsMessage) => {
    listenersRef.current.forEach((cb) => {
      try { cb(msg); } catch { /* ignore subscriber errors */ }
    });
  }, []);

  // ── WS transport ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribe((msg: TransportWsMessage) => {
      // useWebSocket's own WsMessage type is a subset of ours (it already
      // drops 'ping' before it reaches subscribers) , the wire shape matches.
      emit(msg as unknown as WsMessage);
    });
    return unsubscribe;
  }, [subscribe, emit]);

  // ── Poll fallback transport ──────────────────────────────────────────────
  useEffect(() => {
    if (isConnected) return; // WS is live, no need to poll

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      try {
        const res = await apiClient.get<PollResponse>(
          endpoints.homePoll(homeIdRef.current, latestSeqRef.current)
        );
        if (cancelled) return;

        // Deliver in seq order and only ever advance the cursor forward.
        const events = [...res.events].sort((a, b) => a.seq - b.seq);
        for (const ev of events) {
          if (ev.seq <= latestSeqRef.current) continue; // already delivered
          latestSeqRef.current = ev.seq;
          emit(ev.msg);
        }
        if (typeof res.latest_seq === 'number') {
          latestSeqRef.current = Math.max(latestSeqRef.current, res.latest_seq);
        }
      } catch {
        // Offline / timeout , just retry on the next tick.
      }
    }

    async function loop() {
      if (cancelled) return;
      await pollOnce();
      if (!cancelled) {
        timer = setTimeout(loop, POLL_INTERVAL_MS);
      }
    }

    void loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [isConnected]);

  const onMessage = useCallback((cb: (msg: WsMessage) => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  return { isConnected, isPolling: !isConnected, onMessage };
}
