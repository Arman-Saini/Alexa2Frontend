import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/store';
import { ASSET_MAP } from '../../constants/assets';
import { useWebSocket } from '../../hooks/useWebSocket';
import { backendState, onBackendResolved } from '../../config/backendState';
import { env } from '../../config/env';
import type { BackendSource } from '../../config/backendState';
import type { PlacedObject, AlexaNotification } from '../../types';

// Browser SpeechSynthesis helper — picks an Indian English voice when available
function browserSpeak(text: string) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const indian = voices.find(v => v.lang === 'en-IN') ?? voices.find(v => v.lang.startsWith('en'));
  if (indian) utter.voice = indian;
  utter.rate = 0.95;
  utter.pitch = 1.05;
  window.speechSynthesis.speak(utter);
}

// ─── Top Status Bar ───────────────────────────────────────────────────────────
function StatusBar() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const time = `${hh}:${mm}`;
  return (
    <div className="flex items-center justify-between px-4 pt-1.5 pb-1 bg-alexa-dark shrink-0">
      <span className="text-[11px] font-semibold text-alexa-text">{time}</span>
      <div className="flex items-center gap-1.5">
        <svg className="w-3 h-3 text-alexa-text" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
        </svg>
        <svg className="w-3.5 h-2.5 text-alexa-text" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="1" width="16" height="12" rx="1.5" />
          <path d="M17 5h2v4h-2" />
        </svg>
      </div>
    </div>
  );
}

// ─── Dynamic audio-reactive waveform bars ─────────────────────────────────────
export function LiveWaveform({ isListening, barCount = 20 }: { isListening: boolean; barCount?: number }) {
  const [bars, setBars] = useState<number[]>(Array(barCount).fill(0.15));
  const animRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const teardown = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    analyserRef.current?.disconnect();
    audioCtxRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach(t => t.stop());
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current = null;
  }, []);

  // Idle random animation — always running when not listening
  useEffect(() => {
    if (isListening) return;
    let t = 0;
    const noise = Array.from({ length: barCount }, () => Math.random() * Math.PI * 2);
    const idle = () => {
      t += 0.025;
      setBars(Array.from({ length: barCount }, (_, i) => {
        const slow = 0.13 + 0.07 * Math.sin(t * 0.7 + i * 0.5);
        const fast = 0.04 * Math.sin(t * 2.3 + noise[i]);
        return Math.max(0.06, slow + fast);
      }));
      animRef.current = requestAnimationFrame(idle);
    };
    animRef.current = requestAnimationFrame(idle);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isListening, barCount]);

  // Mic-reactive animation — only when listening
  useEffect(() => {
    if (!isListening) { teardown(); return; }

    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const step = Math.floor(data.length / barCount);
        setBars(Array.from({ length: barCount }, (_, i) => {
          const raw = data[i * step] ?? 0;
          return Math.max(0.08, raw / 255);
        }));
        animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    }).catch(() => {
      // mic denied while listening — fast pulse
      let t = 0;
      const pulse = () => {
        t += 0.15;
        setBars(Array.from({ length: barCount }, (_, i) => 0.2 + 0.25 * Math.abs(Math.sin(t + i * 0.3))));
        animRef.current = requestAnimationFrame(pulse);
      };
      animRef.current = requestAnimationFrame(pulse);
    });

    return () => { cancelled = true; teardown(); };
  }, [isListening, barCount, teardown]);

  return (
    <div className="flex items-end justify-center gap-[2px]" style={{ height: 32 }}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${Math.round(h * 32)}px`,
            borderRadius: 2,
            background: isListening
              ? `linear-gradient(to top, #00A8E0, #00D4FF)`
              : `linear-gradient(to top, #3B82F6, #93C5FD)`,
            transition: isListening ? 'height 50ms linear' : 'height 120ms ease',
            opacity: isListening ? 1 : 0.45,
          }}
        />
      ))}
    </div>
  );
}

// ─── Chat message type ────────────────────────────────────────────────────────
interface ChatMsg {
  id: string;
  role: 'user' | 'alexa';
  text: string;
  tier?: string;
  specialist?: string;
  isLookupRequest?: boolean;
  lookupQuery?: string;
  timestamp: string;
}

// ─── Alexa Ring + Voice Input ─────────────────────────────────────────────────
function AlexaRing({ onVoiceSubmit, onRingClick }: { onVoiceSubmit: (text: string) => void; onRingClick?: () => void }) {
  const { ui, setListeningVoice } = useAppStore();
  const [inputText, setInputText] = useState('');
  const [backendSource, setBackendSource] = useState<BackendSource>(backendState.source);
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');
  const [isWaitingResponse, setIsWaitingResponse] = useState(false);
  const [chatLog, setChatLog] = useState<ChatMsg[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const runLocalCommand = useAppStore((s) => s.runLocalCommand);
  const setLastCloudCommand = useAppStore((s) => s.setLastCloudCommand);
  const setLastSpecialist = useAppStore((s) => s.setLastSpecialist);
  const setPendingLookup = useAppStore((s) => s.setPendingLookup);
  const addActiveMemory = useAppStore((s) => s.addActiveMemory);
  const inputRef = useRef<HTMLInputElement>(null);
  const { subscribe, send, isConnected } = useWebSocket();
  const pendingRequestIdRef = useRef<string | null>(null);
  const isListening = ui.isListeningVoice;

  useEffect(() => {
    setBackendSource(backendState.source);
    onBackendResolved(() => setBackendSource(backendState.source));
  }, []);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  // Subscribe to WS voice responses
  useEffect(() => {
    return subscribe((msg) => {
      if (msg.type === 'voice_thinking') {
        setIsWaitingResponse(true);
      } else if (msg.type === 'voice_response') {
        const p = msg.payload as any;
        if (p.request_id && p.request_id !== pendingRequestIdRef.current) return;
        const spokenText: string = p.spoken_text ?? '';
        setIsWaitingResponse(false);
        setChatLog(prev => [...prev, {
          id: Date.now().toString(),
          role: 'alexa',
          text: spokenText,
          tier: p.tier,
          specialist: p.specialist ?? p.routing?.specialist,
          timestamp: new Date().toLocaleTimeString(),
        }]);
        if (p.tier !== 'RATE_LIMITED' && p.tier !== 'ERROR') {
          if (p.specialist) setLastSpecialist(p.specialist);
          if (p.transcript) setLastCloudCommand(p.transcript);
        }
        if (p.audio_base64 && !p.audio_is_mock) {
          const audio = new Audio(`data:${p.audio_content_type ?? 'audio/mpeg'};base64,${p.audio_base64}`);
          audio.onerror = () => browserSpeak(spokenText);
          audio.play().catch(() => browserSpeak(spokenText));
        } else {
          browserSpeak(spokenText);
        }
      } else if (msg.type === 'lookup_request') {
        const p = msg.payload as any;
        setIsWaitingResponse(false);
        setChatLog(prev => [...prev, {
          id: Date.now().toString(),
          role: 'alexa',
          text: p.spoken_text ?? `I'd need to look up "${p.query}" online. Should I search for it?`,
          tier: 'T3',
          isLookupRequest: true,
          lookupQuery: p.query,
          timestamp: new Date().toLocaleTimeString(),
        }]);
        setPendingLookup(p.query);
        addActiveMemory({ query: p.query, timestamp: new Date().toISOString(), approved: false });
        browserSpeak(`I'd need to look that up online. Should I search for it?`);
      }
    });
  }, [subscribe, setLastCloudCommand, setLastSpecialist, setPendingLookup, addActiveMemory]);

  const isNonEnglish = (text: string) => /[ऀ-ॿ؀-ۿ一-鿿가-힯぀-ゟ゠-ヿ]/.test(text);

  const handleVoiceResult = useCallback((text: string) => {
    onVoiceSubmit(text);
    setListeningVoice(false);

    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text, timestamp: new Date().toLocaleTimeString() };
    setChatLog(prev => [...prev, userMsg]);

    // T0: local command processor handles device commands instantly
    if (!isNonEnglish(text)) {
      const localResult = runLocalCommand(text);
      if (localResult.matched && localResult.tier !== 'BACKEND_NEEDED') {
        // T0 handled — respond immediately, no network
        const alexaMsg: ChatMsg = {
          id: (Date.now() + 1).toString(),
          role: 'alexa',
          text: localResult.response,
          tier: localResult.tier ?? 'T0',
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatLog(prev => [...prev, alexaMsg]);
        browserSpeak(localResult.response);
        return;
      }
    }

    // T1/T3: send via WebSocket
    const requestId = `req_${Date.now()}`;
    pendingRequestIdRef.current = requestId;
    setIsWaitingResponse(true);

    const sent = send({
      type: 'voice_command',
      home_id: env.HOME_ID,
      payload: { transcript: text, speaker_id: 'owner_1', request_id: requestId },
    });

    if (!sent) {
      // WS not connected — show offline message
      setIsWaitingResponse(false);
      const offlineMsg: ChatMsg = {
        id: (Date.now() + 1).toString(),
        role: 'alexa',
        text: backendSource === 'offline'
          ? 'Backend is offline. I can handle basic device commands locally.'
          : 'Connecting to Alexa+… please try again in a moment.',
        tier: 'OFFLINE',
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatLog(prev => [...prev, offlineMsg]);
    }
  }, [runLocalCommand, send, onVoiceSubmit, setListeningVoice, backendSource]);

  const handleLookupApproved = (query: string, approved: boolean) => {
    addActiveMemory({ query, timestamp: new Date().toISOString(), approved });
    setPendingLookup(null);

    // Mark the lookup msg as resolved in chat
    setChatLog(prev => prev.map(m => m.lookupQuery === query ? { ...m, isLookupRequest: false } : m));

    if (approved) {
      send({ type: 'lookup_approved', home_id: env.HOME_ID, payload: { query, request_id: pendingRequestIdRef.current } });
      setIsWaitingResponse(true);
    } else {
      const decline = "Okay, I won't search online. Let me know if you need anything else.";
      setChatLog(prev => [...prev, { id: Date.now().toString(), role: 'alexa', text: decline, tier: 'T3', timestamp: new Date().toLocaleTimeString() }]);
      browserSpeak(decline);
    }
  };

  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const finalBufferRef = useRef('');

  const startListening = () => {
    setMicError(null);
    setListeningVoice(true);

    const SpeechRecognitionClass = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionClass) {
      setMicError('Voice input not supported in this browser. Please type your command.');
      setListeningVoice(false);
      return;
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    finalBufferRef.current = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let newFinal = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) newFinal += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      if (newFinal) finalBufferRef.current += ' ' + newFinal;
      const liveText = (finalBufferRef.current + ' ' + interim).trim();
      setInputText(liveText);
      setInterimText(liveText);

      if (newFinal && !interim) {
        const accumulated = finalBufferRef.current.trim();
        finalBufferRef.current = '';
        const cleaned = accumulated.replace(/^(hey\s+)?alexa[,\s]*/i, '').trim() || accumulated;
        isRecordingRef.current = false;
        setIsRecording(false);
        setInterimText('');
        setInputText('');
        recognition.stop();
        handleVoiceResult(cleaned);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') { setInterimText(''); return; }
      const msg = event.error === 'not-allowed'
        ? 'Mic access denied — allow microphone in browser settings'
        : `Voice error: ${event.error}`;
      setMicError(msg);
      isRecordingRef.current = false;
      setIsRecording(false);
      setListeningVoice(false);
    };

    recognition.onend = () => {
      if (isRecordingRef.current) { try { recognition.start(); } catch { /* already stopped */ } return; }
      setIsRecording(false);
      setListeningVoice(false);
    };

    isRecordingRef.current = true;
    setIsRecording(true);
    try { recognition.start(); } catch {
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  };

  const stopListening = () => {
    isRecordingRef.current = false;
    const accumulated = finalBufferRef.current.trim();
    finalBufferRef.current = '';
    recognitionRef.current?.stop();
    setIsRecording(false);
    setListeningVoice(false);
    setInterimText('');
    setInputText('');
    if (accumulated) handleVoiceResult(accumulated.replace(/^(hey\s+)?alexa[,\s]*/i, '').trim());
  };

  const handleRingClick = () => {
    if (onRingClick) { onRingClick(); return; }
    if (isRecording || isListening) stopListening();
    else startListening();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isRecording) return;
    const text = inputText.trim();
    setInputText('');
    handleVoiceResult(text);
  };

  const active = isRecording || isListening || isWaitingResponse;

  const tierColor: Record<string, string> = {
    T0: '#4ADE80', T1: '#60A5FA', T3: '#C084FC', CACHED: '#FCD34D', OFFLINE: '#F87171', RATE_LIMITED: '#F87171', ERROR: '#F87171',
  };

  const wsBadge = isConnected
    ? { bg: '#0A2A14', border: '#4ADE80', text: '#4ADE80', label: '⚡ Live' }
    : backendSource === 'offline'
      ? { bg: '#1A0A0A', border: '#F87171', text: '#F87171', label: '⚠ Offline' }
      : { bg: '#1A1A0A', border: '#AAAA44', text: '#AAAA44', label: '⟳ Connecting' };

  return (
    <div className="flex flex-col bg-alexa-dark shrink-0">
      {/* ── Chat log ── */}
      <div className="overflow-y-auto px-3 py-2 flex flex-col gap-2 scrollbar-none" style={{ maxHeight: 220, minHeight: chatLog.length ? 64 : 0 }}>
        {chatLog.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'alexa' && (
              <div className="w-5 h-5 rounded-full shrink-0 mr-1.5 mt-0.5"
                style={{ background: 'conic-gradient(from 0deg, #005580, #00A8E0, #005580)' }} />
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              msg.role === 'user'
                ? 'bg-alexa-blue/20 text-alexa-text rounded-tr-sm'
                : 'bg-alexa-card border border-alexa-border text-alexa-text rounded-tl-sm'
            }`}>
              <p>{msg.text}</p>
              {msg.isLookupRequest && msg.lookupQuery && (
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={() => handleLookupApproved(msg.lookupQuery!, true)}
                    className="flex-1 py-1 rounded-lg bg-alexa-blue text-white text-[9px] font-semibold hover:opacity-90 transition-opacity"
                  >Yes, search</button>
                  <button
                    onClick={() => handleLookupApproved(msg.lookupQuery!, false)}
                    className="flex-1 py-1 rounded-lg bg-alexa-card2 text-alexa-muted text-[9px] font-semibold hover:text-alexa-text border border-alexa-border transition-colors"
                  >No thanks</button>
                </div>
              )}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[8px] text-alexa-muted">{msg.timestamp}</span>
                {msg.tier && (
                  <span className="text-[8px] font-bold px-1 rounded" style={{ color: tierColor[msg.tier] ?? '#888' }}>
                    {msg.tier}{msg.specialist ? ` · ${msg.specialist}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {isWaitingResponse && (
          <div className="flex justify-start">
            <div className="w-5 h-5 rounded-full shrink-0 mr-1.5 mt-0.5"
              style={{ background: 'conic-gradient(from 0deg, #005580, #00A8E0, #005580)' }} />
            <div className="bg-alexa-card border border-alexa-border rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
              {[0,1,2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-alexa-blue animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* ── Controls ── */}
      <div className="shrink-0 px-3 pb-2 pt-1 flex flex-col items-center gap-1.5">
        {/* Waveform — always animating, mic-reactive when recording */}
        <LiveWaveform isListening={isRecording} barCount={20} />

        {isRecording && interimText && (
          <div className="w-full rounded-lg px-3 py-1 text-center"
            style={{ background: 'rgba(0,168,224,0.08)', border: '1px solid rgba(0,168,224,0.2)' }}>
            <span className="text-[11px] text-alexa-ring italic">{interimText}</span>
          </div>
        )}

        <div className="flex items-center gap-3 w-full">
          {/* Mic button */}
          <button
            onClick={handleRingClick}
            disabled={isWaitingResponse}
            className={`relative w-11 h-11 rounded-full shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-40 ${
              active ? 'scale-110' : 'hover:scale-105'
            }`}
            style={{
              background: isRecording
                ? 'conic-gradient(from 0deg, #00A8E0, #00CAFF, #00D4FF, #0080B0, #005580, #00A8E0)'
                : 'conic-gradient(from 0deg, #005580, #0080B0, #00A8E0, #00CAFF, #0080B0, #005580)',
              boxShadow: active ? '0 0 16px rgba(0,168,224,0.5)' : '0 0 6px rgba(0,168,224,0.15)',
            }}
          >
            <div className="w-8 h-8 rounded-full bg-alexa-dark flex items-center justify-center">
              {isRecording ? (
                <svg className="w-4 h-4 text-alexa-ring" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-alexa-blue" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm0 2a2 2 0 00-2 2v7a2 2 0 004 0V5a2 2 0 00-2-2zm-7 9a7 7 0 0014 0h2a9 9 0 01-18 0h2z" />
                </svg>
              )}
            </div>
            {isRecording && (
              <span className="absolute inset-0 rounded-full animate-ping opacity-30" style={{ background: '#00A8E0' }} />
            )}
          </button>

          {/* Text input */}
          <form onSubmit={handleSubmit} className="flex-1">
            <div className={`flex items-center gap-2 bg-alexa-card border rounded-full px-3 py-1.5 transition-colors ${isRecording ? 'border-alexa-blue' : 'border-alexa-border'}`}>
              {isRecording && <div className="w-1.5 h-1.5 rounded-full bg-alexa-blue animate-pulse shrink-0" />}
              <input
                ref={inputRef}
                value={inputText}
                onChange={(e) => { if (!isRecording) setInputText(e.target.value); }}
                placeholder={isRecording ? 'Listening…' : 'Type or tap mic…'}
                className={`flex-1 bg-transparent text-xs placeholder-alexa-muted focus:outline-none ${isRecording && inputText ? 'text-alexa-blue italic' : 'text-alexa-text'}`}
              />
              <button type="submit" disabled={isWaitingResponse || !inputText.trim() || isRecording}
                className="text-alexa-blue hover:text-alexa-ring transition-colors disabled:opacity-30 shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </form>

          {/* WS status badge */}
          <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold"
            style={{ background: wsBadge.bg, border: `1px solid ${wsBadge.border}`, color: wsBadge.text }}>
            <span className="w-1 h-1 rounded-full" style={{ background: wsBadge.border }} />
            {wsBadge.label}
          </span>
        </div>

        {micError && <p className="text-[10px] text-red-400 text-center">{micError}</p>}
      </div>
    </div>
  );
}

// ─── Scene Shortcuts ─────────────────────────────────────────────────────────
function SceneRow() {
  const { scenes, triggerScene } = useAppStore();
  return (
    <div className="px-3 py-2 shrink-0">
      <p className="text-xs font-semibold text-alexa-muted uppercase tracking-wider mb-2 px-1">Scenes</p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => triggerScene(s.id)}
            className="flex flex-col items-center gap-1 shrink-0 w-16 py-2 rounded-xl bg-alexa-card hover:bg-alexa-card2 border border-alexa-border transition-all active:scale-95"
          >
            <span className="text-xl">{s.emoji}</span>
            <span className="text-[9px] text-alexa-muted leading-tight text-center">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Energy Summary Card ───────────────────────────────────────────────────────
function EnergySummary() {
  const placedObjects = useAppStore((s) => s.placedObjects);
  const onDevices = placedObjects.filter((o) => o.isAlexaDevice && o.alexaDeviceState.isOn);
  const totalWatts = onDevices.reduce((sum, o) => sum + (o.alexaDeviceState.powerConsumption ?? 0), 0);
  const totalDevices = placedObjects.filter((o) => o.isAlexaDevice).length;

  return (
    <div className="mx-3 mb-2 px-3 py-2.5 rounded-xl bg-alexa-card border border-alexa-border flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-alexa-accent flex items-center justify-center shrink-0">
        <span className="text-lg">⚡</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-alexa-muted">Energy Now</p>
        <p className="text-sm font-bold text-alexa-text">{totalWatts.toFixed(0)}W</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-alexa-muted">Devices</p>
        <p className="text-sm font-bold text-alexa-green">{onDevices.length}<span className="text-alexa-muted font-normal">/{totalDevices}</span></p>
      </div>
    </div>
  );
}

// ─── Notification Feed ────────────────────────────────────────────────────────
function NotificationFeed() {
  const { notifications, dismissNotification } = useAppStore();
  if (notifications.length === 0) return null;

  const colorMap = {
    info: 'text-alexa-blue',
    success: 'text-alexa-green',
    warning: 'text-alexa-orange',
    alert: 'text-alexa-red',
  };

  return (
    <div className="px-3 pb-2 flex flex-col gap-1.5 shrink-0">
      <div className="flex items-center justify-between mb-1 px-1">
        <p className="text-xs font-semibold text-alexa-muted uppercase tracking-wider">Recent Activity</p>
        {notifications.length > 1 && (
          <button onClick={() => useAppStore.getState().clearNotifications()} className="text-[10px] text-alexa-muted hover:text-alexa-text">
            Clear all
          </button>
        )}
      </div>
      {notifications.slice(0, 4).map((n) => (
        <NotifItem key={n.id} n={n} onDismiss={() => dismissNotification(n.id)} colorMap={colorMap} />
      ))}
    </div>
  );
}

function NotifItem({
  n,
  onDismiss,
  colorMap,
}: {
  n: AlexaNotification;
  onDismiss: () => void;
  colorMap: Record<string, string>;
}) {
  const elapsed = Math.round((Date.now() - n.timestamp) / 1000);
  const timeLabel = elapsed < 60 ? 'just now' : elapsed < 3600 ? `${Math.floor(elapsed / 60)}m ago` : `${Math.floor(elapsed / 3600)}h ago`;

  return (
    <div className="flex items-start gap-2 px-2 py-1.5 rounded-lg bg-alexa-card border border-alexa-border notif-badge">
      <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
        n.type === 'success' ? 'bg-alexa-green' :
        n.type === 'warning' ? 'bg-alexa-orange' :
        n.type === 'alert' ? 'bg-alexa-red' : 'bg-alexa-blue'
      }`} />
      <p className={`flex-1 text-xs leading-tight ${colorMap[n.type]}`}>{n.message}</p>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[10px] text-alexa-muted">{timeLabel}</span>
        <button onClick={onDismiss} className="text-alexa-muted hover:text-alexa-text ml-0.5">×</button>
      </div>
    </div>
  );
}

// ─── Demo sections injected into Home tab ─────────────────────────────────────
export interface DemoSectionProps {
  isListening: boolean;
  activeScenarioName?: string;
  persona: string;
  personas: { key: string; name: string; lang: string }[];
  onPersonaChange: (k: string) => void;
  scenarios: { id: string; humanTitle: string; roomName: string; humanTier: string }[];
  filteredScenarioIds: string[];
  onScenarioRun: (id: string) => void;
  running: string | null;
}

function DemoSections({ isListening, activeScenarioName, persona, personas, onPersonaChange, scenarios, filteredScenarioIds, onScenarioRun, running }: DemoSectionProps) {
  const visible = scenarios.filter(s => filteredScenarioIds.includes(s.id));
  const currentPersona = personas.find(p => p.key === persona);

  return (
    <>
      <div className="h-px bg-alexa-border mx-3 mb-3 shrink-0" />

      {/* Waveform */}
      <div className="px-3 mb-3 shrink-0">
        <p className="text-[10px] font-semibold text-alexa-muted uppercase tracking-wider mb-2 px-1">
          {activeScenarioName ? `Hearing · ${activeScenarioName}` : 'Listening quietly...'}
        </p>
        <div className="bg-[#060A04] border border-alexa-border rounded-lg px-2 py-2">
          <LiveWaveform isListening={isListening} barCount={24} />
        </div>
      </div>

      {/* Who's home */}
      <div className="px-3 mb-3 shrink-0">
        <p className="text-[10px] font-semibold text-alexa-muted uppercase tracking-wider mb-2 px-1">Who's home right now?</p>
        <div className="flex gap-2">
          {personas.map(p => (
            <button
              key={p.key}
              onClick={() => onPersonaChange(p.key)}
              className={`flex-1 py-2 px-1 rounded-xl border text-center transition-all ${
                persona === p.key
                  ? 'bg-alexa-accent border-alexa-blue'
                  : 'bg-alexa-card border-alexa-border'
              }`}
            >
              <p className={`text-[10px] font-semibold ${persona === p.key ? 'text-alexa-ring' : 'text-alexa-text'}`}>{p.name}</p>
              <p className="text-[9px] text-alexa-muted">{p.lang}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Moments for X */}
      <div className="px-3 mb-3 shrink-0">
        <p className="text-[10px] font-semibold text-alexa-muted uppercase tracking-wider mb-2 px-1">
          Moments for {currentPersona?.name ?? 'this home'} →
        </p>
        <div className="flex flex-col gap-1.5">
          {visible.map(sc => (
            <button
              key={sc.id}
              onClick={() => onScenarioRun(sc.id)}
              disabled={!!running}
              className={`px-3 py-2 rounded-xl border text-left transition-all ${
                running === sc.id
                  ? 'bg-alexa-accent border-alexa-blue'
                  : 'bg-alexa-card border-alexa-border hover:border-alexa-blue'
              } ${running && running !== sc.id ? 'opacity-50' : ''}`}
            >
              <p className="text-xs font-medium text-alexa-text">{sc.humanTitle}</p>
              <p className="text-[10px] text-alexa-muted mt-0.5">{sc.roomName} · {sc.humanTier}</p>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Home Tab ─────────────────────────────────────────────────────────────────
function HomeTab({ onVoiceSubmit, onRingClick, demoSections }: { onVoiceSubmit: (t: string) => void; onRingClick?: () => void; demoSections?: DemoSectionProps }) {
  const { ui, rooms, setActiveRoom } = useAppStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 shrink-0">
        <p className="text-base font-bold text-alexa-text">{greeting} 👋</p>
        <p className="text-xs text-alexa-muted">Smart Home Digital Twin</p>
      </div>

      <AlexaRing onVoiceSubmit={onVoiceSubmit} onRingClick={onRingClick} />

      {demoSections && <DemoSections {...demoSections} />}

      <SceneRow />

      <div className="h-px bg-alexa-border mx-3 mb-3 shrink-0" />

      <EnergySummary />

      <div className="px-3 mb-2 shrink-0">
        <p className="text-xs font-semibold text-alexa-muted uppercase tracking-wider mb-2 px-1">Rooms</p>
        <div className="grid grid-cols-2 gap-2">
          {rooms.map((room) => {
            const isActive = ui.activeRoomId === room.id;
            return (
              <button
                key={room.id}
                onClick={() => setActiveRoom(isActive ? null : room.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all card-hover ${
                  isActive
                    ? 'bg-alexa-accent border border-alexa-blue'
                    : 'bg-alexa-card border border-alexa-border'
                }`}
              >
                <span className="text-base">{room.icon}</span>
                <span className={`text-xs font-medium truncate ${isActive ? 'text-alexa-ring' : 'text-alexa-text'}`}>
                  {room.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-alexa-border mx-3 mb-3 shrink-0" />

      <NotificationFeed />
      <div className="h-3 shrink-0" />
    </div>
  );
}

// ─── Device Type Filter Pills ─────────────────────────────────────────────────
type DeviceFilter = 'All' | 'Lights' | 'Speakers' | 'Security' | 'Climate' | 'Other';

function DeviceFilters({ active, onChange }: { active: DeviceFilter; onChange: (f: DeviceFilter) => void }) {
  const filters: DeviceFilter[] = ['All', 'Lights', 'Speakers', 'Security', 'Climate', 'Other'];
  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 shrink-0">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
            active === f
              ? 'bg-alexa-blue text-alexa-dark font-semibold'
              : 'bg-alexa-card text-alexa-muted border border-alexa-border hover:border-alexa-blue hover:text-alexa-text'
          }`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}

function filterDevice(obj: PlacedObject, filter: DeviceFilter): boolean {
  if (filter === 'All') return true;
  const t = obj.type;
  if (filter === 'Lights') return t === 'smart-bulb' || t === 'smart-plug';
  if (filter === 'Speakers') return t === 'echo-dot' || t === 'echo-show' || t === 'smart-tv';
  if (filter === 'Security') return t === 'camera' || t === 'smart-lock' || t === 'motion-sensor' || t === 'smoke-detector' || t === 'doorbell';
  if (filter === 'Climate') return t === 'thermostat' || t === 'ceiling-fan' || t === 'air-purifier';
  return true;
}

// ─── Device Card ──────────────────────────────────────────────────────────────
function DeviceCard({ device }: { device: PlacedObject }) {
  const { toggleAlexaDevice, updateAlexaState, setSelectedObject } = useAppStore();
  const def = ASSET_MAP.get(device.type);
  const ds = device.alexaDeviceState;
  const isOn = ds.isOn;

  return (
    <div
      className={`rounded-xl border transition-all panel-slide-in ${
        isOn ? 'bg-alexa-card border-alexa-blue border-opacity-40' : 'bg-alexa-card border-alexa-border'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => setSelectedObject(device.id)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 transition-all ${
            isOn ? 'bg-alexa-accent' : 'bg-[#1E1E1E]'
          }`}
        >
          {def?.emoji ?? '📦'}
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-alexa-text truncate leading-tight">{device.deviceName}</p>
          <DeviceSubtext device={device} />
        </div>

        <button
          onClick={() => toggleAlexaDevice(device.id)}
          className={`shrink-0 relative w-11 h-6 rounded-full transition-colors toggle-track ${
            isOn ? 'bg-alexa-blue' : 'bg-[#383838]'
          }`}
          aria-label={isOn ? 'Turn off' : 'Turn on'}
        >
          <span
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all toggle-thumb ${
              isOn ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      {isOn && ds.brightness !== undefined && (
        <div className="px-3 pb-3 -mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-alexa-muted w-14">Brightness</span>
            <input
              type="range" min={0} max={100} value={ds.brightness}
              onChange={(e) => updateAlexaState(device.id, { brightness: Number(e.target.value) })}
              className="flex-1 h-1 accent-alexa-blue"
            />
            <span className="text-[10px] text-alexa-blue w-8 text-right">{ds.brightness}%</span>
          </div>
        </div>
      )}
      {isOn && ds.volume !== undefined && (
        <div className="px-3 pb-3 -mt-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-alexa-muted w-14">Volume</span>
            <input
              type="range" min={0} max={100} value={ds.volume}
              onChange={(e) => updateAlexaState(device.id, { volume: Number(e.target.value) })}
              className="flex-1 h-1 accent-alexa-blue"
            />
            <span className="text-[10px] text-alexa-blue w-8 text-right">{ds.volume}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DeviceSubtext({ device }: { device: PlacedObject }) {
  const ds = device.alexaDeviceState;
  const parts: string[] = [];
  if (!ds.isOn) return <p className="text-xs text-alexa-muted">Off</p>;
  if (ds.temperature !== undefined) parts.push(`${ds.temperature.toFixed(1)}°C`);
  if (ds.humidity !== undefined) parts.push(`${ds.humidity.toFixed(0)}%`);
  if (ds.brightness !== undefined) parts.push(`${ds.brightness}% bright`);
  if (ds.volume !== undefined) parts.push(`Vol ${ds.volume}`);
  if (ds.motionDetected) parts.push('Motion!');
  if (ds.isLocked !== undefined) parts.push(ds.isLocked ? 'Locked' : 'Unlocked');
  if (ds.batteryLevel !== undefined) parts.push(`🔋${ds.batteryLevel.toFixed(0)}%`);
  if (ds.airQuality !== undefined) parts.push(`AQI ${ds.airQuality.toFixed(0)}`);
  if (ds.speed !== undefined) parts.push(`Speed ${ds.speed}`);
  if (ds.powerConsumption !== undefined) parts.push(`${ds.powerConsumption.toFixed(0)}W`);

  return (
    <p className="text-xs text-alexa-blue truncate leading-tight">
      {parts.length ? parts.join(' · ') : 'On'}
    </p>
  );
}

// ─── Devices Tab ─────────────────────────────────────────────────────────────
function DevicesTab() {
  const { placedObjects, rooms, ui, setActiveRoom } = useAppStore();
  const [filter, setFilter] = useState<DeviceFilter>('All');

  const activeRoom = rooms.find((r) => r.id === ui.activeRoomId);

  const devices = placedObjects.filter(
    (o) =>
      o.isAlexaDevice &&
      filterDevice(o, filter) &&
      (ui.activeRoomId ? o.parentRoomId === ui.activeRoomId : true)
  );

  const byRoom: Record<string, PlacedObject[]> = {};
  const unassigned: PlacedObject[] = [];
  for (const d of devices) {
    if (d.parentRoomId) {
      (byRoom[d.parentRoomId] ??= []).push(d);
    } else {
      unassigned.push(d);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 pt-3 pb-1 shrink-0">
        <button
          onClick={() => setActiveRoom(null)}
          className={`text-xs px-2 py-1 rounded-full transition-colors ${
            !ui.activeRoomId ? 'bg-alexa-blue text-alexa-dark font-semibold' : 'text-alexa-muted hover:text-alexa-text'
          }`}
        >
          All rooms
        </button>
        {rooms.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRoom(ui.activeRoomId === r.id ? null : r.id)}
            className={`text-xs px-2 py-1 rounded-full whitespace-nowrap transition-colors ${
              ui.activeRoomId === r.id
                ? 'bg-alexa-blue text-alexa-dark font-semibold'
                : 'text-alexa-muted hover:text-alexa-text'
            }`}
          >
            {r.icon} {r.name}
          </button>
        ))}
      </div>

      <DeviceFilters active={filter} onChange={setFilter} />

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        {devices.length === 0 ? (
          <EmptyDevices isRoomView={!!ui.activeRoomId} roomName={activeRoom?.name} />
        ) : ui.activeRoomId ? (
          <div className="flex flex-col gap-2">
            {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
          </div>
        ) : (
          <>
            {Object.entries(byRoom).map(([roomId, devs]) => {
              const room = rooms.find((r) => r.id === roomId);
              return (
                <RoomSection key={roomId} name={room?.name ?? roomId} icon={room?.icon ?? '🏠'} devices={devs} />
              );
            })}
            {unassigned.length > 0 && (
              <RoomSection name="Unassigned" icon="📦" devices={unassigned} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomSection({ name, icon, devices }: { name: string; icon: string; devices: PlacedObject[] }) {
  const [open, setOpen] = useState(true);
  const on = devices.filter((d) => d.alexaDeviceState.isOn).length;
  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full mb-2 text-left"
      >
        <span className="text-base">{icon}</span>
        <span className="text-xs font-semibold text-alexa-text flex-1">{name}</span>
        <span className="text-[10px] text-alexa-muted">{on}/{devices.length} on</span>
        <span className={`text-alexa-muted text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2">
          {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
        </div>
      )}
    </div>
  );
}

function EmptyDevices({ isRoomView, roomName }: { isRoomView: boolean; roomName?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <div className="w-12 h-12 rounded-full bg-alexa-card flex items-center justify-center mb-3">
        <span className="text-2xl">🔵</span>
      </div>
      <p className="text-sm text-alexa-muted">
        {isRoomView
          ? `No devices in ${roomName ?? 'this room'} yet.`
          : 'No devices placed. Use the Library tab to add them.'}
      </p>
    </div>
  );
}

// ─── Routines Tab ─────────────────────────────────────────────────────────────
function RoutinesTab() {
  const { routines, toggleRoutine, triggerScene, scenes } = useAppStore();
  const enabled = routines.filter((r) => r.isEnabled);

  return (
    <div className="flex flex-col h-full overflow-y-auto px-3 py-3">
      <p className="text-xs font-semibold text-alexa-muted uppercase tracking-wider mb-2">Run a Scene</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {scenes.map((s) => (
          <button
            key={s.id}
            onClick={() => triggerScene(s.id)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-alexa-card border border-alexa-border hover:bg-alexa-card2 transition-all active:scale-95"
          >
            <span className="text-lg">{s.emoji}</span>
            <div className="text-left min-w-0">
              <p className="text-xs font-semibold text-alexa-text truncate">{s.name}</p>
              <p className="text-[10px] text-alexa-muted truncate">{s.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="h-px bg-alexa-border mb-3" />

      <p className="text-xs font-semibold text-alexa-muted uppercase tracking-wider mb-2">
        Your Routines <span className="text-alexa-green ml-1">{enabled.length} active</span>
      </p>
      <div className="flex flex-col gap-2 mb-4">
        {routines.map((r) => <RoutineCard key={r.id} routine={r} onToggle={() => toggleRoutine(r.id)} />)}
      </div>

      <div className="px-3 py-3 rounded-xl bg-alexa-card border border-dashed border-alexa-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-alexa-accent flex items-center justify-center text-lg">+</div>
        <div>
          <p className="text-xs font-semibold text-alexa-text">Create a Routine</p>
          <p className="text-[10px] text-alexa-muted">Automate your smart home</p>
        </div>
      </div>
    </div>
  );
}

function RoutineCard({ routine, onToggle }: { routine: import('../../types').Routine; onToggle: () => void }) {
  const lastRunLabel = routine.lastRun
    ? `Last run ${Math.round((Date.now() - routine.lastRun) / 3600000)}h ago`
    : 'Never run';

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-alexa-card border border-alexa-border">
      <div className="w-9 h-9 rounded-full bg-alexa-accent flex items-center justify-center text-lg shrink-0">
        {routine.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-alexa-text truncate">{routine.name}</p>
        <p className="text-[10px] text-alexa-muted truncate">{routine.triggerLabel}</p>
        <p className="text-[10px] text-alexa-muted">{lastRunLabel}</p>
      </div>
      <button
        onClick={onToggle}
        className={`shrink-0 relative w-11 h-6 rounded-full transition-colors toggle-track ${
          routine.isEnabled ? 'bg-alexa-blue' : 'bg-[#383838]'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all toggle-thumb ${
            routine.isEnabled ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
function BottomTabBar({
  active,
  onChange,
}: {
  active: import('../../types').AlexaTab;
  onChange: (t: import('../../types').AlexaTab) => void;
}) {
  const tabs = [
    { id: 'home' as const, label: 'Home', icon: HomeIcon },
    { id: 'devices' as const, label: 'Devices', icon: DevicesIcon },
    { id: 'routines' as const, label: 'Routines', icon: RoutinesIcon },
  ];

  return (
    <div className="flex bg-alexa-surface border-t border-alexa-border shrink-0">
      {tabs.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`relative flex-1 flex flex-col items-center gap-1 py-2 transition-colors ${
              isActive ? 'text-alexa-blue' : 'text-alexa-muted hover:text-alexa-text'
            }`}
          >
            <Icon active={isActive} />
            <span className="text-[10px] font-medium">{t.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-alexa-blue rounded-t-sm" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function DevicesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function RoutinesIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function AlexaAppSimView({ onRingClick, demoSections }: { onRingClick?: () => void; demoSections?: DemoSectionProps } = {}) {
  const { ui, setAlexaTab } = useAppStore();
  return (
    <div className="flex flex-col h-full bg-alexa-dark">
      <StatusBar />

      <div className="flex items-center justify-between px-4 py-2 bg-alexa-dark shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full alexa-ring flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-alexa-dark flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-alexa-ring" />
            </div>
          </div>
          <span className="text-sm font-bold text-alexa-text tracking-wide">amazon alexa</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-alexa-muted hover:text-alexa-text transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </button>
          <button className="text-alexa-muted hover:text-alexa-text transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {ui.alexaTab === 'home' && <HomeTab onVoiceSubmit={() => {}} onRingClick={onRingClick} demoSections={demoSections} />}
        {ui.alexaTab === 'devices' && <DevicesTab />}
        {ui.alexaTab === 'routines' && <RoutinesTab />}
      </div>

      <BottomTabBar active={ui.alexaTab} onChange={setAlexaTab} />
    </div>
  );
}
