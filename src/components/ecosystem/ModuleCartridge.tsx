import { GlassCard } from '../shared/GlassCard';

/**
 * Unified shape both real (AppStoreModule) and mock/concept integrations
 * are normalized into before rendering — see ModuleRing.tsx.
 */
export interface EcosystemModule {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'live' | 'concept';
  author?: string;
  tags?: string[];
}

export interface ModuleCartridgeProps {
  module: EcosystemModule;
  onClick?: () => void;
}

// Deterministic accent color per category, cycling through the existing
// copper/ember/text token palette — no hardcoded hex outside tokens.
const ACCENT_CYCLE = [
  'var(--copper-500)',
  'var(--ember-500)',
  'var(--copper-300)',
  'var(--ember-300)',
  'var(--copper-700)',
  'var(--text-secondary)',
];

function accentFor(category: string): string {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return ACCENT_CYCLE[hash % ACCENT_CYCLE.length];
}

function formatCategory(category: string): string {
  return category
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ModuleCartridge({ module, onClick }: ModuleCartridgeProps) {
  const isLive = module.status === 'live';
  const accent = accentFor(module.category);

  return (
    <GlassCard
      padding="md"
      glow={isLive ? 'ember' : 'none'}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          minHeight: '100%',
          opacity: isLive ? 1 : 0.72,
          filter: isLive ? 'none' : 'grayscale(0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
          <div
            aria-hidden
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--r-md)',
              flexShrink: 0,
              backgroundColor: `${accent}22`,
              border: `1px solid ${accent}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--font-display)',
              fontSize: '15px',
              color: accent,
            }}
          >
            {module.name.charAt(0).toUpperCase()}
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-1)',
              padding: '3px 10px',
              borderRadius: 'var(--r-full)',
              fontFamily: 'var(--font-body)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isLive ? 'var(--void-950)' : 'var(--text-tertiary)',
              backgroundColor: isLive ? 'var(--ember-500)' : 'transparent',
              border: isLive ? 'none' : '1px solid var(--void-border)',
            }}
          >
            {isLive ? 'Live' : 'Concept'}
          </span>
        </div>

        <div>
          <h3
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '17px',
              color: 'var(--text-primary)',
              marginBottom: '2px',
            }}
          >
            {module.name}
          </h3>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {formatCategory(module.category)}
          </span>
        </div>

        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            flexGrow: 1,
          }}
        >
          {module.description}
        </p>

        {module.author && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--text-tertiary)',
            }}
          >
            {module.author}
          </span>
        )}
      </div>
    </GlassCard>
  );
}
