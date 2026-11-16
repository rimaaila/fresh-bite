import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#071428',
          900: '#0B1F3A',
          800: '#122A4D',
          700: '#1B365D',
          500: '#3E5C8A',
          300: '#8DA2C2',
          200: '#D5DCE8',
          100: '#EEF2F8',
        },
        gold: { DEFAULT: '#C9A96E', dark: '#A98A50', light: '#E6D3A8' },
        ivory: '#FAF8F4',
        ink: '#12182B',
        muted: '#5B667C',
        success: '#2F7D5B',
        warning: '#B7791F',
        danger: '#B23A48',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { widest2: '0.22em' },
    },
  },
  plugins: [],
};
export default config;
