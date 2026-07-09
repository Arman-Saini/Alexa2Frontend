import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useMic } from '../../hooks/useMic';

export interface VoiceEntryProps {
  onSubmit?: (text: string) => void;
}

/**
 * "Ask HomeSense..." input/mic affordance — primary entry point for voice commands.
 * Combines typed input with Web Speech API for voice capture.
 * Shows subtle "listening" state with pulsing glow ring.
 *
 * @param onSubmit - Called with transcript or typed text on submit/Enter
 */
export function VoiceEntry({ onSubmit }: VoiceEntryProps) {
  const [typedInput, setTypedInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFinalTranscript = (text: string) => {
    setTypedInput(text);
    onSubmit?.(text);
  };

  const { listening, liveText, error, toggle } =
    useMic(handleFinalTranscript);

  // Merge live transcript with typed input for display
  const displayText = listening ? liveText : typedInput;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && typedInput.trim()) {
      e.preventDefault();
      onSubmit?.(typedInput);
      setTypedInput('');
    }
  };

  const handleMicClick = () => {
    toggle();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTypedInput(e.currentTarget.value);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Listening state pulsing glow ring */}
      {listening && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0.6 }}
          animate={{ scale: 1.1, opacity: 0 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: 'var(--r-full)',
            border: '2px solid var(--ember-500)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Main input container */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-2'))}px ${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-4'))}px`,
          borderRadius: 'var(--r-full)',
          backgroundColor: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          boxShadow: 'var(--shadow-copper-md)',
          transition: 'all 0.2s ease',
          outline: 'none',
          ...(listening && {
            borderColor: 'var(--ember-500)',
            boxShadow:
              'var(--shadow-copper-md), 0 0 16px rgba(217, 154, 68, 0.2)',
          }),
          ...(error && {
            borderColor: 'rgba(217, 154, 68, 0.5)',
          }),
        }}
      >
        {/* Text input field */}
        <input
          ref={inputRef}
          type="text"
          value={displayText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask HomeSense..."
          disabled={listening}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: 'var(--text-primary)',
            caretColor: 'var(--copper-500)',
            '::placeholder': {
              color: 'var(--text-tertiary)',
            },
          } as any}
        />

        {/* Mic button */}
        <button
          onClick={handleMicClick}
          aria-label={listening ? 'Stop listening' : 'Start listening'}
          type="button"
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            borderRadius: 'var(--r-full)',
            backgroundColor: listening
              ? 'rgba(217, 154, 68, 0.15)'
              : 'rgba(192, 134, 98, 0.1)',
            border: `1px solid ${listening ? 'var(--ember-500)' : 'var(--copper-500)'}`,
            color: listening ? 'var(--ember-500)' : 'var(--copper-500)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            lineHeight: 1,
            transition: 'all 0.2s ease',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = listening
              ? 'rgba(217, 154, 68, 0.25)'
              : 'rgba(192, 134, 98, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = listening
              ? 'rgba(217, 154, 68, 0.15)'
              : 'rgba(192, 134, 98, 0.1)';
          }}
        >
          {listening ? '◼' : '🎤'}
        </button>
      </div>

      {/* Error message (if any) */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 'var(--space-2)',
            padding: `var(--space-2) var(--space-3)`,
            borderRadius: 'var(--r-md)',
            backgroundColor: 'rgba(217, 154, 68, 0.1)',
            border: '1px solid var(--ember-500)',
            color: 'var(--ember-300)',
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
            maxWidth: '280px',
            whiteSpace: 'normal',
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
