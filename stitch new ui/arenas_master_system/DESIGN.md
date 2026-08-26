---
name: Arenas Master System
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c8'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c6c6c7'
  primary: '#ffffff'
  on-primary: '#2f3131'
  primary-container: '#e2e2e2'
  on-primary-container: '#636565'
  inverse-primary: '#5d5f5f'
  secondary: '#c6c5cf'
  on-secondary: '#2f3038'
  secondary-container: '#4a4b53'
  on-secondary-container: '#bcbbc5'
  tertiary: '#ffffff'
  on-tertiary: '#33302d'
  tertiary-container: '#e8e1dc'
  on-tertiary-container: '#686460'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e3e1ec'
  secondary-fixed-dim: '#c6c5cf'
  on-secondary-fixed: '#1a1b22'
  on-secondary-fixed-variant: '#46464e'
  tertiary-fixed: '#e8e1dc'
  tertiary-fixed-dim: '#cbc5c1'
  on-tertiary-fixed: '#1d1b18'
  on-tertiary-fixed-variant: '#494643'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  success-neon: '#22C55E'
  error-coral: '#EF4444'
  border-neutral: '#27272A'
  surface-glass: rgba(20, 20, 20, 0.7)
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono-lg:
    fontFamily: Epilogue
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  data-mono-sm:
    fontFamily: Epilogue
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.05em
  label-caps:
    fontFamily: Epilogue
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  nav-item:
    fontFamily: Epilogue
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  gutter: 24px
  margin-desktop: 48px
  margin-mobile: 20px
  container-max: 1280px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is a high-fidelity evolution of technical precision, blending **Refined Minimalism** with **Glassmorphic** depth. It is engineered for a high-stakes, data-dense environment where clarity is paramount, but the experience remains premium and sophisticated. The aesthetic is inspired by high-end hardware and professional developer tools, favoring a "soft-geometry" approach that reduces visual fatigue without sacrificing the structured, institutional authority required for prediction markets.

The brand personality is **quietly confident, meticulously precise, and architecturally sound**. It evokes an emotional response of absolute reliability and technical mastery.

**Core Principles:**
- **Atmospheric Depth:** Utilize semi-transparent layers and backdrop blurs to create a sense of physical space within a digital interface.
- **Micro-Precision:** High-contrast typography and thin, 1px neutral borders ensure that information density feels organized rather than cluttered.
- **Tactile Softness:** Geometry is intentionally softened with generous radii to make the high-precision data feel approachable and modern.

## Colors

The palette is anchored in a deep, monolithic charcoal to provide a high-contrast foundation for data visualization. Color is used with extreme restraint, reserved almost exclusively for semantic signaling and active states.

- **Foundational Neutrals:** The background is a solid `#0A0A0A`. Text hierarchy is strictly enforced through luminosity: Off-white (`#F9F9F9`) for primary content and Muted Gray (`#71717A`) for secondary meta-text.
- **Accent Signals:** Neon Green (`#22C55E`) is the "YES" and active-state primary signal. Coral Red (`#EF4444`) is the "NO" and error-state signal. These should be used as highlights, not primary fills.
- **Glass & Borders:** Surface containers utilize a semi-transparent dark fill with backdrop-blur effects to simulate frosted glass. All containers are defined by a thin, low-contrast border (`#27272A`).

## Typography

This system uses a dual-font strategy to separate editorial content from technical data.

- **Geist (Primary & Body):** Employed for all primary narrative, headings, and UI controls. Its clean, technical sans-serif profile reinforces the modern developer-centric aesthetic.
- **Epilogue (Labels & Data):** Reserved for market navigation, labels, and all numerical data values. For market prices and volatility percentages, utilize **tabular figures** (monospace) to ensure columns of data remain perfectly aligned during real-time updates.
- **Hierarchy:** High-precision data should be treated as a visual anchor. Use `label-caps` for structural meta-text to create a distinct texture compared to interactive body copy.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy to maintain editorial precision. 

- **Grid:** A 12-column grid system with a maximum container width of 1280px. This ensures optimal line lengths for data-heavy tables and market cards.
- **Rhythm:** A 4px base unit drives all spacing. Use `stack-md` (16px) for internal card padding and `gutter` (24px) for spacing between major UI components.
- **Responsive Flow:** 
  - **Desktop:** Generous 48px margins and centered containers create an "editorial" feel.
  - **Tablet:** 32px margins; sidebars collapse into persistent icon-based rails.
  - **Mobile:** 20px margins; all cards stack vertically and data tables utilize horizontal scrolling with locked first columns.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

- **Surface Layers:** The base layer is pure black. Elevated containers (cards, modals) use a semi-transparent charcoal with a `16px` to `32px` backdrop-blur. This creates a "stacked glass" effect that feels deep and premium.
- **Outlines:** Every elevated surface must have a 1px solid border (`#27272A`). This is the primary method of defining shape.
- **Interactivity:** On hover, elements should not move or gain shadows; instead, increase the border brightness to `#3F3F46` and slightly increase the opacity of the glass fill.

## Shapes

The design system utilizes **Soft Geometry**. Sharp corners are avoided to maintain the premium, tactile feel of the interface.

- **Containers & Inputs:** All standard containers, cards, and input fields use a `12px` (standard) to `16px` (large) corner radius. This creates a cohesive "hardware" look.
- **Nesting:** When nesting elements (e.g., an input inside a card), the inner element's radius should be 4-8px smaller than the outer container to maintain visual harmony.
- **Strictness:** Sharp 0px corners are only permitted for vertical dividers or elements that bleed to the edge of the viewport.

## Components

- **Buttons:** Primary buttons are **Pill-shaped (fully rounded)**. Use `#F9F9F9` background with black text for the "Master" action. Secondary buttons use a ghost style with a 1px `#27272A` border and pill geometry.
- **Cards:** Must use glassmorphism (semi-transparent fill + backdrop blur). Cards are the primary container for market data and should be framed with the standard 1px border.
- **Chips:** Used for market tags or statuses. These are small, pill-shaped elements with a secondary gray border and `label-caps` text.
- **Input Fields:** Enclosed boxes with `12px` roundedness. Use a subtle dark fill. On focus, the border shifts to `#F9F9F9` and the label text (Epilogue) remains small and high-contrast.
- **Data Tables:** No vertical lines. Use 1px horizontal dividers (`#27272A`) to separate rows. Numerical data must use the Epilogue font with tabular spacing for perfect alignment.
- **Checkboxes & Radios:** Soft-geometric (4px radius for checkboxes, circular for radios). Active states utilize the Neon Green accent for "YES" selections and Coral Red for "NO" selections.