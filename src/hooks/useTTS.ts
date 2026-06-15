// useTTS , browser speechSynthesis wrapper with a persistent on/off toggle.
// No backend dependency , works fully offline via Web Speech API.

import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'alexa-tts-enabled';

let voicesReady = false;
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const prime = () => { voicesReady = window.speechSynthesis.getVoices().length > 0; };
  prime();
  window.speechSynthesis.addEventListener('voiceschanged', prime);
}

function bestVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find(v => /Aria|Jenny|Samantha/i.test(v.name) && /Neural|Natural/i.test(v.name)) ??
    voices.find(v => v.lang.startsWith('en') && /Neural|Natural/i.test(v.name)) ??
    voices.find(v => /Google UK English Female/i.test(v.name)) ??
    voices.find(v => /Google US English/i.test(v.name)) ??
    voices.find(v => v.lang === 'en-IN') ??
    voices.find(v => v.lang === 'en-US') ??
    voices.find(v => v.lang.startsWith('en'))
  );
}

export function useTTS() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });

  const [speaking, setSpeaking] = useState(false);

  // Keep speaking state in sync
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const id = setInterval(() => {
      setSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(id);
  }, []);

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* */ }
      if (!next) { window.speechSynthesis?.cancel(); setSpeaking(false); }
      return next;
    });
  }, []);

  const speak = useCallback((text: string) => {
    if (!enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = 0.92;
    utt.pitch  = 1.05;
    utt.volume = 0.88;
    utt.onstart = () => setSpeaking(true);
    utt.onend   = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);

    const doSpeak = () => {
      const v = bestVoice();
      if (v) { utt.voice = v; utt.lang = v.lang; }
      else     { utt.lang = 'en-US'; }
      window.speechSynthesis.speak(utt);
    };

    if (voicesReady) {
      doSpeak();
    } else {
      window.speechSynthesis.addEventListener('voiceschanged', doSpeak, { once: true });
    }
  }, [enabled]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { enabled, toggle, speak, stop, speaking };
}
