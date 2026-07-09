import React from 'react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  glow?: 'none' | 'ember';
}

/**
 * Static liquid-glass surface primitive.
 * Uses --glass-bg, --glass-border, --glass-blur, --r-lg, and shadow tokens.
 *
 * @param children - Content to render inside
 * @param className - Additional Tailwind/CSS classes to apply
 * @param padding - Padding size: 'sm' (--space-4/16px), 'md' (--space-6/24px), 'lg' (--space-8/32px)
 * @param glow - Shadow style: 'none' (--shadow-copper-md) or 'ember' (--shadow-ember-glow)
 */
export function GlassCard({
  children,
  className = '',
  padding = 'md',
  glow = 'none',
}: GlassCardProps) {
  const paddingMap = {
    sm: 'var(--space-4)',  // 16px
    md: 'var(--space-6)',  // 24px
    lg: 'var(--space-8)',  // 32px
  };

  const shadowStyle =
    glow === 'ember'
      ? 'var(--shadow-ember-glow)'
      : 'var(--shadow-copper-md)';

  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderRadius: 'var(--r-lg)',
        padding: paddingMap[padding],
        boxShadow: `${shadowStyle}, var(--glass-inset)`,
      }}
    >
      {children}
    </div>
  );
}
