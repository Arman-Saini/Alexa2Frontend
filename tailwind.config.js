/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'encode': ['Encode Sans', 'sans-serif'],
        'work': ['Work Sans', 'sans-serif'],
        sans: ['Encode Sans', 'Work Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        alexa: {
          // Salt & Pepper palette
          blue:    '#E8E8E6',   // salt — primary accent
          ring:    '#F0F0EE',   // bright salt
          dark:    '#111111',   // pepper black — app bg
          surface: '#1A1A1A',   // dark pepper
          card:    '#242424',   // card
          card2:   '#333333',   // elevated card
          border:  '#404040',   // border
          text:    '#F0F0EE',   // salt white — primary text
          muted:   '#888888',   // mid gray
          accent:  '#1E1E1E',   // accent bg
          green:   '#5A9A5A',   // muted sage
          orange:  '#A07848',   // muted tan
          red:     '#A03030',   // muted red
          purple:  '#606080',   // muted slate
        },
      },
      animation: {
        'ring-pulse': 'ringPulse 2s ease-in-out infinite',
        'ring-listen': 'ringListen 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        ringPulse: {
          '0%, 100%': { opacity: '0.7', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        ringListen: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(201,168,76,0.5)' },
          '50%': { opacity: '1', transform: 'scale(1.08)', boxShadow: '0 0 0 12px rgba(201,168,76,0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      borderRadius: {
        xl2: '1rem',
        xl3: '1.5rem',
      },
    },
  },
  plugins: [],
};
