import { useEffect, useRef } from 'react';
import { C, F } from './ScenarioDefs';
import type { TierKey, RoomTarget } from './ScenarioDefs';

// Re-export types for convenience
export type { TierKey, RoomTarget };

// ── Room → floating position ──────────────────────────────────────────────────

const ROOM_POSITIONS: Record<string, { top: string; left: string }> = {
  kitchen:  { top: '18%', left: '62%' },
  bathroom: { top: '22%', left: '28%' },
  living:   { top: '48%', left: '52%' },
  pooja:    { top: '30%', left: '72%' },
  all:      { top: '38%', left: '42%' },
};

const DEFAULT_POSITION = { top: '38%', left: '42%' };

// ── Tier human labels ─────────────────────────────────────────────────────────

const TIER_HUMAN: Record<TierKey, { icon: string; text: string }> = {
  T0: { icon: '⚡', text: 'Instant reflex · ran on your device · free' },
  T1: { icon: '🧠', text: 'Recognized from experience · on your device · free' },
  T2: { icon: '💬', text: 'Understood locally · no cloud · free' },
  T3: { icon: '☁️', text: 'Asked the cloud · once · less than a paisa' },
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AlexaMomentCardProps {
  message: string;
  tier: TierKey;
  room: RoomTarget;
  onDismiss: () => void;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  autoDismissMs?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AlexaMomentCard({
  message,
  tier,
  room,
  onDismiss,
  primaryAction,
  secondaryAction,
  autoDismissMs = 12000,
}: AlexaMomentCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss
  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, autoDismissMs);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [message, autoDismissMs, onDismiss]);

  const pos = (room && ROOM_POSITIONS[room]) ?? DEFAULT_POSITION;
  const tierInfo = TIER_HUMAN[tier];
  const hasActions = primaryAction || secondaryAction;

  return (
    <>
      <style>{`
        @keyframes momentCardIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          zIndex: 4000,
          width: 340,
          maxWidth: 'calc(100% - 32px)',
          background: C.surface,
          border: `1px solid ${C.gold}44`,
          borderRadius: 12,
          boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px ${C.goldDim}`,
          padding: '14px 16px',
          animation: 'momentCardIn 0.35s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{
            position: 'absolute',
            top: 10,
            right: 12,
            background: 'none',
            border: 'none',
            color: C.text3,
            fontSize: F.md,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 10,
          fontSize: F.sm,
          color: C.text3,
          paddingRight: 24,
        }}>
          <span style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: C.gold,
            boxShadow: `0 0 6px ${C.gold}`,
            flexShrink: 0,
          }} />
          <span>Alexa</span>
          <span style={{ color: C.goldDim }}>·</span>
          <span>just now</span>
        </div>

        {/* Message */}
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: F.xl,
          color: C.text,
          lineHeight: 1.5,
          marginBottom: 12,
        }}>
          "{message}"
        </div>

        {/* Divider */}
        <div style={{
          borderTop: `1px dashed ${C.border2}`,
          marginBottom: 10,
        }} />

        {/* Tier line */}
        <div style={{
          fontSize: F.tiny,
          color: C.text3,
          marginBottom: hasActions ? 12 : 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}>
          <span>{tierInfo.icon}</span>
          <span>{tierInfo.text}</span>
        </div>

        {/* Action buttons */}
        {hasActions && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {primaryAction && (
              <button
                onClick={() => { primaryAction.onPress(); onDismiss(); }}
                style={{
                  background: C.goldBg,
                  border: `1px solid ${C.goldDim}`,
                  color: C.gold,
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: F.sm,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                }}
              >
                {primaryAction.label}
              </button>
            )}
            {secondaryAction && (
              <button
                onClick={() => { secondaryAction.onPress(); onDismiss(); }}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border2}`,
                  color: C.text2,
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: F.sm,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
