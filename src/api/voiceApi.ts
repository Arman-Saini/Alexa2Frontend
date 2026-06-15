import { apiClient } from './client';
import { endpoints } from './endpoints';
import { env } from '../config/env';

// ── Response types ────────────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcript: string;
  stt_is_mock: boolean;
  language: string;
  audio_path?: string;
  event_result?: {
    tier: string;
    result?: unknown;
    message?: string;
    actions_taken?: unknown[];
  };
}

export interface TtsResponse {
  audio_base64?: string;
  voice_used?: string;
  is_mock?: boolean;
  content_type?: string;
  duration_estimate_ms?: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const voiceApi = {
  // Send typed text to the backend STT pipeline (mock mode — no real audio upload)
  transcribeMockText: (text: string, autoRoute = true) =>
    apiClient.post<TranscribeResponse>(endpoints.transcribe, {
      home_id: env.HOME_ID,
      mock_text: text,
      auto_route: autoRoute,
      language: 'en-IN',
      speaker_id: 'owner_1',
    }),

  // Upload a real audio Blob recorded from the browser mic
  transcribeAudio: (audioBlob: Blob, autoRoute = true) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'voice.webm');
    form.append('home_id', env.HOME_ID);
    form.append('auto_route', String(autoRoute));
    form.append('language', 'en-IN');
    return apiClient.postForm<TranscribeResponse>(endpoints.transcribe, form);
  },

  // Text-to-speech via Amazon Polly — returns base64 MP3 playable in all browsers
  synthesise: (text: string, voice = 'kajal') =>
    apiClient.post<TtsResponse>(endpoints.tts, { text, voice, home_id: env.HOME_ID }),
};
