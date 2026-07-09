import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface LensPanelProps {
  open: boolean;
  onClose?: () => void;
  originPoint?: { x: number; y: number };
  variant?: 'brain' | 'scenario' | 'module' | 'phone';
  size?: 'sm' | 'md' | 'lg' | 'full';
  children: React.ReactNode;
}

/**
 * Signature "iris/aperture opening" liquid-glass panel with elastic motion.
 * Animates clipPath from circle(0%) to circle(150%) for organic, elastic expand/collapse.
 *
 * @param open - Controls panel visibility
 * @param onClose - Callback when close button or Escape is pressed
 * @param originPoint - Screen-space percentages {x: 0-100, y: 0-100}, default {x: 50, y: 50}
 * @param variant - Visual variant hook ('brain'|'scenario'|'module'), same animation for all
 * @param size - Max-width/height of inner content: 'sm'|'md'|'lg'|'full'
 * @param children - Panel content
 */
export function LensPanel({
  open,
  onClose,
  originPoint = { x: 50, y: 50 },
  variant = 'scenario',
  size = 'md',
  children,
}: LensPanelProps) {
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const sizeMap = {
    sm: { maxWidth: '320px', maxHeight: '400px' },
    md: { maxWidth: '600px', maxHeight: '600px' },
    lg: { maxWidth: '900px', maxHeight: '800px' },
    full: { maxWidth: '100%', maxHeight: '100vh' },
  };

  const clipPathOpen = `circle(150% at ${originPoint.x}% ${originPoint.y}%)`;
  const clipPathClosed = `circle(0% at ${originPoint.x}% ${originPoint.y}%)`;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              zIndex: 40,
            }}
          />

          {/* Main panel container with clip-path animation */}
          <motion.div
            initial={
              prefersReducedMotion.current
                ? { opacity: 0 }
                : { clipPath: clipPathClosed, opacity: 0 }
            }
            animate={
              prefersReducedMotion.current
                ? { opacity: 1 }
                : { clipPath: clipPathOpen, opacity: 1 }
            }
            exit={
              prefersReducedMotion.current
                ? { opacity: 0 }
                : { clipPath: clipPathClosed, opacity: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 24,
              mass: 0.9,
            }}
            data-variant={variant}
            style={{
              position: 'fixed',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            {/* Content wrapper with scale + opacity animation */}
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 220,
                damping: 24,
                mass: 0.9,
                delay: prefersReducedMotion.current ? 0 : 0.08,
              }}
              style={{
                pointerEvents: 'auto',
                ...sizeMap[size],
              }}
            >
              {/* Glass-styled surface */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'var(--glass-blur)',
                  WebkitBackdropFilter: 'var(--glass-blur)',
                  borderRadius: 'var(--r-lg)',
                  padding: 'var(--space-6)',
                  boxShadow: `var(--shadow-copper-md), var(--glass-inset)`,
                  overflow: 'auto',
                }}
              >
                {/* Close button */}
                <button
                  onClick={onClose}
                  aria-label="Close panel"
                  style={{
                    position: 'absolute',
                    top: 'var(--space-4)',
                    right: 'var(--space-4)',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--r-full)',
                    backgroundColor: 'rgba(192, 134, 98, 0.1)',
                    border: '1px solid var(--copper-500)',
                    color: 'var(--copper-500)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    lineHeight: 1,
                    transition: 'all 0.2s ease',
                    zIndex: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(192, 134, 98, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'rgba(192, 134, 98, 0.1)';
                  }}
                >
                  ✕
                </button>

                {/* Panel content */}
                <div style={{ paddingRight: 'var(--space-8)' }}>
                  {children}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
