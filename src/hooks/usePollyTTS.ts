// Plays Alexa's response via Amazon Polly (backend) with a browser speechSynthesis fallback.
// Enabled/disabled persists to localStorage. All components should use this instead of useTTS.

import { useState, useCallback, useRef, useEffect } from 'react';
import { backendApi } from '../api';

const STORAGE_KEY = 'alexa-tts-enabled';

function browserVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    // Prefer Indian English female voices
    voices.find(v => v.lang === 'en-IN' && /female|woman|neerja|lekha|raveena|aditi/i.test(v.name)) ??
    voices.find(v => v.lang === 'en-IN') ??
    // Fall back to high-quality female English voices
    voices.find(v => /Aria|Jenny|Neerja|Lekha/i.test(v.name)) ??
    voices.find(v => /female|woman/i.test(v.name) && v.lang.startsWith('en')) ??
    voices.find(v => v.lang === 'en-US' && /Samantha|Karen|Moira|Tessa/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith('en'))
  );
}

function fallbackSpeak(text: string, onEnd: () => void) {
  if (!window.speechSynthesis) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.rate = 0.92; utt.pitch = 1.2; utt.volume = 0.95;
  utt.onend = onEnd; utt.onerror = onEnd;
  const doSpeak = () => {
    const v = browserVoice();
    if (v) { utt.voice = v; utt.lang = v.lang; } else { utt.lang = 'en-US'; }
    window.speechSynthesis.speak(utt);
  };
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) { doSpeak(); }
  else { window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true }); }
}

// Pre-load voices once at module level so fallbackSpeak never waits for voiceschanged
if (typeof window !== 'undefined') {
  window.speechSynthesis?.getVoices();
  window.speechSynthesis?.addEventListener('voiceschanged', () => window.speechSynthesis?.getVoices(), { once: true });
}

export function usePollyTTS() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /**/ }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  const speak = useCallback(async (text: string) => {
    if (!enabled || !text) return;
    stop();
    setSpeaking(true);

    try {
      const res = await backendApi.speak(text, 'kajal') as { audio_base64?: string; content_type?: string; text: string; is_mock?: boolean };
      if (res.audio_base64 && !res.is_mock) {
        const contentType = res.content_type ?? 'audio/mpeg';
        const audio = new Audio(`data:${contentType};base64,${res.audio_base64}`);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => { setSpeaking(false); fallbackSpeak(text, () => setSpeaking(false)); };
        await audio.play();
        return;
      }
      // Backend returned mock (Polly not yet configured) — use browser TTS immediately
      fallbackSpeak(text, () => setSpeaking(false));
      return;
    } catch {
      // Backend offline or slow — use browser TTS immediately
    }

    fallbackSpeak(text, () => setSpeaking(false));
  }, [enabled, stop]);

  return { enabled, toggle, speak, stop, speaking };
}
