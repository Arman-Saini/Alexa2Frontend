import { describe, it, expect } from 'vitest';
import { computeIsMobile } from '../hooks/useIsMobileViewport';

describe('computeIsMobile', () => {
  it('is true under the 768px breakpoint', () => {
    expect(computeIsMobile(767)).toBe(true);
    expect(computeIsMobile(320)).toBe(true);
  });

  it('is false at or above the 768px breakpoint', () => {
    expect(computeIsMobile(768)).toBe(false);
    expect(computeIsMobile(1440)).toBe(false);
  });
});
