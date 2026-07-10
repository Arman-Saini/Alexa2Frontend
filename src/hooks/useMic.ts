import { useState, useCallback, useRef } from 'react';
import { voiceApi } from '../api/voiceApi';
import { env } from '../config/env';

type MicMode = 'idle' | 'listening' | 'processing';

export function useMic(onFinalTranscript: (text: string) => void) {
  const [mode, setMode] = useState<MicMode>('idle');
  const [liveText, setLiveText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const start = useCallback(async () => {
    if (mode !== 'idle') return;
    setError(null);
    setLiveText('Recording...');
    audioChunksRef.current = [];

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone media devices not supported in this browser context.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { mimeType: 'audio/webm' };
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback to default if webm is not supported (e.g. Safari / mobile browser)
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks on the stream to release the mic
        stream.getTracks().forEach(t => t.stop());

        setMode('processing');
        setLiveText('Transcribing...');

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
          const res = await voiceApi.transcribeAudio(audioBlob, false, env.HOME_ID);
          setMode('idle');
          setLiveText('');
          
          if (res && res.transcript) {
            onFinalRef.current(res.transcript);
          } else {
            setError('No speech detected.');
          }
        } catch (err: any) {
          console.error('[useMic] Transcription failed:', err);
          setError(`Transcription failed: ${err.message || err}`);
          alert(`Backend STT error: ${err.message || err}`);
          setMode('idle');
          setLiveText('');
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setMode('listening');
    } catch (e: any) {
      console.error('[useMic] Start failed:', e);
      setError(`Microphone access error: ${e.message || e}`);
      alert(`Microphone access error: ${e.message || e}`);
      setMode('idle');
      setLiveText('');
    }
  }, [mode]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const toggle = useCallback(() => {
    if (mode === 'listening') stop();
    else if (mode === 'idle') start();
  }, [mode, start, stop]);

  return { 
    listening: mode === 'listening', 
    liveText: mode === 'listening' ? 'Listening...' : liveText, 
    error, 
    toggle, 
    stop, 
    start,
    isProcessing: mode === 'processing'
  };
}
