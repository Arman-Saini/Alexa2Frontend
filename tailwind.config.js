/** @type {import('tailwindcss').Config} */
// Colors/fonts below must match src/theme/tokens.css and src/theme/tokens.ts.
// Tailwind config runs under plain Node, so literal hex values are duplicated
// here rather than importing tokens.ts — keep all three in sync manually.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
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
      },
      borderRadius: {
        sm: '8px',
        md: '14px',
        lg: '22px',
        xl: '32px',
        full: '999px',
      },
      boxShadow: {
        'copper-md': '0 8px 32px -8px rgba(192, 134, 98, 0.28), 0 2px 8px rgba(0, 0, 0, 0.35)',
        'ember-glow': '0 0 24px rgba(217, 154, 68, 0.35), 0 0 48px rgba(217, 154, 68, 0.15)',
      },
    },
  },
  plugins: [],
};
