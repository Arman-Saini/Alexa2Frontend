import React, { useRef } from 'react';
import { motion } from 'framer-motion';

export interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'none';
}

/**
 * Generic wrapper for scroll-triggered content reveals (animejs.com-style).
 * Animates in when element enters viewport.
 *
 * @param children - Content to reveal
 * @param className - Additional Tailwind/CSS classes
 * @param delay - Animation delay in seconds (default: 0)
 * @param direction - 'up' (translateY + opacity) or 'none' (opacity only), default 'up'
 */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  );

  if (prefersReducedMotion.current) {
    // Return children without animation if reduced motion is preferred
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{
        opacity: 0,
        y: direction === 'up' ? 24 : 0,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: '-80px',
      }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier: confident, slightly-decelerated
      }}
    >
      {children}
    </motion.div>
  );
}
