---
name: Arena Precision System
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
  secondary: '#c7c6c6'
  on-secondary: '#2f3131'
  secondary-container: '#484949'
  on-secondary-container: '#b8b8b8'
  tertiary: '#ffffff'
  on-tertiary: '#342f2e'
  tertiary-container: '#eae0dd'
  on-tertiary-container: '#6a6361'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c7'
  on-primary-fixed: '#1a1c1c'
  on-primary-fixed-variant: '#454747'
  secondary-fixed: '#e3e2e2'
  secondary-fixed-dim: '#c7c6c6'
  on-secondary-fixed: '#1a1c1c'
  on-secondary-fixed-variant: '#464747'
  tertiary-fixed: '#eae0dd'
  tertiary-fixed-dim: '#cec5c2'
  on-tertiary-fixed: '#1f1b19'
  on-tertiary-fixed-variant: '#4b4644'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '500'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-lg:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: -0.01em
  data-sm:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-max: 1440px
  sidebar-width: 240px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is engineered for a high-stakes, information-dense prediction market. It rejects the typical "gamified" or "cyberpunk" aesthetic of crypto-adjacent platforms in favor of a **Minimalist Editorial** style that prioritizes data integrity and rapid comprehension.

The brand personality is **quiet, precise, and authoritative**. It draws inspiration from technical tools like Linear and Vercel, utilizing a structured layout where information hierarchy is established through meticulous typography and whitespace rather than heavy containers. The visual language is intentionally "dry" to convey stability and institutional-grade reliability.

**Core Principles:**
- **Information Over Interface:** The data is the UI. Avoid decorative elements that do not serve a functional purpose.
- **Micro-Precision:** Use thin 1px borders, subtle hover states, and monospaced accents to reflect the accuracy of the market.
- **Architectural Layout:** Rely on a rigorous grid and alignment to create a sense of order in a volatile environment.

## Colors

The palette is strictly functional, utilizing a high-contrast dark mode foundation to reduce eye strain during prolonged monitoring of market data.

- **Foundational Neutrals:** The background uses a deep charcoal (`#0a0a0a`), providing a sophisticated base that feels more "premium" than pure black. Borders and containers utilize the neutral scale to create structural separation without visual noise.
- **Typography Tiers:** Primary information (headings, active prices) uses the primary seed color Off-white (`#ededed`) for maximum legibility. Secondary data (labels, timestamps) uses the secondary Muted Gray (`#a1a1a1`).
- **Functional Semantics:** Color is reserved almost exclusively for market signals. **Emerald Green** signifies positive movement and "Yes" positions. **Crimson Red** signifies negative movement and "No" positions. 
- **Accent:** Use the Primary Off-white sparingly—only for primary action triggers or critical focus states.

## Typography

The typographic system is the primary driver of the design system's aesthetic, emphasizing clarity and mathematical precision.

1.  **Display & Headlines:** Uses **Geist** for its technical, slightly condensed geometric feel. It conveys modernity and precision.
2.  **Body Text:** Uses **Inter** for its exceptional readability and neutral tone. It handles the bulk of the platform's descriptive content.
3.  **Market Data:** Uses **Lexend** for all numerical values, prices, and countdowns. This typeface is designed for rapid perception and reading proficiency, ensuring that critical market shifts are recognized instantly.
4.  **Micro-Labels:** Small caps with increased letter-spacing (using Inter) should be used for secondary metadata to differentiate from interactive labels.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for core content containers to maintain editorial control over line lengths and data density.

- **Structure:** A persistent left-hand sidebar navigation (240px). The main content area uses a 12-column grid with a 1440px maximum width.
- **Rhythm:** An 8px (2-unit) base scale for vertical rhythm, with 4px (1-unit) reserved for micro-alignments in data tables.
- **Responsive Behavior:** 
    - **Desktop:** Wide gutters (24px) and generous top padding to create a sense of airiness.
    - **Tablet:** Sidebar collapses into a drawer; margins reduce to 24px.
    - **Mobile:** Single-column flow; data tables shift to a simplified "Card-List" view to maintain legibility.

## Elevation & Depth

This system avoids traditional shadows in favor of **Tonal Layering** and **Thin Outlines**.

- **Surface Tiers:** 
    - **Level 0 (Background):** `#0a0a0a`
    - **Level 1 (Cards/Sections):** Subtle tonal shifts from the neutral base.
    - **Level 2 (Popovers/Modals):** Highest contrast for focused overlays.
- **Borders:** All elevations are defined by 1px solid borders. No blurs or drop shadows are permitted.
- **Interactivity:** Hover states are indicated by shifting the border color to a slightly lighter gray or increasing the background brightness by 2-3%, rather than using shadows.

## Shapes

The shape language is "Soft" yet geometric. We use a **0.25rem (4px)** base radius for all standard components like input fields, buttons, and market cards.

- **Strictness:** Do not use fully rounded "pill" shapes for buttons or chips; keep the 4px radius to maintain a professional, structured look.
- **Containers:** Large section containers or page-level wrappers should also adhere to the small radius or remain sharp (0px) if they touch the edge of the viewport.

## Components

- **Buttons:** Solid `#ededed` with black text for primary actions. Secondary actions use a ghost style: transparent background with a neutral border. Text is always centered.
- **Market Price Chips:** Use the label font (**Lexend**). The background should be transparent with a border matching the semantic color (Green/Red) at 20% opacity.
- **Input Fields:** Minimalist. Only a bottom border or a very thin all-around border. No background fill unless in focus. Focus state uses the primary white border.
- **Data Tables:** No vertical dividers. Use horizontal 1px lines only. Row hover state should be a subtle tonal fill.
- **Cards:** Cards are used for market listings. They should have no shadow and a thin border. The focus should be on the headline (Geist) and the current odds (Lexend).
- **Progress Bars/Odds Visualizers:** Use flat, 2px tall bars. No rounded ends, no gradients.