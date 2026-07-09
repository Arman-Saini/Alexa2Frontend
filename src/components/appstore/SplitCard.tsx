import { useEffect, useRef, useState } from 'react';
import { animate, createSpring } from 'animejs';
import type { AppStoreItem } from './moduleGroups';

interface SplitCardProps {
  item: AppStoreItem;
  installed: boolean;
  onInstall: () => void;
  isInstalling: boolean;
}

export function SplitCard({ item, installed, onInstall, isInstalling }: SplitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const shutterTopRef = useRef<HTMLDivElement>(null);
  const shutterBottomRef = useRef<HTMLDivElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shutterTopRef.current || !shutterBottomRef.current || !detailRef.current) return;

    if (expanded) {
      // Split shutters open
      animate(shutterTopRef.current, {
        translateY: '-110%',
        opacity: 0,
        duration: 800,
        ease: createSpring({ stiffness: 80, damping: 15 })
      });
      animate(shutterBottomRef.current, {
        translateY: '110%',
        opacity: 0,
        duration: 800,
        ease: createSpring({ stiffness: 80, damping: 15 })
      });
      // Reveal details
      animate(detailRef.current, {
        opacity: [0, 1],
        scale: [0.96, 1],
        duration: 600,
        ease: 'outBack'
      });
    } else {
      // Close shutters
      animate(shutterTopRef.current, {
        translateY: '0%',
        opacity: 1,
        duration: 600,
        ease: createSpring({ stiffness: 85, damping: 18 })
      });
      animate(shutterBottomRef.current, {
        translateY: '0%',
        opacity: 1,
        duration: 600,
        ease: createSpring({ stiffness: 85, damping: 18 })
      });
      // Hide details
      animate(detailRef.current, {
        opacity: 0,
        scale: 0.96,
        duration: 400,
        ease: 'outQuad'
      });
    }
  }, [expanded]);

  const badgeColor = item.category === 'memory'
    ? 'var(--copper-500)'
    : item.category === 'agentic'
    ? 'var(--ember-500)'
    : 'var(--ember-300)';

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '280px',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        cursor: expanded ? 'default' : 'pointer',
        boxSizing: 'border-box',
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(5, 8, 16, 0.6)',
      }}
      onClick={() => {
        if (!expanded) setExpanded(true);
      }}
    >
      {/* BACKGROUND DETAIL VIEW (REVEALED WHEN SPLIT OPEN) */}
      <div
        ref={detailRef}
        style={{
          position: 'absolute',
          inset: 0,
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          opacity: 0,
          zIndex: 5,
        }}
      >
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {item.name}
              </h3>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>
                by {item.author}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(false);
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: 'var(--r-sm)',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>

          {/* Capabilities */}
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--copper-500)', display: 'block', marginBottom: '4px' }}>
              CAPABILITIES
            </span>
            <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
              {item.capabilities.map((cap, i) => (
                <li key={i}>{cap}</li>
              ))}
            </ul>
          </div>

          {/* Rules */}
          {item.rules && item.rules.length > 0 && (
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--ember-400)', display: 'block', marginBottom: '4px' }}>
                ATTACHED RULES
              </span>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--text-tertiary)', fontSize: '10px', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
                {item.rules.map((rule, i) => (
                  <li key={i}>{rule}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 'var(--space-2)' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--r-sm)',
              fontSize: '9px',
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              backgroundColor: item.status === 'live' ? 'rgba(34,255,136,0.15)' : 'rgba(255,176,32,0.15)',
              color: item.status === 'live' ? '#22ff88' : '#ffb020',
            }}
          >
            {item.status}
          </span>

          {item.category === 'app' && (
            <button
              type="button"
              disabled={installed || isInstalling}
              onClick={(e) => {
                e.stopPropagation();
                onInstall();
              }}
              style={{
                backgroundColor: installed ? 'rgba(255,255,255,0.05)' : 'var(--copper-500)',
                color: installed ? 'var(--text-tertiary)' : 'var(--void-950)',
                border: installed ? '1px solid rgba(255,255,255,0.1)' : 'none',
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '11px',
                padding: '4px 12px',
                borderRadius: 'var(--r-sm)',
                cursor: installed ? 'default' : 'pointer',
              }}
            >
              {isInstalling ? 'Installing...' : installed ? 'Installed' : 'Install'}
            </button>
          )}
        </div>
      </div>

      {/* SHUTTER TOP HALF */}
      <div
        ref={shutterTopRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '50%',
          background: 'linear-gradient(to bottom, rgba(20, 26, 42, 0.95), rgba(15, 20, 32, 0.95))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 'var(--space-3) var(--space-4)',
          boxSizing: 'border-box',
          zIndex: 10,
          transformOrigin: 'top center',
        }}
      >
        <span
          style={{
            alignSelf: 'flex-start',
            padding: '2px 8px',
            borderRadius: 'var(--r-full)',
            fontSize: '9px',
            fontFamily: 'var(--font-mono)',
            textTransform: 'uppercase',
            backgroundColor: badgeColor,
            color: 'var(--void-950)',
            fontWeight: 700,
            marginBottom: 'var(--space-2)',
          }}
        >
          {item.category}
        </span>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {item.name}
        </h3>
      </div>

      {/* SHUTTER BOTTOM HALF */}
      <div
        ref={shutterBottomRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '50%',
          background: 'linear-gradient(to top, rgba(10, 14, 24, 0.95), rgba(15, 20, 32, 0.95))',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          padding: 'var(--space-3) var(--space-4)',
          boxSizing: 'border-box',
          zIndex: 10,
          transformOrigin: 'bottom center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            margin: 0,
            lineHeight: 1.5,
            marginBottom: 'var(--space-2)',
          }}
        >
          {item.description}
        </p>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '9px',
            color: 'var(--text-tertiary)',
          }}
        >
          Click to inspect module details
        </span>
      </div>
    </div>
  );
}
