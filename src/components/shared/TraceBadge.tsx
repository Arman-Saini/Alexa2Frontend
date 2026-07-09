/**
 * Actor metadata for step diagrams.
 * Maps actor types to display label and accent color.
 */
export const ACTOR_META: Record<
  string,
  { label: string; color: string }
> = {
  user: { label: 'You', color: 'var(--copper-500)' },
  alexa: { label: 'HomeSense', color: 'var(--ember-500)' },
  device: { label: 'Device', color: 'var(--text-secondary)' },
  cloud: { label: 'Cloud', color: 'var(--void-600)' }, // Muted blue-gray tone in void palette
  app: { label: 'App', color: 'var(--text-secondary)' },
};

export interface TraceBadgeProps {
  tierLabel: string;
  latencyMs: number;
  costUsd: number;
}

/**
 * Small pill showing plain-language latency/cost readout.
 * Explicitly secondary/compact element per design direction.
 *
 * @param tierLabel - Plain-language tier label (e.g., 'Instant reflex', 'Thinks locally', etc.)
 * @param latencyMs - Latency in milliseconds
 * @param costUsd - Cost in USD (will be formatted to 2 decimal places)
 */
export function TraceBadge({
  tierLabel,
  latencyMs,
  costUsd,
}: TraceBadgeProps) {
  const formattedCost = `$${costUsd.toFixed(2)}`;
  const formattedLatency = `${latencyMs}ms`;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-2'))}px ${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-3'))}px`,
        borderRadius: 'var(--r-full)',
        backgroundColor: 'rgba(36, 31, 27, 0.6)', // Subtle void background
        border: '1px solid var(--copper-500)',
        fontFamily: 'var(--font-display)',
        fontSize: '12px',
        lineHeight: 1.4,
      }}
    >
      {/* Accent dot */}
      <div
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--copper-500)',
          flexShrink: 0,
        }}
      />

      {/* Tier label */}
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
        {tierLabel}
      </span>

      {/* Separator */}
      <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>•</span>

      {/* Latency and cost in monospace */}
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        {formattedLatency} • {formattedCost}
      </span>
    </div>
  );
}

export interface ActorLaneProps {
  actor: string;
}

/**
 * Maps scenario-plan step actor field to icon + label + accent color.
 * Used in step-diagram lists.
 *
 * @param actor - Actor type ('user'|'alexa'|'device'|'cloud'|'app' or any string key in ACTOR_META)
 */
export function ActorLane({ actor }: ActorLaneProps) {
  const meta = ACTOR_META[actor] ?? {
    label: actor.charAt(0).toUpperCase() + actor.slice(1),
    color: 'var(--text-tertiary)',
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: `${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-1'))}px ${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--space-3'))}px`,
        borderRadius: 'var(--r-md)',
        backgroundColor: `${meta.color}15`, // 9% opacity tint of the color
        border: `1px solid ${meta.color}40`, // 25% opacity border
      }}
    >
      {/* Colored dot indicator */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: meta.color,
          flexShrink: 0,
        }}
      />

      {/* Actor label */}
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 500,
          color: meta.color,
          textTransform: 'capitalize',
        }}
      >
        {meta.label}
      </span>
    </div>
  );
}
