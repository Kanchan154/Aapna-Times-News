import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        indigo: { 50: '#FFF8D6', 100: '#FFEFA3', 200: '#FFE066', 500: '#3A3A3A', 600: '#1F1F1F', 700: '#111111', 800: '#000000', 900: '#000000' },
        marigold: { 100: '#FFF3C4', 400: '#FFD21F', 500: '#FFC400', 600: '#D99F00' },
        signal: { 500: '#E11D2E', 600: '#BE1626' },
        ink: { DEFAULT: '#141414', soft: '#4A4A4A', faint: '#777777' },
        mist: { DEFAULT: '#F5F5F1', line: '#E2E2DA' },
      },
      fontFamily: {
        display: ['Mukta', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        sans: ['Mukta', 'Noto Sans Devanagari', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        ticker: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        pop: { '0%': { opacity: 0, transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { ticker: 'ticker 45s linear infinite', pop: 'pop .18s ease-out' },
    },
  },
  plugins: [typography],
};
