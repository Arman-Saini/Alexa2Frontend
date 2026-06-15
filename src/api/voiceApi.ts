import { apiClient } from './client';
import { endpoints } from './endpoints';

// ── Response types ────────────────────────────────────────────────────────────

export interface TranscribeResponse {
  transcript: string;
  stt_is_mock?: boolean;
  language?: string;
  audio_path?: string;
  spoken_text?: string;
  voice?: {
    audio_base64?: string;
    content_type?: string;
    is_mock?: boolean;
    voice_used?: string;
  };
  event_result?: {
    tier: string;
    cost?: string;
    message?: string;
    spoken_text?: string;
    voice?: {
      audio_base64?: string;
      content_type?: string;
      is_mock?: boolean;
    };
    result?: {
      reasoning?: string;
      explanation?: string;
      action?: string;
      intent?: string;
      final_plan?: string;
      specialist?: string;
      [key: string]: unknown;
    };
    actions_taken?: unknown[];
    [key: string]: unknown;
  };
}

export interface TtsResponse {
  audio_url?: string;
  audio_base64?: string;
  voice: string;
  text: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const voiceApi = {
  // Send typed text to the backend STT pipeline (mock mode , no real audio upload)
  transcribeMockText: (text: string, autoRoute = true, homeId?: string) =>
    apiClient.post<TranscribeResponse>(endpoints.transcribe, {
      home_id:    homeId,
      mock_text:  text,
      auto_route: autoRoute,
      language:   'en-IN',
      speaker_id: 'owner_1',
      voice_response: true,
    }, { timeoutMs: 45_000 }),

  // Upload a real audio Blob recorded from the browser mic
  transcribeAudio: (audioBlob: Blob, autoRoute = true) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'voice.webm');
    form.append('auto_route', String(autoRoute));
    form.append('language', 'en-IN');
    return apiClient.postForm<TranscribeResponse>(endpoints.transcribe, form);
  },

  // Text-to-speech , returns audio URL or base64
  synthesise: (text: string, voice?: string) =>
    apiClient.post<TtsResponse>(endpoints.tts, { text, voice }),
};
