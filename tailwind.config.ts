import type { Config } from 'tailwindcss';

/**
 * "Glass System" — the elite redesign concept.
 *
 * A deep navy canvas with translucent glass planes floating over it. Hierarchy
 * comes from backdrop blur and border light rather than solid fills, so the
 * `ink` ramp here is used for atmosphere and recessed surfaces while the panels
 * themselves are rgba glass defined in globals.css.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#04060d', // the infinite canvas
          900: '#0b0e16', // surface-container-lowest
          850: '#10131b', // surface
          800: '#191b24', // surface-container-low
          750: '#1d1f28', // surface-container
          700: '#272a32', // surface-container-high
          600: '#32343d', // surface-container-highest
        },
        line: {
          DEFAULT: 'rgba(180, 210, 255, 0.12)',
          strong: 'rgba(180, 210, 255, 0.24)',
        },
        fg: {
          DEFAULT: '#e1e2ee',
          muted: '#c0c7d5',
          faint: '#8a919e',
        },
        // Reserved strictly for binary status: trading signals and outcomes.
        yes: {
          DEFAULT: '#00e896',
          dim: '#00b877',
          glow: 'rgba(0, 232, 150, 0.22)',
        },
        no: {
          DEFAULT: '#ff3d64',
          dim: '#d92a4d',
          glow: 'rgba(255, 61, 100, 0.22)',
        },
        accent: {
          DEFAULT: '#3d9bff',
          light: '#a3c9ff',
          dim: '#0060ab',
          glow: 'rgba(61, 155, 255, 0.4)',
        },
        plasma: '#ffb875',
        warn: '#ffb875',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        // Concept scale. The tight negative tracking on the display sizes is
        // what makes Chakra Petch read as machined rather than merely large.
        'technical-sm': ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'display-lg': ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-xl': ['64px', { lineHeight: '1.1', letterSpacing: '-0.03em', fontWeight: '700' }],
        mega: ['clamp(3rem, 9vw, 9rem)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        giga: ['clamp(4rem, 13vw, 14rem)', { lineHeight: '0.9', letterSpacing: '-0.04em' }],
      },
      borderRadius: {
        // Controls 8px, secondary surfaces 12px, primary glass planes 20px.
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        // Large-radius and ultra-soft: lifts a plane without a hard silhouette.
        panel: '0 20px 40px rgba(0, 0, 0, 0.4)',
        elevated: '0 -10px 40px rgba(0, 0, 0, 0.4)',
        'glow-yes': '0 0 24px -4px rgba(0, 232, 150, 0.45), 0 0 0 1px rgba(0, 232, 150, 0.3)',
        'glow-no': '0 0 24px -4px rgba(255, 61, 100, 0.45), 0 0 0 1px rgba(255, 61, 100, 0.3)',
        'glow-accent': '0 0 28px -6px rgba(61, 155, 255, 0.55), 0 0 0 1px rgba(61, 155, 255, 0.35)',
      },
      dropShadow: {
        // Data lines are neon light pipes.
        'glow-yes': '0 0 10px rgba(0, 232, 150, 0.6)',
        'glow-no': '0 0 10px rgba(255, 61, 100, 0.6)',
        'glow-accent': '0 0 12px rgba(61, 155, 255, 0.6)',
      },
      backdropBlur: {
        glass: '24px',
        elevated: '32px',
      },
      animation: {
        'pulse-slow': 'pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flash-up': 'flashUp 600ms ease-out',
        'flash-down': 'flashDown 600ms ease-out',
        rise: 'rise 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        marquee: 'marquee 32s linear infinite',
        sweep: 'sweep 3.5s linear infinite',
        'glow-breathe': 'glowBreathe 3.2s ease-in-out infinite',
      },
      keyframes: {
        flashUp: {
          '0%': { backgroundColor: 'rgba(0, 232, 150, 0.22)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDown: {
          '0%': { backgroundColor: 'rgba(255, 61, 100, 0.22)' },
          '100%': { backgroundColor: 'transparent' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
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
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
