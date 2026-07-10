import { useEffect, useState } from 'react';

const BREAKPOINT_PX = 768; // matches this codebase's existing Tailwind `md` cutoff

export function computeIsMobile(width: number): boolean {
  return width < BREAKPOINT_PX;
}

/**
 * True on real phone-width viewports. Checked once via matchMedia and kept
 * in sync on resize — real phones don't get resized mid-session, this isn't
 * meant to redecide the whole layout on every desktop window drag.
 */
export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === 'undefined' ? false : computeIsMobile(window.innerWidth)
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${BREAKPOINT_PX - 1}px)`);
    const onChange = () => setIsMobile(computeIsMobile(window.innerWidth));
    mql.addEventListener('change', onChange);
    onChange();
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isMobile;
}
