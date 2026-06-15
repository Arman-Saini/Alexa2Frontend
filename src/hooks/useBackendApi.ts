// React hooks that wrap the API modules with loading/error state.
// Components import from here — never call apiClient directly in UI code.

import { useState, useEffect, useCallback } from 'react';
import { homeApi, voiceApi, simulateApi } from '../api';
import type { Anticipation, DigitalTwinResponse, SimulateEndpoint } from '../api';
import { ApiError } from '../api';
import { env } from '../config/env';
import { useAppStore } from '../store/store';

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
  const executeVoiceCommand = useAppStore((s) => s.executeVoiceCommand);

  const sendMockText = useCallback(
    async (text: string): Promise<{ transcript: string; response: string } | null> => {
      setIsProcessing(true);
      try {
        const data = await voiceApi.transcribeMockText(text, true);
        const localResponse = executeVoiceCommand(data.transcript ?? text);
        addNotification(`🎤 "${data.transcript ?? text}" → routed via backend`, 'success');
        return { transcript: data.transcript ?? text, response: localResponse };
      } catch (err) {
        const detail = err instanceof ApiError
          ? `${err.status} ${err.statusText} — ${String(err.url).split('/').slice(-2).join('/')}`
          : 'backend offline';
        addNotification(`🎤 Transcribe failed (${detail}) — using local NLU`, 'warning');
        const response = executeVoiceCommand(text);
        return { transcript: text, response };
      } finally {
        setIsProcessing(false);
      }
    },
    [executeVoiceCommand, addNotification]
  );

  const sendAudio = useCallback(
    async (audioBlob: Blob): Promise<{ transcript: string; response: string } | null> => {
      setIsProcessing(true);
      try {
        const data = await voiceApi.transcribeAudio(audioBlob, true);
        if (!data.transcript) return null;
        const localResponse = executeVoiceCommand(data.transcript);
        addNotification(`🎤 "${data.transcript}"`, 'success');
        return { transcript: data.transcript, response: localResponse };
      } catch (err) {
        addNotification(
          `Audio transcription failed: ${err instanceof ApiError ? err.message : 'Unknown error'}`,
          'alert'
        );
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [executeVoiceCommand, addNotification]
  );

  return { sendMockText, sendAudio, isProcessing };
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
