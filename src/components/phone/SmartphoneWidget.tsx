import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useMic } from '../../hooks/useMic';
import { simulateApi } from '../../api/simulateApi';
import { motion, AnimatePresence } from 'framer-motion';
import { useWebSocket } from '../../hooks/useWebSocket';
import { env } from '../../config/env';
import { fallbackSpeak } from '../../hooks/useTTS';


export interface ChatSummary {
  id: string;
  timestamp: string;
  utterance: string;
  response: string;
  status: 'success' | 'warning' | 'info';
  latency: number;
  cost: number;
}

export const DEFAULT_SUMMARIES: ChatSummary[] = [
  {
    id: '1',
    timestamp: 'just now',
    utterance: 'Set the living room to movie mode',
    response: 'Movie Night active: dimmed lights, TV on, blinds closed.',
    status: 'success',
    latency: 280,
    cost: 0.0018,
  },
  {
    id: '2',
    timestamp: '15m ago',
    utterance: 'Is the bedroom window open?',
    response: 'All windows in the bedroom are securely closed.',
    status: 'info',
    latency: 120,
    cost: 0.0006,
  },
  {
    id: '3',
    timestamp: '1h ago',
    utterance: 'Turn off idle appliances',
    response: 'Shut down study monitor and kitchen lights. Saved 180W.',
    status: 'success',
    latency: 410,
    cost: 0.0032,
  }
];

interface SkillApp {
  id: string;
  name: string;
  developer: string;
  description: string;
  rating: string;
  installed: boolean;
}

const INITIAL_SKILLS: SkillApp[] = [
  {
    id: 'philips-hue',
    name: 'Philips Hue Smart Lights',
    developer: 'Signify NV',
    description: 'Control your Hue lights, create custom scenes, and synchronize room color outputs via Alexa.',
    rating: '4.8 ★ (18,421 reviews)',
    installed: true,
  },
  {
    id: 'ecobee',
    name: 'Ecobee Smart Thermostat',
    developer: 'Ecobee Inc.',
    description: 'Manage home heating and cooling, check room sensor states, and trigger eco-saving comfort modes.',
    rating: '4.6 ★ (9,114 reviews)',
    installed: false,
  },
  {
    id: 'ring',
    name: 'Ring Security Cameras',
    developer: 'Amazon Alexa',
    description: 'Monitor live feed clips, toggle lock status, and receive alerts when cameras detect motion.',
    rating: '4.7 ★ (31,080 reviews)',
    installed: false,
  },
  {
    id: 'sonos',
    name: 'Sonos Sound System',
    developer: 'Sonos Inc.',
    description: 'Stream music across multi-room speakers, group zones, and adjust treble or base settings hands-free.',
    rating: '4.9 ★ (14,562 reviews)',
    installed: false,
  }
];

interface SmartphoneWidgetProps {
  wallpaperGradient?: string;
  customSummaries?: ChatSummary[];
  onSummariesChange?: (summaries: ChatSummary[]) => void;
  externalCommand?: string;
  onClearExternalCommand?: () => void;
  showExitButton?: boolean;
}

export function SmartphoneWidget({
  wallpaperGradient = 'from-[#0a0a0c] via-[#101016] to-[#050507]',
  customSummaries,
  onSummariesChange,
  externalCommand,
  onClearExternalCommand,
  showExitButton = false,
}: SmartphoneWidgetProps) {
  const [internalSummaries, setInternalSummaries] = useState<ChatSummary[]>(DEFAULT_SUMMARIES);
  const [typedInput, setTypedInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'done'>('idle');
  const [systemTime, setSystemTime] = useState('16:37');
  const [energyNow, setEnergyNow] = useState(297);
  const [activeDevices, setActiveDevices] = useState(17);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'store'>('home');
  const [skills, setSkills] = useState<SkillApp[]>(INITIAL_SKILLS);
  
  const summaries = customSummaries !== undefined ? customSummaries : internalSummaries;
  const setSummaries = (newSummaries: ChatSummary[] | ((prev: ChatSummary[]) => ChatSummary[])) => {
    if (customSummaries !== undefined && onSummariesChange) {
      if (typeof newSummaries === 'function') {
        onSummariesChange(newSummaries(customSummaries));
      } else {
        onSummariesChange(newSummaries);
      }
    } else {
      setInternalSummaries(newSummaries as any);
    }
  };

  const activityEndRef = useRef<HTMLDivElement>(null);

  // Hook up WebSocket
  const { send: wsSend, subscribe: wsSubscribe, isConnected: wsIsConnected } = useWebSocket();

  // Listen to incoming voice events via websocket
  useEffect(() => {
    const unsubscribe = wsSubscribe((msg) => {
      if (msg.type === 'voice_thinking') {
        setStatus('processing');
      } else if (msg.type === 'voice_response') {
        const payload = msg.payload ?? {};
        const spokenText = (payload.spoken_text as string) || '';
        const audioBase64 = payload.audio_base64 as string;
        const audioContentType = (payload.audio_content_type as string) || 'audio/mpeg';
        const isMock = payload.audio_is_mock as boolean;
        const newId = (payload.request_id as string) || Date.now().toString();

        const latency = payload.latency ? Math.round(parseFloat(payload.latency as string)) : 250;
        const cost = payload.cost ? parseFloat((payload.cost as string).replace(/[^0-9.]/g, '')) : 0.0015;

        setSummaries((prev) => {
          if (prev.some((s) => s.id === newId)) {
            return prev.map((s) =>
              s.id === newId
                ? {
                    ...s,
                    response: spokenText,
                    status: 'success',
                    latency,
                    cost,
                  }
                : s
            );
          } else {
            return [
              {
                id: newId,
                timestamp: 'just now',
                utterance: (payload.transcript as string) || 'Voice Command',
                response: spokenText,
                status: 'success',
                latency,
                cost,
              },
              ...prev,
            ];
          }
        });

        setStatus('done');
        setTimeout(() => setStatus('idle'), 1500);

        // Play the TTS response
        if (audioBase64 && !isMock) {
          try {
            const audio = new Audio(`data:${audioContentType};base64,${audioBase64}`);
            audio.play().catch((err) => {
              console.warn('Audio play failed, falling back to browser TTS:', err);
              fallbackSpeak(spokenText, () => {});
            });
          } catch (e) {
            fallbackSpeak(spokenText, () => {});
          }
        } else {
          fallbackSpeak(spokenText, () => {});
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [wsSubscribe]);

  // Sync clock time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Listen to quick command seeding
  useEffect(() => {
    if (externalCommand) {
      setTypedInput(externalCommand);
      void processCommand(externalCommand);
      onClearExternalCommand?.();
    }
  }, [externalCommand]);

  const handleSpeechFinal = (text: string) => {
    setTypedInput(text);
    void processCommand(text);
  };

  const { listening, liveText, toggle } = useMic(handleSpeechFinal);

  useEffect(() => {
    if (listening) {
      setStatus('listening');
    } else if (status === 'listening') {
      setStatus('idle');
    }
  }, [listening]);

  const processCommand = async (utterance: string) => {
    if (!utterance.trim()) return;
    setStatus('processing');

    const newId = Date.now().toString();
    const timestamp = 'just now';

    const pendingSummary: ChatSummary = {
      id: newId,
      timestamp,
      utterance,
      response: 'Analyzing command...',
      status: 'info',
      latency: 0,
      cost: 0,
    };

    setSummaries((prev) => [pendingSummary, ...prev]);

    // Send via WebSocket first
    const wsSent = wsSend({
      type: 'voice_command',
      home_id: env.HOME_ID,
      payload: {
        transcript: utterance,
        speaker_id: 'owner_1',
        request_id: newId,
      },
    });

    if (wsSent) {
      // Clear typed input and wait for WS response
      setTypedInput('');
      return;
    }

    // Fallback if WS not available
    console.warn('WS offline or disabled, triggering REST fallback for:', utterance);
    try {
      const response = await simulateApi.voiceCommand(utterance);
      const data = response.data;

      const latency = data.latency ? Math.round(parseFloat(data.latency)) : Math.floor(Math.random() * 150) + 100;
      const cost = data.cost ? parseFloat(data.cost.replace(/[^0-9.]/g, '')) : 0.0015;
      const explanation = data.result?.explanation || data.result?.reasoning || data.message || 'Action executed successfully.';

      // Fluctuate metrics
      if (utterance.toLowerCase().includes('off') || utterance.toLowerCase().includes('dim')) {
        setEnergyNow((prev) => Math.max(100, prev - 45));
        setActiveDevices((prev) => Math.max(10, prev - 1));
      } else if (utterance.toLowerCase().includes('on') || utterance.toLowerCase().includes('cinema') || utterance.toLowerCase().includes('movie')) {
        setEnergyNow((prev) => Math.min(600, prev + 80));
        setActiveDevices((prev) => Math.min(24, prev + 1));
      }

      setSummaries((prev) =>
        prev.map((s) =>
          s.id === newId
            ? {
                ...s,
                response: explanation,
                status: 'success',
                latency,
                cost,
              }
            : s
        )
      );
      setStatus('done');
      fallbackSpeak(explanation, () => {});
    } catch (err) {
      console.warn('API error. Triggering local backup.', err);
      await new Promise((resolve) => setTimeout(resolve, 1200));

      let mockResponse = "Command processed locally. IoT sweep OK.";
      let mockStatus: 'success' | 'warning' | 'info' = 'success';

      const lowerUtterance = utterance.toLowerCase();
      if (lowerUtterance.includes('light') || lowerUtterance.includes('dim')) {
        mockResponse = "Lights adjusted. Conserved 35W across 3 bulbs.";
        mockStatus = 'success';
        setEnergyNow((prev) => Math.max(100, prev - 35));
        setActiveDevices((prev) => Math.max(10, prev - 1));
      } else if (lowerUtterance.includes('movie') || lowerUtterance.includes('cinema') || lowerUtterance.includes('tv')) {
        mockResponse = "Cinema mode armed: dimmed lights, TV powered on.";
        mockStatus = 'success';
        setEnergyNow((prev) => Math.min(600, prev + 70));
        setActiveDevices((prev) => Math.min(24, prev + 1));
      } else if (lowerUtterance.includes('lock') || lowerUtterance.includes('safe') || lowerUtterance.includes('security')) {
        mockResponse = "Perimeter doors locked. Guard system armed.";
        mockStatus = 'success';
      } else if (lowerUtterance.includes('temperature') || lowerUtterance.includes('heat') || lowerUtterance.includes('ac')) {
        mockResponse = "Thermostat adjusted to 21°C.";
        mockStatus = 'info';
      }

      setSummaries((prev) =>
        prev.map((s) =>
          s.id === newId
            ? {
                ...s,
                response: mockResponse,
                status: mockStatus,
                latency: 140,
                cost: 0.0005,
              }
            : s
        )
      );
      setStatus('done');
      fallbackSpeak(mockResponse, () => {});
    } finally {
      setTypedInput('');
      setTimeout(() => setStatus('idle'), 1200);
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkills((prev) =>
      prev.map((s) => {
        if (s.id === skillId) {
          const nextState = !s.installed;
          
          // Log inside Recent Activity
          const newId = Date.now().toString();
          const logSummary: ChatSummary = {
            id: newId,
            timestamp: 'just now',
            utterance: `${nextState ? 'Enable' : 'Disable'} Skill: ${s.name}`,
            response: `${s.name} ${nextState ? 'successfully integrated into Alexa and authorized' : 'disabled and authorized scopes removed'}.`,
            status: 'info',
            latency: 80,
            cost: 0.0001,
          };
          setSummaries((prevLogs) => [logSummary, ...prevLogs]);

          return { ...s, installed: nextState };
        }
        return s;
      })
    );
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedInput.trim() && status !== 'processing') {
      void processCommand(typedInput);
    }
  };



  return (
    <>
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Collapsed Header Bar connected directly to bottom-left with left-6 offset to align beneath back button */
          <motion.div
            key="minimized-bar"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsMinimized(false)}
            className="fixed bottom-0 left-6 w-[280px] sm:w-[300px] h-[48px] rounded-t-xl rounded-b-none bg-[#0c0c0f]/95 border-t border-x border-white/[0.08] shadow-[0_-8px_32px_rgba(0,0,0,0.5)] flex items-center justify-between px-4 cursor-pointer select-none z-50 hover:border-white/20 transition-all"
          >
            <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase select-none">
              Interact with home
            </span>
            <div className="p-1 rounded bg-white/5 text-white/80 hover:text-white transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
              </svg>
            </div>
          </motion.div>
        ) : (
          /* Maximized State: Header Bar + Smartphone mockup in center */
          <motion.div 
            key="maximized-container"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col items-center w-full h-full md:w-auto md:h-auto"
          >
            {/* Top Bar - "Interact with home" header */}
            <div className="hidden md:flex w-[345px] sm:w-[360px] bg-[#0c0c0f]/90 border border-white/[0.06] rounded-2xl px-4 py-2.5 items-center justify-between mb-3 backdrop-blur-md shadow-md z-40">
              <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase">Interact with home</span>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white transition-all cursor-pointer outline-none"
                title="Minimize App"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                </svg>
              </button>
            </div>

            {/* Smartphone Device Mockup */}
            <div className="relative w-full h-full md:w-[345px] md:sm:w-[360px] md:h-[670px] md:sm:h-[700px] rounded-none md:rounded-[48px] border-0 md:border-[10px] md:border-[#1e1c1b] bg-[#0c0c0e] shadow-none md:shadow-[0_25px_65px_-12px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.03)] flex flex-col overflow-hidden text-white select-none font-sans z-30">
              {/* Screen reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] pointer-events-none z-40 rounded-none md:rounded-[38px] z-10" />

              {/* Wallpaper Gradient background inside the phone */}
              <div className={`absolute inset-0 bg-gradient-to-b ${wallpaperGradient} transition-all duration-700 ease-in-out z-0`} />

              {/* Dynamic Island / Notch */}
              <div className="hidden md:flex absolute top-2.5 left-1/2 -translate-x-1/2 w-[86px] h-[22px] bg-black rounded-full z-50 items-center justify-between px-3.5 shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-void-950/70 border border-void-800" />
                <div className="w-9 h-0.5 bg-void-950 rounded-full opacity-60" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#081324] border border-void-950/40" />
              </div>

              {/* Time & status indicator bar */}
              <div className="hidden md:flex relative z-40 w-full h-[40px] px-6 pt-3.5 items-center justify-between font-sans text-xs text-white/95 font-medium select-none pointer-events-none">
                <span className="tracking-tight text-[11px] font-semibold">{systemTime}</span>
                <div className="flex items-center space-x-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 22h20V2z" />
                  </svg>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M1.5 9.5a15 15 0 0 1 21 0" />
                  </svg>
                  <div className="flex items-center space-x-0.5 border border-white/60 rounded-[4px] px-0.5 py-[2px] w-[21px] h-[11px]">
                    <div className="h-full bg-white rounded-[2.5px]" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>

              {/* App Body Content */}
              <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
                
                {/* Amazon Alexa Header */}
                <div className="px-5 py-3 flex items-center justify-between border-b border-white/[0.03] z-20">
                  <div className="flex items-center space-x-2.5">
                    <svg
                      className="w-5 h-5 text-[#00caff]"
                      viewBox="0 0 512 512"
                      aria-label="Amazon Alexa"
                      role="img"
                      fill="currentColor"
                    >
                      <path d="M256 64a192 192 0 10.001 0M232 445v-37q0-18-18-25a134 134 0 11176-128q1 99-137 179" />
                    </svg>
                    <span className="text-[12px] font-bold font-mono tracking-wider text-white">amazon alexa</span>
                  </div>

                  {showExitButton && (
                    <Link
                      to="/"
                      className="w-7 h-7 rounded-full border border-white/10 bg-white/5 hover:bg-white/15 active:bg-white/25 flex items-center justify-center text-white/60 hover:text-white transition-all outline-none"
                      title="Exit to Dashboard"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Link>
                  )}
                </div>

                {/* <div className="flex items-center space-x-3.5 text-white/80">
                  <button type="button" aria-label="Notifications" className="hover:text-cyan-400 transition-colors">
                    <svg className="w-[17px] h-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                    </svg>
                  </button>
                  <button type="button" aria-label="Profile Settings" className="w-[18px] h-[18px] rounded-full border border-white/20 flex items-center justify-center hover:border-white transition-colors overflow-hidden">
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-[9px] font-bold text-white/95">U</div>
                  </button>
                </div> */}

                {/* Sub-Screen switcher container */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <AnimatePresence mode="wait">
                    {currentScreen === 'home' ? (
                      /* SCREEN 1: Home Dashboard */
                      <motion.div
                        key="screen-home"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scroll-smooth"
                      >
                        {/* Greeting header */}
                        <div>
                          <h2 className="text-xl font-display font-bold leading-tight flex items-center gap-1.5">
                            Good afternoon 👋
                          </h2>
                          <p className="text-[11px] font-mono tracking-wide text-text-secondary mt-0.5">
                            Smart Home Digital Twin
                          </p>
                        </div>

                        {/* Desktop Experience Banner (Only visible on mobile screen) */}
                        <div className="block md:hidden p-3 rounded-xl border border-[#c08662]/20 bg-[#c08662]/5 text-xs text-text-secondary leading-normal">
                          <span className="text-[#c08662] font-mono font-bold uppercase tracking-wider block mb-0.5 text-[10.5px]">🖥️ Desktop Recommended</span>
                          <p className="text-[11px] opacity-85">
                            For the full interactive 3D digital twin canvas experience, please view this dashboard on a desktop or laptop screen.
                          </p>
                        </div>

                        {/* Echo-inspired Alexa Voice Controller */}
                        <div className="p-5 rounded-2xl bg-[#121316] border border-[#232730] shadow-2xl flex flex-col items-center w-full">
                          
                          {/* Echo Bezel */}
                          <div className="relative my-3 flex items-center justify-center w-[96px] h-[96px] rounded-full bg-[#1b1c21] shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_4px_12px_rgba(0,0,0,0.4)] border border-[#2c303b] group">
                            
                            {/* Alexa Light Ring */}
                            <div 
                              className={`absolute inset-1.5 rounded-full border-[3px] transition-all duration-300 ${
                                status === 'listening'
                                  ? 'border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.5),inset_0_0_10px_rgba(0,229,255,0.2)] animate-pulse'
                                  : status === 'processing'
                                  ? 'border-[#008297] border-t-[#00e5ff] border-r-[#00a8e1] animate-spin [animation-duration:1.2s]'
                                  : 'border-[#2d313a] shadow-inner'
                              }`}
                            />

                            {/* Inner Mic Button */}
                            <button
                              type="button"
                              onClick={toggle}
                              disabled={status === 'processing'}
                              className={`relative z-10 w-[72px] h-[72px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 outline-none ${
                                status === 'listening'
                                  ? 'bg-[#0f2430] text-[#00e5ff] scale-95 shadow-[inset_0_1px_3px_rgba(0,229,255,0.2)]'
                                  : status === 'processing'
                                  ? 'bg-[#1b1c21] text-[#00a8e1] cursor-wait'
                                  : 'bg-[#202127] hover:bg-[#282931] text-white/80 active:scale-95 active:bg-[#1a1b20]'
                              }`}
                              title={status === 'listening' ? 'Listening...' : 'Tap to Speak'}
                            >
                              {status === 'processing' ? (
                                <svg className="w-5 h-5 text-[#00e5ff] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" strokeLinecap="round" />
                                </svg>
                              ) : status === 'listening' ? (
                                <svg className="w-6 h-6 text-[#00e5ff] animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                                  <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                              ) : (
                                <svg className="w-6 h-6 text-white/70 hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                                  <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                                  <line x1="12" x2="12" y1="19" y2="22" />
                                </svg>
                              )}
                            </button>
                          </div>

                          {/* Caption */}
                          <div className="flex flex-col items-center mt-2 text-center w-full">
                            <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">
                              {status === 'listening' ? 'Alexa is Listening...' : status === 'processing' ? 'Thinking...' : 'Tap to Speak'}
                            </span>
                            
                            {status === 'listening' && (
                              <p className="text-[11px] text-[#00e5ff] italic px-2 mt-1.5 leading-tight font-mono max-w-[200px] truncate">
                                "{liveText || 'Speak now...'}"
                              </p>
                            )}

                            {/* WebSocket Status Badge */}
                            <div className="flex items-center justify-center gap-1.5 mt-2 bg-[#1b1c21] px-2.5 py-0.5 rounded-full border border-[#2c303b]">
                              <span className={`h-1.5 w-1.5 rounded-full ${wsIsConnected ? 'bg-[#00e5ff] shadow-[0_0_5px_rgba(0,229,255,0.7)] animate-pulse' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.7)]'}`} />
                              <span className="text-[9px] font-mono text-white/60 tracking-wider">
                                {wsIsConnected ? 'Cloud Stream Active' : 'Offline / Sim Mode'}
                              </span>
                            </div>
                          </div>

                          {/* Text input */}
                          <form onSubmit={handleTextSubmit} className="mt-3.5 w-full">
                            <div className="flex items-center gap-2 bg-[#1b1c21] border border-[#2c303b] hover:border-[#3a3f4d] focus-within:border-[#00e5ff]/50 focus-within:shadow-[0_0_10px_rgba(0,229,255,0.1)] rounded-full px-3.5 py-1.5 w-full transition-all">
                              <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                              </svg>
                              <input
                                type="text"
                                value={typedInput}
                                onChange={(e) => setTypedInput(e.target.value)}
                                placeholder="Type a message or command..."
                                disabled={status === 'listening' || status === 'processing'}
                                className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-white/40 font-sans"
                              />
                              {typedInput && (
                                <button
                                  type="submit"
                                  className="w-5 h-5 rounded-full bg-[#00e5ff] text-black flex items-center justify-center hover:bg-[#33ebff] transition-colors"
                                >
                                  <svg className="w-2.5 h-2.5 stroke-black stroke-[3]" viewBox="0 0 24 24" fill="none">
                                    <line x1="22" y1="2" x2="11" y2="13" />
                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </form>
                        </div>

                        {/* SCENES Section */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-white/40 tracking-widest uppercase">Scenes</span>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { 
                                name: 'Good Morning', 
                                icon: (
                                  <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="4" />
                                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                                  </svg>
                                ), 
                                cmd: 'Turn on Good Morning scene' 
                              },
                              { 
                                name: 'Movie Night', 
                                icon: (
                                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
                                    <line x1="7" y1="2" x2="7" y2="22" />
                                    <line x1="17" y1="2" x2="17" y2="22" />
                                    <line x1="2" y1="12" x2="22" y2="12" />
                                    <line x1="2" y1="7" x2="7" y2="7" />
                                    <line x1="2" y1="17" x2="7" y2="17" />
                                    <line x1="17" y1="17" x2="22" y2="17" />
                                    <line x1="17" y1="7" x2="22" y2="7" />
                                  </svg>
                                ), 
                                cmd: 'Set the living room to movie mode' 
                              },
                              { 
                                name: 'Good Night', 
                                icon: (
                                  <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                                  </svg>
                                ), 
                                cmd: 'Set Good Night mode' 
                              },
                              { 
                                name: 'Away Mode', 
                                icon: (
                                  <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                                  </svg>
                                ), 
                                cmd: 'Arm Away mode' 
                              },
                            ].map((scene) => (
                              <button
                                key={scene.name}
                                type="button"
                                onClick={() => processCommand(scene.cmd)}
                                className="flex flex-col items-center justify-center p-2 rounded-xl bg-[#141419]/90 border border-white/[0.04] hover:bg-[#1b1b22]/90 active:scale-95 transition-all text-center gap-1.5"
                              >
                                {scene.icon}
                                <span className="text-[8px] font-medium text-white/70 tracking-wide line-clamp-1 leading-none">{scene.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Energy and Telemetry Info Card */}
                        <div className="grid grid-cols-2 gap-2.5 p-3.5 rounded-xl bg-[#141419]/90 border border-white/[0.04]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Energy Now</span>
                              <span className="text-sm font-semibold tracking-wide">{energyNow}W</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2.5 border-l border-white/[0.05] pl-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                              </svg>
                            </div>
                            <div>
                              <span className="text-[9px] font-mono text-white/40 uppercase tracking-wider block">Devices</span>
                              <span className="text-sm font-semibold tracking-wide text-emerald-400">{activeDevices}<span className="text-white/30 font-normal">/24</span></span>
                            </div>
                          </div>
                        </div>

                        {/* ROOMS Section */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-white/40 tracking-widest uppercase">Rooms</span>
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-white/80">
                            {[
                              { 
                                name: 'Living Room', 
                                icon: (
                                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 18v3M20 18v3M19 9h2a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-2M5 9H3a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h2M18 5H6a2 2 0 0 0-2 2v8h16V7a2 2 0 0 0-2-2Z" />
                                  </svg>
                                ) 
                              },
                              { 
                                name: 'Kitchen', 
                                icon: (
                                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                  </svg>
                                ) 
                              },
                              { 
                                name: 'Master Bedroom', 
                                icon: (
                                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2 4v16M22 4v16M2 8h20M2 14h20M6 14v2M18 14v2" />
                                  </svg>
                                ) 
                              },
                              { 
                                name: 'Bathroom', 
                                icon: (
                                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 4h16v2H4zM12 6v6M8 12h8M6 16c0-2.2 1.8-4 4-4h4c2.2 0 4 1.8 4 4v4H6v-4z" />
                                  </svg>
                                ) 
                              },
                            ].map((room) => (
                              <button
                                key={room.name}
                                type="button"
                                onClick={() => processCommand(`Turn off ${room.name} lights`)}
                                className="flex items-center space-x-3 p-3 rounded-xl bg-[#141419]/90 border border-white/[0.04] hover:bg-[#1b1b22]/90 active:scale-95 transition-all text-left"
                              >
                                {room.icon}
                                <span>{room.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* RECENT ACTIVITY Section */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-mono font-bold text-white/40 tracking-widest uppercase">Recent Activity</span>
                          <div className="space-y-2.5">
                            <AnimatePresence initial={false}>
                              {summaries.map((item) => (
                                <motion.div
                                  key={item.id}
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="p-3 rounded-xl bg-[#141419]/90 border border-white/[0.04] flex items-start gap-2.5 relative overflow-hidden"
                                >
                                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-white/20" />
                                  
                                  <div className="flex-1 min-w-0 pl-1">
                                    <div className="flex items-center justify-between text-[8px] font-mono text-white/40 mb-1">
                                      <span>VOICE COMMAND LOG</span>
                                      <span>{item.timestamp}</span>
                                    </div>
                                    
                                    <p className="text-[11px] font-mono font-bold text-white/90 truncate">
                                      "{item.utterance}"
                                    </p>
                                    
                                    <p className="text-[10.5px] text-[#a0a0a5] mt-1 leading-relaxed">
                                      {item.response === 'Analyzing command...' ? (
                                        <span className="flex items-center gap-1.5 text-white/50 italic">
                                          <span className="animate-spin h-3 w-3 border-2 border-white/40 border-t-transparent rounded-full" />
                                          Analyzing...
                                        </span>
                                      ) : (
                                        item.response
                                      )}
                                    </p>
                                  </div>
                                </motion.div>
                              ))}
                            </AnimatePresence>

                            {summaries.length === 0 && (
                              <div className="p-4 rounded-xl border border-dashed border-white/5 text-center text-[10px] text-white/30">
                                No recent command logs.
                              </div>
                            )}
                            
                            <div ref={activityEndRef} />
                          </div>
                        </div>

                      </motion.div>
                    ) : (
                      /* SCREEN 2: Skills App Store */
                      <motion.div
                        key="screen-store"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth flex flex-col"
                      >
                        {/* Title and description */}
                        <div>
                          <h2 className="text-xl font-display font-bold leading-tight">
                            Skills & Apps
                          </h2>
                          <p className="text-[11px] font-mono tracking-wide text-text-secondary mt-0.5">
                            Expand your home twin capabilities
                          </p>
                        </div>

                        {/* Search Skill Field */}
                        <div className="flex items-center gap-2.5 bg-[#141419]/90 border border-white/[0.05] rounded-xl px-3.5 py-2 w-full text-xs text-white/70 font-sans">
                          <svg className="w-3.5 h-3.5 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input 
                            type="text" 
                            placeholder="Search voice apps & devices..." 
                            className="bg-transparent border-none outline-none flex-1 text-xs text-white placeholder-white/20 font-sans" 
                            disabled 
                          />
                        </div>

                        {/* Skills Grid */}
                        <div className="flex-1 space-y-3">
                          {skills.map((skill) => (
                            <div 
                              key={skill.id} 
                              className="p-3.5 rounded-2xl bg-[#131317]/85 border border-white/[0.05] hover:border-white/[0.1] transition-all flex flex-col gap-2.5 shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  {/* App Icon Circle */}
                                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/70 shrink-0">
                                    {skill.id === 'philips-hue' && (
                                      <svg className="w-5 h-5 text-amber-300/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a3 3 0 00-3-3H6.75a3 3 0 00-3 3V18M12 12.75a3 3 0 013-3h2.25a3 3 0 013 3V18M12 18.75h.008v.008H12v-.008z" />
                                      </svg>
                                    )}
                                    {skill.id === 'ecobee' && (
                                      <svg className="w-5 h-5 text-orange-400/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.245 4.93l2.828 2.828m-11.313 0l2.828-2.828m1.414 1.414a6 6 0 018.486 0M9.172 9.172a4 4 0 015.656 0M9 21h6M12 12v6" />
                                      </svg>
                                    )}
                                    {skill.id === 'ring' && (
                                      <svg className="w-5 h-5 text-cyan-400/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    )}
                                    {skill.id === 'sonos' && (
                                      <svg className="w-5 h-5 text-indigo-400/80" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                      </svg>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-bold text-white/95 leading-tight truncate">{skill.name}</h4>
                                    <span className="text-[9px] font-mono text-white/40 block mt-0.5 uppercase tracking-wider">{skill.developer} • {skill.rating}</span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-[10px] text-white/60 leading-normal font-sans">
                                {skill.description}
                              </p>
                              <div className="flex justify-end mt-1">
                                <button
                                  type="button"
                                  onClick={() => toggleSkill(skill.id)}
                                  className={`px-3 py-1 text-[10px] font-mono font-bold tracking-wider uppercase rounded-lg border transition-all cursor-pointer select-none outline-none ${
                                    skill.installed
                                      ? 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10 hover:border-white/20'
                                      : 'bg-white text-black hover:bg-white/90 border-transparent'
                                  }`}
                                >
                                  {skill.installed ? 'Enabled' : 'Enable to use'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Bottom Navigation Tab bar - Alexa styling (neutral dark glass, clean border) */}
                <div className="px-6 py-2.5 border-t border-white/[0.04] bg-black/45 backdrop-blur-md flex items-center justify-around text-[9px] font-mono font-bold tracking-widest text-white/40 select-none z-20">
                  <button 
                    type="button" 
                    onClick={() => setCurrentScreen('home')}
                    className={`flex flex-col items-center gap-1.5 transition-colors outline-none ${currentScreen === 'home' ? 'text-white' : 'hover:text-white/70'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span>Dashboard</span>
                  </button>
                  
                  <button 
                    type="button" 
                    onClick={() => setCurrentScreen('store')}
                    className={`flex flex-col items-center gap-1.5 transition-colors outline-none ${currentScreen === 'store' ? 'text-white' : 'hover:text-white/70'}`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.5a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                    </svg>
                    <span>Skills Store</span>
                  </button>
                </div>

                {/* Bottom swipe bar placeholder inside screen */}
                <div className="hidden md:flex relative z-40 w-full h-[18px] items-center justify-center pointer-events-none select-none border-t border-white/[0.02] bg-black/45">
                  <div className="w-[110px] h-[4px] bg-white/20 rounded-full mt-1.5" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
