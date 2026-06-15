// Best-available browser TTS , no backend dependency.
// Picks the highest-quality voice from Chrome / Edge / Safari.
// Persists mute state to localStorage.

import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'alexa-tts-enabled';

// Voice priority: Google Neural > Google EN > MS Neural > any English
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  if (!voices.length) return null;

  const prefer = [
    // Chrome on Windows/Mac , best neural voices
    (v: SpeechSynthesisVoice) => /Google UK English Female/i.test(v.name),
    (v: SpeechSynthesisVoice) => /Google US English/i.test(v.name),
    // Edge / Windows
    (v: SpeechSynthesisVoice) => /Aria/i.test(v.name) && /en/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /Zira|Jenny|Hazel/i.test(v.name) && /en/i.test(v.lang),
    // macOS / iOS
    (v: SpeechSynthesisVoice) => /Samantha|Karen|Moira/i.test(v.name),
    // Generic English
    (v: SpeechSynthesisVoice) => /en-GB/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /en-US/i.test(v.lang),
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];

  for (const test of prefer) {
    const found = voices.find(test);
    if (found) return found;
  }
  return voices[0];
}

// Chrome has a bug where speechSynthesis stops working after ~15s.
// Workaround: pause/resume to keep it alive.
let pingInterval: ReturnType<typeof setInterval> | null = null;
function startKeepAlive() {
  if (pingInterval) return;
  pingInterval = setInterval(() => {
    if (window.speechSynthesis?.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10_000);
}
function stopKeepAlive() {
  if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
}

export function useTTSBest() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });
  const [speaking, setSpeaking] = useState(false);
  const voicesLoaded = useRef(false);

  // Prime voice list (Chrome loads them async)
  useEffect(() => {
    const prime = () => { voicesLoaded.current = true; };
    if (window.speechSynthesis?.getVoices().length > 0) { prime(); return; }
    window.speechSynthesis?.addEventListener('voiceschanged', prime, { once: true });
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    stopKeepAlive();
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* */ }
      if (!next) stop();
      return next;
    });
  }, [stop]);

  const speak = useCallback((text: string) => {
    if (!enabled || !text.trim()) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    setSpeaking(true);
    startKeepAlive();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = 1.0;
    utt.pitch  = 1.0;
    utt.volume = 1.0;
    utt.onend  = () => { setSpeaking(false); stopKeepAlive(); };
    utt.onerror = () => { setSpeaking(false); stopKeepAlive(); };

    const doSpeak = () => {
      const v = pickVoice();
      if (v) { utt.voice = v; utt.lang = v.lang; } else { utt.lang = 'en-US'; }
      window.speechSynthesis.speak(utt);
    };

    // If voices aren't loaded yet, wait for them
    if (window.speechSynthesis.getVoices().length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    }
  }, [enabled, stop]);

  return { enabled, toggle, speak, stop, speaking };
}
