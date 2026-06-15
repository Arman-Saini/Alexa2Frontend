// React hooks that wrap the API modules with loading/error state.
// Components import from here — never call apiClient directly in UI code.

import { useState, useEffect, useCallback } from 'react';
import { homeApi, voiceApi, simulateApi } from '../api';
import type { Anticipation, DigitalTwinResponse, SimulateEndpoint } from '../api';
import { ApiError } from '../api';
import { env } from '../config/env';
import { useAppStore } from '../store/store';

export type ProcessingTier = 'T0_LOCAL' | 'T1_LOCAL' | 'BACKEND' | null;

// Re-export types so existing consumers don't need to change imports
export type { Anticipation, DigitalTwinResponse as DigitalTwinData };

// ── Anticipations ─────────────────────────────────────────────────────────────

export function useAnticipations() {
  const [anticipations, setAnticipations] = useState<Anticipation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await homeApi.getAnticipations();
      setAnticipations(data.anticipations ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load anticipations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, env.POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch_]);

  return { anticipations, loading, error, refetch: fetch_ };
}

// ── Digital Twin State ────────────────────────────────────────────────────────

export function useDigitalTwin() {
  const [twinData, setTwinData] = useState<DigitalTwinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTwin = async () => {
      try {
        const data = await homeApi.getDigitalTwin();
        setTwinData(data);
        setError(null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Backend offline');
      }
    };

    fetchTwin();
    const id = setInterval(fetchTwin, env.POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return { twinData, error };
}

// ── Backend Voice ─────────────────────────────────────────────────────────────

export function useBackendVoice() {
  const [isProcessing, setIsProcessing] = useState(false);
  const addNotification = useAppStore((s) => s.addNotification);

  // Sends text to the backend T0→T1→T3 pipeline.
  // Returns the transcript + backend-generated response text.
  // Caller is responsible for local NLU routing — this only does the network call.
  const sendToBackend = useCallback(
    async (text: string): Promise<{ transcript: string; response: string } | null> => {
      setIsProcessing(true);
      try {
        const data = await voiceApi.transcribeMockText(text, true);
        const transcript = data.transcript ?? text;
        // Extract human-readable response from event_result
        const er = data.event_result as any;
        let response = '';
        if (er?.tier === 'T3' || er?.tier === 'CACHED') {
          const tc = (er?.result?.tool_calls ?? [])[0];
          if (tc?.tool_name === 'order_amazon_now') {
            const item = tc.tool_input?.items?.[0];
            response = item ? `Ordered ${item.quantity} ${item.unit} of ${item.name}.` : 'Order placed.';
          } else {
            response = (er?.result?.reasoning ?? '').split('.')[0] + '.';
          }
        } else if (er?.tier === 'T0' || er?.tier === 'T1') {
          response = (er?.result?.explanation ?? '').split('.')[0] + '.';
        } else if (er?.tier === 'LOGGED') {
          response = "I can help control your home devices. Try: \"bedroom fan on\" or \"dim the lights\".";
        }
        addNotification(`🌐 "${transcript}" — backend processed`, 'success');
        return { transcript, response: response.trim() || '' };
      } catch (err) {
        const detail = err instanceof ApiError
          ? `${err.status} ${err.statusText}`
          : 'offline';
        addNotification(`⚠️ Backend (${detail}) — local only`, 'warning');
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [addNotification]
  );

  return { sendToBackend, isProcessing };
}

// ── Simulate Events ───────────────────────────────────────────────────────────

export function useSimulateMode() {
  const addNotification = useAppStore((s) => s.addNotification);

  const simulate = useCallback(
    async (endpoint: SimulateEndpoint) => {
      try {
        const data = await simulateApi[endpoint]();
        const labels: Record<SimulateEndpoint, string> = {
          studyMode: 'Study Mode',
          nightSafetyCheck: 'Night Safety Check',
          powerCut: 'Power Cut Simulation',
        };
        addNotification(`⚡ ${labels[endpoint]} — ${data.message ?? 'done'}`, 'info');
        return data;
      } catch (err) {
        addNotification(
          err instanceof ApiError ? `Simulate failed: ${err.message}` : 'Backend offline — simulation skipped',
          'warning'
        );
        return null;
      }
    },
    [addNotification]
  );

  return simulate;
}
