// useMic , Chrome/Edge Web Speech API with continuous listening mode.
// Fixes: (1) restart chain bug where fresh.onend captured stale rec ref,
//        (2) immediate onend by pre-requesting getUserMedia permission.

import { useState, useCallback, useRef } from 'react';

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

type MicMode = 'idle' | 'listening';

function getSpeechRecCtor() {
  const w = window as typeof window & {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  };
  return w.webkitSpeechRecognition ?? w.SpeechRecognition ?? null;
}

export function useMic(onFinalTranscript: (text: string) => void) {
  const [mode,     setMode]     = useState<MicMode>('idle');
  const [liveText, setLiveText] = useState('');
  const [error,    setError]    = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const activeRef      = useRef(false);   // true while we want to keep listening
  const finalBufferRef = useRef('');
  const onFinalRef     = useRef(onFinalTranscript);
  onFinalRef.current   = onFinalTranscript;

  // Attach handlers to any SpeechRecognition instance.
  // Uses activeRef (not a captured rec) so the restart chain never breaks.
  const attachHandlers = useCallback((rec: SpeechRecognition) => {
    rec.onstart = () => setMode('listening');

    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const seg = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalBufferRef.current += seg + ' ';
        else interim += seg;
      }
      setLiveText(finalBufferRef.current + interim);
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech') return;
      if (e.error === 'aborted')   return;
      if (e.error === 'not-allowed') {
        setError('Microphone access denied. Click the lock icon in the address bar to allow it.');
        activeRef.current = false;
        setMode('idle');
      } else if (e.error === 'network') {
        setError('Speech recognition needs internet.');
      } else {
        setError(`Recognition error: ${e.error}. Try refreshing.`);
      }
    };

    // onend fires when Chrome's session times out (~60s) or on any stop.
    // If we still want to listen (activeRef = true), spin up a fresh instance.
    rec.onend = () => {
      if (!activeRef.current) return;   // intentional stop — do nothing
      recognitionRef.current = null;
      const SpeechRec = getSpeechRecCtor();
      if (!SpeechRec) return;
      const fresh = new SpeechRec();
      fresh.lang           = 'en-US';
      fresh.continuous     = true;
      fresh.interimResults = true;
      fresh.maxAlternatives = 1;
      attachHandlers(fresh);            // same function, no stale rec captured
      recognitionRef.current = fresh;
      try { fresh.start(); } catch { /* retry next onend */ }
    };
  }, []);

  const stop = useCallback((shouldProcess = true) => {
    activeRef.current = false;
    const rec = recognitionRef.current;
    if (rec) {
      rec.onend = null;  // prevent restart handler from firing
      try { rec.stop(); } catch { /* already stopped */ }
      recognitionRef.current = null;
    }
    setMode('idle');
    setLiveText('');

    const text = finalBufferRef.current.trim();
    finalBufferRef.current = '';
    if (shouldProcess && text) onFinalRef.current(text);
  }, []);

  const start = useCallback(async () => {
    if (activeRef.current) return;

    const SpeechRec = getSpeechRecCtor();
    if (!SpeechRec) {
      setError('Speech recognition requires Chrome or Edge.');
      return;
    }

    // Pre-request mic permission so Chrome doesn't fire onend immediately.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());  // release immediately, just needed for permission
    } catch {
      setError('Microphone access denied. Allow microphone access in your browser.');
      return;
    }

    setError(null);
    setLiveText('');
    finalBufferRef.current = '';
    activeRef.current = true;

    const rec = new SpeechRec();
    rec.lang            = 'en-US';
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.maxAlternatives = 1;
    attachHandlers(rec);
    recognitionRef.current = rec;

    try {
      rec.start();
    } catch {
      setError('Could not start microphone. Please try again.');
      activeRef.current = false;
      recognitionRef.current = null;
    }
  }, [attachHandlers]);

  const toggle = useCallback(() => {
    if (mode === 'listening') stop(true);
    else start();
  }, [mode, start, stop]);

  return { listening: mode === 'listening', liveText, error, toggle, stop, start };
}
