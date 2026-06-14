import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/store';

const BACKEND = (import.meta as { env?: Record<string, string> }).env?.VITE_BACKEND_URL ?? 'http://localhost:3001';
const HOME_ID = 'home_001';

export interface Anticipation {
  action: string;
  reason: string;
  tier: string;
  confidence: number;
  trigger_window?: string;
}

export interface DigitalTwinData {
  current_mode: string;
  mode_info: { label: string; color: string; description: string };
  available_modes: Array<{ mode: string; label: string; description: string; color: string }>;
  rooms: Array<{
    id: string;
    name: string;
    device_count: number;
    on_count: number;
  }>;
}

export function useAnticipations() {
  const [anticipations, setAnticipations] = useState<Anticipation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(() => {
    setLoading(true);
    fetch(`${BACKEND}/api/homes/${HOME_ID}/anticipations`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.anticipations)) {
          setAnticipations(data.anticipations);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  return { anticipations, loading, refetch: fetch_ };
}

export function useDigitalTwin() {
  const [twinData, setTwinData] = useState<DigitalTwinData | null>(null);

  useEffect(() => {
    const fetchTwin = () => {
      fetch(`${BACKEND}/api/homes/${HOME_ID}/twin`)
        .then((r) => r.json())
        .then((data) => setTwinData(data))
        .catch(() => {});
    };

    fetchTwin();
    const id = setInterval(fetchTwin, 30_000);
    return () => clearInterval(id);
  }, []);

  return twinData;
}

export function useBackendVoice() {
  const [isProcessing, setIsProcessing] = useState(false);
  const addNotification = useAppStore((s) => s.addNotification);
  const executeVoiceCommand = useAppStore((s) => s.executeVoiceCommand);

  const sendAudio = useCallback(
    async (audioBlob: Blob): Promise<{ transcript: string; response: string } | null> => {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        formData.append('auto_route', 'true');
        formData.append('language', 'en-IN');

        const res = await fetch(`${BACKEND}/api/voice/transcribe`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();

        if (data.transcript) {
          const response = executeVoiceCommand(data.transcript);
          addNotification(`🎤 "${data.transcript}" → ${response}`, 'info');
          return { transcript: data.transcript, response };
        }
        return null;
      } catch {
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    [executeVoiceCommand, addNotification]
  );

  const sendMockText = useCallback(
    async (text: string): Promise<{ transcript: string; response: string } | null> => {
      setIsProcessing(true);
      try {
        const res = await fetch(`${BACKEND}/api/voice/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mock_text: text, auto_route: true }),
        });
        const data = await res.json();

        if (data.transcript || data.event_result) {
          const localResponse = executeVoiceCommand(text);
          addNotification(`🎤 "${text}" → processed`, 'success');
          return { transcript: text, response: localResponse };
        }
        return null;
      } catch {
        // Backend offline — fall back to local NLU
        const response = executeVoiceCommand(text);
        return { transcript: text, response };
      } finally {
        setIsProcessing(false);
      }
    },
    [executeVoiceCommand, addNotification]
  );

  return { sendAudio, sendMockText, isProcessing };
}

export function useSimulateMode() {
  const addNotification = useAppStore((s) => s.addNotification);

  const simulate = useCallback(
    async (endpoint: 'study_mode' | 'night_safety_check' | 'power_cut') => {
      try {
        const res = await fetch(`${BACKEND}/api/simulate/${endpoint}`, { method: 'POST' });
        const data = await res.json();
        const label =
          endpoint === 'study_mode'
            ? 'Study Mode'
            : endpoint === 'night_safety_check'
            ? 'Night Safety Check'
            : 'Power Cut Simulation';
        addNotification(`⚡ ${label} simulated — ${data.message ?? 'done'}`, 'info');
        return data;
      } catch {
        addNotification('Backend offline — simulation skipped', 'warning');
        return null;
      }
    },
    [addNotification]
  );

  return simulate;
}
