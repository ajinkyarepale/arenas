import type { Config } from 'tailwindcss';

/**
 * "Terminal Dark" — premium dark-first financial product tokens.
 *
 * Depth comes from layered near-black surfaces + hairline borders, never glow.
 * `ink` is the surface ramp (950 = canvas, 600 = highest interactive tone).
 * Accent is used sparingly: active nav, primary actions, links.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#05070c', // app canvas
          900: '#0a0d14', // card / primary surface
          850: '#0e1219', // raised surface
          800: '#141a24', // interactive / hover surface
          750: '#1a2230', // selected / pressed
          700: '#232d3d', // highest tone (borders of emphasis)
          600: '#314052', // muted fills
        },
        line: {
          DEFAULT: 'rgba(148, 163, 184, 0.12)',
          strong: 'rgba(148, 163, 184, 0.22)',
        },
        fg: {
          DEFAULT: '#e9ebf1',
          muted: '#9aa3b5',
          faint: '#626c7e',
        },
        yes: {
          DEFAULT: '#34d399',
          dim: '#10b981',
          glow: 'rgba(52, 211, 153, 0.12)',
        },
        no: {
          DEFAULT: '#fb7185',
          dim: '#f43f5e',
          glow: 'rgba(251, 113, 133, 0.12)',
        },
        accent: {
          DEFAULT: '#5b8cff',
          light: '#a9c2ff',
          dim: '#2f5fd0',
          glow: 'rgba(91, 140, 255, 0.14)',
        },
        plasma: '#e8b26a',
        warn: '#fbbf24',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'technical-sm': ['11px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600' }],
        'display-lg': ['40px', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-xl': ['56px', { lineHeight: '1.02', letterSpacing: '-0.025em', fontWeight: '800' }],
        mega: ['clamp(2.75rem, 6vw, 5.25rem)', { lineHeight: '1', letterSpacing: '-0.025em' }],
        giga: ['clamp(3rem, 8vw, 7rem)', { lineHeight: '0.95', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(0, 0, 0, 0.5)',
        elevated: '0 16px 40px rgba(0, 0, 0, 0.45)',
        'glow-yes': '0 0 0 1px rgba(52, 211, 153, 0.25)',
        'glow-no': '0 0 0 1px rgba(251, 113, 133, 0.25)',
        'glow-accent': '0 0 0 1px rgba(91, 140, 255, 0.3)',
      },
      dropShadow: {
        'glow-yes': '0 0 0 rgba(0,0,0,0)',
        'glow-no': '0 0 0 rgba(0,0,0,0)',
        'glow-accent': '0 0 0 rgba(0,0,0,0)',
      },
      animation: {
        'pulse-slow': 'pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-up': 'flashUp 600ms ease-out',
        'flash-down': 'flashDown 600ms ease-out',
        rise: 'rise 240ms cubic-bezier(0.16, 1, 0.3, 1)',
        marquee: 'marquee 36s linear infinite',
        sweep: 'sweep 3.5s linear infinite',
        'glow-breathe': 'pulse 3.2s ease-in-out infinite',
      },
      keyframes: {
        flashUp: {
          '0%': { backgroundColor: 'rgba(52, 211, 153, 0.14)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(251, 113, 133, 0.13)' },
          '100%': { backgroundColor: 'transparent' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(5px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        glowBreathe: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
