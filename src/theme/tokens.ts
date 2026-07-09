// TypeScript-importable mirror of tokens.css — for R3F/shader code that needs
// literal hex values (not CSS vars). Keep byte-identical to tokens.css;
// values must be kept in sync manually (no codegen).

export const colors = {
  void: {
    950: '#050505',
    900: '#0A0A0A',
    800: '#121110',
    700: '#1A1816',
    600: '#241F1B',
    border: '#2E2822',
  },
  copper: {
    100: '#F0DAC9',
    300: '#D9A98A',
    500: '#C08662',
    600: '#A96F50',
    700: '#8A5940',
  },
  ember: {
    300: '#E8B368',
    500: '#D99A44',
    600: '#B87F35',
  },
  text: {
    primary: '#F2EDE6',
    secondary: '#B8AFA4',
    tertiary: '#7A7168',
  },
} as const;

export const fonts = {
  display: "'Bricolage Grotesque', system-ui, sans-serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '22px',
  xl: '32px',
  full: '999px',
} as const;

export const glass = {
  bg: 'rgba(18, 17, 16, 0.55)',
  border: 'rgba(192, 134, 98, 0.25)',
  blur: 'blur(24px) saturate(140%)',
  shadowCopperMd: '0 8px 32px -8px rgba(192, 134, 98, 0.28), 0 2px 8px rgba(0, 0, 0, 0.35)',
  shadowEmberGlow: '0 0 24px rgba(217, 154, 68, 0.35), 0 0 48px rgba(217, 154, 68, 0.15)',
  inset: 'inset 0 1px 0 rgba(242, 237, 230, 0.06)',
} as const;
