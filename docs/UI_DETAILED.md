# Arenas — Detailed UI Reference (for handoff to another model)

This document is meant to let a model with **no access to the repo** understand the
current UI precisely enough to reason about changes, write matching code, or review
proposals — real class names, real hex values, real component signatures, real
snippets, not paraphrase. Stack: **Next.js 14 App Router, TypeScript, Tailwind CSS,
NextAuth, Prisma, `lightweight-charts`, a WebSocket-driven realtime layer.**

Product: **Arenas** — live Yes/No prediction-market tournaments for college FinTech
events. Participants trade virtual points on whether a 5-minute candle closes green,
priced by an LMSR automated market maker. Everything settles in virtual points; there
is no real money anywhere in the system.

---

## 0. File map

```
src/
  app/
    layout.tsx                     root layout: fonts, metadata, viewport
    globals.css                    design tokens consumed via Tailwind @layer
    page.tsx                       landing page
    error.tsx / not-found.tsx      boundaries
    dashboard/page.tsx             trader analytics
    markets/page.tsx               public arena directory
    arenas/page.tsx                arena directory (with join actions)
    arenas/[code]/page.tsx         join gate
    arenas/[code]/live/page.tsx    trading screen (auth + participant gated)
    arenas/[code]/screen/page.tsx  projector view (public)
    arenas/[code]/results/page.tsx results & analytics
    guide/page.tsx                 trading onboarding (long-form)
    info/page.tsx                  about / how it works
    signin/page.tsx, signup/page.tsx
    admin/page.tsx                 organizer arena list
    admin/arenas/new/page.tsx      create-arena form
    admin/arenas/[id]/page.tsx     arena control room
  components/
    ui.tsx                         Panel, StatusPill, Badge, Stat, EmptyState, ErrorNote, PageHeader, Spinner
    site-shell.tsx, site-header.tsx, site-footer.tsx
    field-backdrop.tsx             animated canvas particle field
    live-arenas-ticker.tsx         homepage marquee of live/lobby arenas
    arena-directory.tsx            search + filter arena list
    auth-forms.tsx                 SignInForm, SignUpForm
    charts.tsx                     EquityCurve, CalibrationChart, PnlBars, RoundTimeline, SplitBar
    arena/
      live-arena.tsx               the trading screen component
      big-screen.tsx               the projector component
      trade-panel.tsx              stake input + buy YES/NO buttons
      probability.tsx              ProbabilityReadout, ProbabilityBar, ProbabilityTrace
      round-timer.tsx              RoundTimer, RoundCounter, roundPhase()
      leaderboard.tsx              Leaderboard, LeaderboardStrip
      trade-tape.tsx               TradeTape (recent fills ticker)
      candle-chart.tsx             lightweight-charts wrapper
      join-arena.tsx               join-code confirmation / gate states
    admin/
      arena-control.tsx            organizer's live control room
      create-arena-form.tsx        arena creation form
  hooks/use-arena.ts                WebSocket hook: snapshot, round, leaderboard, price, trades
  lib/format.ts, lib/lmsr.ts, lib/analytics.ts, lib/engine/*, lib/realtime/*
tailwind.config.ts                 design tokens (colors, shadows, animation, font sizes)
```

---

## 1. Design tokens — `tailwind.config.ts` (verbatim values)

```ts
colors: {
  ink: {
    950: '#04060d',
    900: '#070b16',
    850: '#0b111f',
    800: '#101827',
    750: '#162034',
    700: '#1d2942',
    600: '#2a3a5c',
  },
  line: {
    DEFAULT: '#1a2540',
    strong: '#2b3c60',
  },
  fg: {
    DEFAULT: '#e6edfb',
    muted: '#8fa1c4',
    faint: '#5b6b8f',
  },
  yes: {
    DEFAULT: '#00e896',
    dim: '#00b877',
    glow: 'rgba(0, 232, 150, 0.2)',
  },
  no: {
    DEFAULT: '#ff3d64',
    dim: '#d92a4d',
    glow: 'rgba(255, 61, 100, 0.2)',
  },
  accent: {
    DEFAULT: '#3d9bff',
    dim: '#2176d6',
    glow: 'rgba(61, 155, 255, 0.35)',
  },
  plasma: '#22d3ee',
  warn: '#ffb020',
}

fontFamily: {
  sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
  mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}

fontSize: {
  mega: ['clamp(3rem, 9vw, 9rem)', { lineHeight: '0.92', letterSpacing: '-0.02em' }],
  giga: ['clamp(4rem, 13vw, 14rem)', { lineHeight: '0.88', letterSpacing: '-0.03em' }],
}

boxShadow: {
  panel: '0 1px 0 0 rgba(140,180,255,0.06) inset, 0 12px 40px -16px rgba(0,0,0,0.9)',
  'glow-yes': '0 0 24px -4px rgba(0,232,150,0.45), 0 0 0 1px rgba(0,232,150,0.3)',
  'glow-no': '0 0 24px -4px rgba(255,61,100,0.45), 0 0 0 1px rgba(255,61,100,0.3)',
  'glow-accent': '0 0 28px -6px rgba(61,155,255,0.6), 0 0 0 1px rgba(61,155,255,0.35)',
}

dropShadow: {
  'glow-yes': '0 0 14px rgba(0,232,150,0.55)',
  'glow-no': '0 0 14px rgba(255,61,100,0.55)',
  'glow-accent': '0 0 16px rgba(61,155,255,0.6)',
  'glow-fg': '0 0 18px rgba(150,190,255,0.3)',
}

animation: {
  'pulse-slow': 'pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  'flash-up': 'flashUp 600ms ease-out',
  'flash-down': 'flashDown 600ms ease-out',
  rise: 'rise 400ms cubic-bezier(0.16, 1, 0.3, 1)',
  marquee: 'marquee 32s linear infinite',
  sweep: 'sweep 3.5s linear infinite',
  'glow-breathe': 'glowBreathe 3.2s ease-in-out infinite',
  scan: 'scan 7s linear infinite',
}
// keyframes: flashUp/flashDown (bg wash to transparent), rise (translateY(6px)->0 + fade),
// marquee (translateX(0) -> translateX(-50%)), sweep (translateX(-100%) -> translateX(300%)),
// glowBreathe (opacity 0.5 <-> 1), scan (translateY(-100%) -> translateY(100%))

darkMode: 'class'   // dark is the ONLY mode; `dark` class is hard-coded on <html> in layout.tsx
```

---

## 2. Fonts — `src/app/layout.tsx`

```ts
import { Barlow, Chakra_Petch, JetBrains_Mono } from 'next/font/google';

const barlow  = Barlow({ subsets: ['latin'], variable: '--font-sans',    weight: ['400','500','600','700'], display: 'swap' });
const chakra  = Chakra_Petch({ subsets: ['latin'], variable: '--font-display', weight: ['500','600','700'], display: 'swap' });
const mono    = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
```

- `--font-sans` = Barlow → body text, buttons, most UI copy
- `--font-display` = Chakra Petch → **all headings and large numbers**, always paired with `uppercase tracking-tight`
- `--font-mono` = JetBrains Mono → eyebrows/labels, join codes, nav links, trade tape, timestamps

`viewport` export: `themeColor: '#04060d'`, `colorScheme: 'dark'`, `viewportFit: 'cover'`,
`maximumScale: 5`, `userScalable: true` (zoom deliberately NOT disabled — that's an
accessibility failure; instead inputs are pinned to 16px font-size to stop iOS
auto-zoom-on-focus).

`<html className="${barlow.variable} ${chakra.variable} ${mono.variable} dark">`

---

## 3. `globals.css` — component classes (verbatim, this is the actual CSS)

```css
@layer base {
  html { background-color: #04060d; }               /* stops iOS rubber-band white flash */
  body { @apply bg-ink-950 text-fg antialiased; overscroll-behavior-y: none; }
  * { -webkit-tap-highlight-color: transparent; }
  ::selection { background: rgba(61, 155, 255, 0.35); }
  .tnum { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }
  input[type='number']::-webkit-outer-spin-button,
  input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  input[type='number'] { -moz-appearance: textfield; }
  :focus-visible { outline: 2px solid theme('colors.accent.DEFAULT'); outline-offset: 2px; }
  /* custom 10px scrollbar, ink-toned track/thumb */
  @media (prefers-reduced-motion: reduce) { * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
}

@layer components {
  .panel {
    @apply relative rounded-md border border-line bg-ink-850/80 shadow-panel backdrop-blur-sm;
  }
  .panel::before {  /* hairline luminous top edge */
    content: ''; position: absolute; inset: 0 0 auto 0; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(61,155,255,0.35) 20%, rgba(61,155,255,0.35) 80%, transparent);
  }
  .panel-tight { @apply rounded border border-line bg-ink-900/70; }

  .hud { position: relative; }               /* HUD corner brackets via ::before/::after, 14x14px, accent color, 2px border, opacity .75 */

  .label { @apply font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-fg-faint; }

  .field {
    @apply w-full rounded border border-line bg-ink-900/80 px-4 py-3 text-base text-fg
           placeholder:text-fg-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent;
    font-size: 16px;   /* stops iOS zoom-on-focus */
  }

  .btn {
    @apply relative inline-flex items-center justify-center gap-2 rounded px-5 font-semibold
           tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-45;
    min-height: 44px;   /* Apple HIG / Material tap target floor */
  }
  .btn-primary   { @apply btn bg-accent text-ink-950 hover:bg-accent-dim hover:shadow-glow-accent; }
  .btn-secondary { @apply btn border border-line-strong bg-ink-800/80 text-fg hover:border-accent/60 hover:bg-ink-750 hover:text-fg; }
  .btn-ghost     { @apply btn text-fg-muted hover:bg-ink-800 hover:text-fg; }
  .btn-danger    { @apply btn border border-no/40 bg-no/10 text-no hover:bg-no/20; }

  .safe-top    { padding-top: max(var(--safe-top), 0px); }
  .safe-bottom { padding-bottom: max(var(--safe-bottom), 0px); }
  .safe-x      { padding-left: max(var(--safe-left), 0px); padding-right: max(var(--safe-right), 0px); }

  .grid-field {   /* perspective ground plane, 44px cells, accent lines at .07 alpha */
    background-image: linear-gradient(rgba(61,155,255,0.07) 1px, transparent 1px),
                       linear-gradient(90deg, rgba(61,155,255,0.07) 1px, transparent 1px);
    background-size: 44px 44px;
  }
  .bloom {   /* radial accent glow behind hero numbers */
    background: radial-gradient(ellipse at center, rgba(61,155,255,0.18) 0%, rgba(61,155,255,0.05) 35%, transparent 70%);
  }
  .scanlines::after {   /* very low-contrast 3px horizontal texture */
    content: ''; position: absolute; inset: 0;
    background-image: repeating-linear-gradient(to bottom, rgba(180,210,255,0.028), rgba(180,210,255,0.028) 1px, transparent 1px, transparent 3px);
  }
}

@layer utilities {
  .text-balance { text-wrap: balance; }
  .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .no-scrollbar::-webkit-scrollbar { display: none; }
  .glow-accent { text-shadow: 0 0 18px rgba(61,155,255,0.55); }
  .glow-yes    { text-shadow: 0 0 18px rgba(0,232,150,0.55); }
  .glow-no     { text-shadow: 0 0 18px rgba(255,61,100,0.55); }
}
```

---

## 4. Shared UI primitives — `src/components/ui.tsx` (full behavior)

```tsx
export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>)
// <div className={cx('panel', className)} {...rest}>{children}</div>

const STATUS_STYLES: Record<string, string> = {
  LIVE:  'border-yes/50 bg-yes/10 text-yes shadow-[0_0_16px_-4px_rgba(0,232,150,0.5)]',
  LOBBY: 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_16px_-4px_rgba(61,155,255,0.5)]',
  DRAFT: 'border-line-strong bg-ink-800 text-fg-muted',
  ENDED: 'border-line-strong bg-ink-800 text-fg-faint',
};
export function StatusPill({ status, className }: { status: string; className?: string })
// label = status === 'LOBBY' ? 'OPEN' : status
// LIVE renders an extra pinging dot (animate-ping ring + solid dot, both bg-yes)

export function Badge({ children, tone = 'neutral', className })
// tones: neutral | yes | no | accent | warn -> border+bg+text combos at low alpha

export function Stat({ label, value, hint, tone, className })
// panel-tight, p-4, group hover:border-line-strong
// left edge: absolute inset-y-0 left-0 w-px gradient-to-b via-accent/40, opacity .6 -> 1 on hover
// value: font-display tnum text-2xl font-bold tracking-tight, tone yes/no adds text-{yes|no} glow-{yes|no}

export function EmptyState({ title, body, action })
// <div className="panel hud grid-field flex flex-col items-center gap-3 px-6 py-14 text-center">
//   <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
//   <p className="max-w-sm text-sm text-fg-muted">{body}</p>
//   {action && <Link href={action.href} className="btn-primary mt-2">{action.label}</Link>}

export function ErrorNote({ children })
// role="alert", "rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-sm text-no"

export function PageHeader({ eyebrow, title, subtitle, actions })
// <header className="relative flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
//   bottom gradient rule: absolute inset-x-0 bottom-[-1px] h-px bg-gradient-to-r from-accent/60 via-accent/10 to-transparent
//   eyebrow: .label + <span className="inline-block h-px w-6 bg-accent/70" /> tick before text
//   title: font-display text-balance text-4xl font-bold uppercase tracking-tight sm:text-5xl
//   subtitle: mt-3 max-w-2xl text-sm text-fg-muted sm:text-base

export function Spinner({ className })
// h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent
```

---

## 5. Page chrome

### `SiteShell` (`site-shell.tsx`)

```tsx
export function SiteShell({ children, className, width = 'default' }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className={cx(
        'safe-x mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12',
        width === 'narrow' && 'max-w-xl',
        width === 'default' && 'max-w-5xl',
        width === 'wide' && 'max-w-6xl',
        className,
      )}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
```

Applied **per-page**, not via a Next.js route-group layout — `/arenas/[code]/live`
and `/arenas/[code]/screen` share a path segment with the pages that DO use
`SiteShell`, and must render with zero header/footer.

### `SiteHeader` (`site-header.tsx`)

- `<header className="safe-top sticky top-0 z-40 border-b border-line bg-ink-950/80 backdrop-blur-xl">`
- Bottom hairline: `absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent`
- Row: `h-16 max-w-6xl` flex, logo left, centered nav (`hidden md:flex`), auth controls right, hamburger `md:hidden`
- `Logo` = inline 28x28 SVG: `rect rx="5" fill="#0b111f" stroke="#2b3c60"` with accent
  corner-bracket paths, one green (`#00e896`) candle rect + wick, one red (`#ff3d64`)
  candle rect + wick.
- Nav links: `PUBLIC_LINKS = [{href:'/markets',label:'Markets'}, {href:'/guide',label:'Guide'}, {href:'/info',label:'About'}]`,
  conditionally appends `Dashboard` (any session) and `Organize` (role `ORGANIZER`/`SUPERADMIN`).
  Active link: `text-accent` + `absolute inset-x-2 -bottom-px h-px bg-accent shadow-[0_0_8px_rgba(61,155,255,0.9)]` underline.
- Auth area: session loading → `h-9 w-24 animate-pulse rounded-lg bg-ink-800` skeleton;
  signed in → name + `Sign out` (`btn-ghost`); signed out → `Sign in` (`btn-ghost`) + `Sign up` (`btn-primary`).
- Mobile menu: `border-t border-line bg-ink-900 px-4 py-3`, stacked full-width links, then
  auth buttons stacked at the bottom.

### `SiteFooter` (`site-footer.tsx`)

- `<footer className="safe-bottom safe-x relative mt-20 border-t border-line bg-ink-900">`
- Top hairline gradient identical pattern to header.
- Two columns: wordmark + one-liner description; a `grid-cols-2 sm:grid-cols-3` mono
  uppercase link list (Upcoming markets, Trading guide, About, Create account, Sign in).
- Compliance block, verbatim: *"Arenas is an educational platform. Every market settles
  in virtual points with no cash value. There is no deposit, no withdrawal, no payment
  processing, and no real-money wagering anywhere in the system — nothing here is a
  financial instrument, and nothing here is investment advice."* Then a price-data
  attribution line crediting the Binance public API.

### `FieldBackdrop` (`field-backdrop.tsx`)

Canvas-based particle field, `'use client'`, props `{ className?, density = 1 }`.

- Skips entirely if `prefers-reduced-motion: reduce`.
- Dot count: `Math.min(90, Math.floor(((width*height)/14000) * density))`.
- Each dot: random position, velocity `±0.11px/frame`, radius `0.5–1.9px`.
- Draws a slow travelling sine "horizon" line at `height*0.62` first (two summed sine
  terms, stroke `rgba(61,155,255,0.16)`).
- Then draws links between dots within 120px (`alpha = (1-dist/120)*0.22`), then dots
  on top (`rgba(120,190,255,0.55)`).
- Dots wrap at edges (not bounce — bouncing would make edges visible).
- Uses `ResizeObserver` + `visibilitychange` to pause/resume `requestAnimationFrame`;
  explicitly re-requests a frame on becoming visible rather than checking a flag,
  because a page that loaded hidden never got an initial rAF callback.
- Rendered as `<canvas aria-hidden className="pointer-events-none absolute inset-0 h-full w-full">`.

### `LiveArenasTicker` (`live-arenas-ticker.tsx`)

- Polls `GET /api/arenas` every 20s (`useEffect` + `setInterval`), silently swallows
  fetch errors (decorative, not a page users depend on).
- Filters to `status === 'LIVE' || status === 'LOBBY'`; **returns `null` if none** —
  no placeholder/fake activity.
- Renders items twice back-to-back so the CSS `marquee` animation (`translateX(-50%)`)
  loops seamlessly.
- Each item: colored dot (pulsing yes-green if LIVE, static accent-blue if LOBBY),
  bold code, name, then either `round {n}/{m}` (LIVE) or `{startingBalance} pt start` (LOBBY).
- A `animate-sweep` gradient bar travels across the strip continuously (decorative "live feed" cue).

---

## 6. Routes, in code-accurate detail

### `/` — `app/page.tsx` (landing)

Wrapped in `<SiteShell width="wide" className="!py-0">`.

**Hero** — `<section className="scanlines relative -mx-4 overflow-hidden px-4 py-20 sm:-mx-6 sm:px-6 sm:py-28">`:
- Layers, in DOM order: `.grid-field` (opacity-70) → radial `.bloom` (`h-[36rem] w-[52rem]`, centered, pulled up) → `<FieldBackdrop opacity-80>` → bottom fade `bg-gradient-to-t from-ink-950 to-transparent` (`h-40`).
- Live chip: pinging yes-dot + `"Live rooms · not homework"`, mono `text-[11px] uppercase tracking-[0.14em] text-accent`, in an `accent/30` bordered pill.
- H1: `font-display mt-7 max-w-4xl text-balance text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl` — two lines: `"A trading floor"` / `"in an afternoon"` (second line `text-accent glow-accent`).
- Body copy (verbatim): *"Arenas turns a lecture hall into a live prediction market. Everyone gets virtual points and one question every five minutes: **does this candle close green?** Prices move as the room trades, the projector shows it happening, and the leaderboard changes on every settle."*
- CTAs: `Get started` (`btn-primary`, → `/signup`) + `See upcoming events` (`btn-secondary`, → `/markets`).
- Footnote: `"Free · virtual points only · no deposits, nothing to withdraw"`.

**`<LiveArenasTicker />`** directly under the hero.

**"One round, start to finish"** — h2 `text-3xl sm:text-4xl`, subhead names the format
**5-Min Candle**. Four `.hud` cards in a `grid md:grid-cols-2 lg:grid-cols-4`, each with
a `01`–`04` mono index, a title, and body copy:
1. **The bell** — "A new round opens. The asset price at that instant becomes the strike everyone is betting against, and the market resets to 50/50."
2. **The room trades** — "Buy YES if you think it closes above the strike, NO if below. Every trade moves the price, so the number on the screen is the room's live consensus."
3. **Lock** — "Trading stops shortly before the close, so nobody can trade on a result they can already see coming."
4. **Settle** — "The close is sampled over several seconds and averaged. Winning shares pay 1 point each, the leaderboard updates, and the next round opens."

**Two audiences** — `grid gap-5 lg:grid-cols-2`, two `Panel p-7`:
- *For participants* — bullet list (yes-dot bullets): big buttons + stake slider + countdown, live implied probability, reconnect resilience, home-screen install. CTA → `/guide`.
- *For organizers* — bullet list (accent-dot bullets): spin up in a minute, one join code, projector view built for the back of the room, start/pause/force-resolve controls. CTA → `/signup`.

**Closing** — `Panel className="hud grid-field scanlines relative overflow-hidden p-8 sm:p-12"`
with a centered bloom: *"Anyone can host. **Every arena is independent.**"* + copy about
multi-tenancy (no visibility into other organizers' arenas) + two CTAs.

### `/markets`, `/arenas` — directory

`SiteShell width="wide"` → `PageHeader` → `<ArenaDirectory />` (`showJoinActions` on `/arenas` only).

`ArenaDirectory` (`arena-directory.tsx`):
- Search `<input className="field" placeholder="Search by event, college, or asset">`.
- Status filter: horizontal pill rail, `no-scrollbar flex gap-1 overflow-x-auto rounded border border-line bg-ink-900 p-1`.
- Loading: 3x `h-32 animate-pulse rounded-md bg-ink-850` skeletons.
- Error: `Panel className="p-6 text-sm text-no"`.
- Each card: `group` hover card; live ones get a top sweeping hairline
  (`absolute inset-x-0 top-0 h-px overflow-hidden` containing an `animate-sweep` gradient
  from-transparent via-yes to-transparent). Header row: status pill + mono uppercase
  10px code; `h3` display font `text-xl uppercase` that turns `text-accent` on card
  hover; optional 2-line-clamped description; metadata row; a right-hand action column
  (`sm:w-40`) — Enter/Join/View depending on state.

### `/guide` — onboarding (long-form)

`SiteShell` (default width). `PageHeader eyebrow="Read this before your first round"
title="How to trade a candle market"`. Local helpers: `Section` (h2 + `flex flex-col
gap-4 text-[15px] leading-relaxed text-fg-muted`), `Strong` (`font-semibold text-fg`),
`Mono` (bordered inline code chip), `Bullet` (accent dot + text), `Callout` (tone
`yes|no|warn`, bordered box with a colored title).

Section order & key verbatim content:
1. **The question you are answering** — strike explanation; two `Callout`s for YES
   ("strictly above the strike, even a cent above counts") and NO ("at or below —
   a tie is not a win for YES").
2. **What you are actually buying** — shares pay exactly 1 point or 0; worked example
   panel: stake 50 @ 62% → ≈78 shares → wins 78 points (net +28) or loses the 50 staked.
   Two `Strong` callouts inline: *"Big trades get worse prices"* and *"Being early pays."*
3. **Reading the live price** — 50%/75%/10% worked interpretations; note that the chart's
   dashed blue line is the round's strike.
4. **The clock** — lock buffer (~30s) explanation; close = several samples averaged, not
   one tick; VOID + full refund if the price feed fails entirely.
5. **Your first round: what to actually do** — 5-step numbered list (don't trade first
   30s; stake small; have a stated reason; check the countdown; review after settle).
6. **Mistakes people make every single event** — 4 `Callout tone="warn"` grid: going
   all-in round one, chasing the crowd at 90% ("risk 0.9 to win 0.1... exactly
   break-even"), tapping with 3s left, forgetting a tie loses.
7. Closing `Panel`: *"That is everything"* + two CTAs (`/markets`, `/info`).
8. Compliance footnote (same virtual-points/no-cash-value language as the footer).

### `/info` — about

`Section`s: The problem it solves · How a prediction market prices information · The
market maker · How rounds settle · Multiple colleges, one platform · The join code ·
**No money. Anywhere.** Includes a `Formula` component: `overflow-x-auto rounded
border border-line bg-ink-900 px-5 py-4` wrapping `<code className="whitespace-nowrap
font-mono text-sm text-fg">` for the LMSR pricing formula.

### `/signin`, `/signup`

`SiteShell width="narrow"`, inner `mx-auto w-full max-w-sm py-8` column.
- Backdrop layers bled past viewport: `.grid-field` at `inset-x-[-50vw] inset-y-[-4rem]
  opacity-40`, `<FieldBackdrop density={0.6}>` at matching inset + `opacity-50`, a
  centered `.bloom` (`h-96 w-[36rem]`).
- Eyebrow: `"Access"` (signin) / `"Enlist"` (signup) with the accent tick.
- Title: `font-display text-4xl font-bold uppercase tracking-tight`.
- Form lives in `<Panel className="hud mt-6 p-6">`, wrapped in `<Suspense>` with a
  pulsing skeleton fallback.
- `SignInForm` fields: Email (`type=email`, placeholder `you@college.edu`), Password
  (placeholder `••••••••`), `btn-primary w-full` submit.
- `SignUpForm` fields: Name (placeholder "How you appear on the leaderboard"), Email,
  Password (placeholder "At least 8 characters"), a bordered terms checkbox row
  (`flex cursor-pointer items-start gap-3 rounded border border-line bg-ink-900 p-4`),
  `btn-primary w-full` submit.

### `/dashboard` — trader analytics (server component, `force-dynamic`)

`SiteShell width="wide"`. Auth-gated: redirects to `/signin?callbackUrl=/dashboard`
if no session. Fetches `getProfile(userId)` and `getTraderAnalytics(userId)` in
parallel.

**Masthead** — `<section className="panel hud grid-field scanlines relative overflow-hidden">`:
- If the trader has settled history, `EquityCurve` is bled in behind the content at
  `pointer-events-none absolute inset-x-0 bottom-0 opacity-70`.
- Top-left `.bloom` (`h-96 w-[40rem]`).
- Header row: email as eyebrow, first name (`session.user.name.split(' ')[0]`) as
  `font-display text-4xl sm:text-5xl` title; right side has `Browse markets`
  (`btn-secondary`) and, for organizers, `Organizer tools` (`btn-primary` → `/admin`).
- Key figures row (`flex flex-wrap items-end gap-x-10 gap-y-5`):
  - **Career P/L**: `font-display tnum text-5xl sm:text-6xl font-bold` — `text-yes
    glow-yes` if positive, `text-no glow-no` if negative, plain if zero/no history
    (shows `—` with no history).
  - `KeyFigure`s: Return on stake (`formatPercent`), Hit rate (+ "N settled trades"
    hint), Streak (e.g. `"4W"` / `"2L"`, hint shows longest win streak).
- If `searchParams.error === 'organizer-only'`: an amber warning banner: *"That area
  is for organizers. If you are running an event, ask an admin to upgrade your
  account."*

**Calibration + How you trade** (only rendered if `hasHistory`) —
`grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]`:
- Left `Panel`: **Calibration** — copy: *"When you pay 70 for a share, it should win
  about 70% of the time. Dots on the dashed line mean your prices match reality."*
  `CalibrationChart`, then an "Average miss" readout color-coded `text-yes` (<10%
  error), `text-warn` (<20%), `text-no` (≥20%), or `"needs more trades"` in muted text.
- Right column, two `Panel`s:
  - **How you trade** — a `dl grid-cols-2` of `Figure`s: Average entry price (hint:
    *"you back underdogs"* if <45%, *"you back favourites"* if >55%, else
    *"balanced"*), Points staked (hint: amount returned), Best trade (tone yes, hint
    shows arena code + round), Worst trade (tone no). Below a divider, a `SplitBar`
    of YES vs NO trade counts + net P/L per side.
  - **Career** — 3-figure row: Arenas played, Rounds won/traded, Podiums.

**Arena lists** — "Live and upcoming" (filters `LIVE`/`LOBBY`) and "Finished"
(filters `ENDED`), each a `grid md:grid-cols-2` of `ArenaRow` cards: host eyebrow,
name, `StatusPill`, a 3-column stat row (Balance / P/L tinted / Rank as ordinal with
participant count), a status-dependent caption line, and action buttons (Trade
now/Open + History, or Results if ended). Empty state via `EmptyState` pointing to
`/markets`.

### `/arenas/[code]` — join gate (server component)

`SiteShell width="narrow"`. Resolves the arena server-side via `findArenaByCode`;
`notFound()` if missing or code fails `joinCodeSchema`. Looks up the viewer's
`EventParticipant` row if signed in.

Detail `Panel`: host/organizer eyebrow, `font-display text-3xl sm:text-4xl uppercase`
name, `StatusPill`, optional description, then a `<dl className="grid grid-cols-2
gap-x-4 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">` of 9 `Detail`s: Format
("5-Min Candle" — hardcoded), Asset, Rounds, Round length, Trading locks
(`"{lockBufferSec}s before close"`), Starting points, Starts (formatted date/time),
Traders joined, **Join code** (`mono` variant: `font-mono text-base font-bold
tracking-[0.2em] text-accent glow-accent`).

`<JoinArena>` below (see §7). Then a `Panel p-5` pointing first-timers at `/guide`.

### `/arenas/[code]/live` — trading screen (server-gated, client component)

Server page: redirects to sign-in with `callbackUrl` if unauthenticated;
`notFound()` if the arena doesn't exist; **redirects to `/arenas/{code}` (the join
gate) if the session user has no `EventParticipant` row** — you cannot deep-link into
a room you haven't joined. Renders `<LiveArena initialArena={toPublicInfo(arena)} />`.

`LiveArena` (`arena/live-arena.tsx`) — see §8 for the full breakdown; outer shell is
`<div className="safe-bottom flex min-h-[100dvh] flex-col bg-ink-950">` with **no**
`SiteHeader`/`SiteFooter`.

### `/arenas/[code]/screen` — projector (server-gated only by `notFound`, otherwise public)

No auth check at all — deliberately: *"a projector should never be logged into a
participant account."* Renders `<BigScreen initialArena={...} />`. `robots: {index:
false, follow: false}` in metadata.

### `/arenas/[code]/results`

Header row: host eyebrow, `font-display text-4xl sm:text-5xl` name, description, and
(for the organizer/owner) a link back to the live trading screen. "Your event" stat
row (4 columns). An analytics section with crowd accuracy, `PnlBars`, `RoundTimeline`,
and "how the candles actually closed." Two-column: final leaderboard (`EmptyState` if
nobody joined) + the viewer's own round-by-round table (`Th`/`Td` helpers, columns:
round, side icon(s), staked, P/L) and an every-round table (round, open, close,
outcome, final YES price).

### `/admin` (organizer index)

`PageHeader` with `Link href="/admin/arenas/new" className="btn-primary text-sm"`.
Four `Stat` tiles: Arenas, Live now (tone yes if >0), Participants, Trades. `EmptyState`
if none. Otherwise a list of arena cards: mono bordered join code, live badge, name,
metadata row, description, and a `sm:w-44` action column (manage / view results).

### `/admin/arenas/new`

`CreateArenaForm` (`admin/create-arena-form.tsx`) — 3 fieldset groups built on a local
`Field({label, hint, error, children})` wrapper (label span + hint text + per-field
server-side validation error):
1. **The event** — Arena name, Host (hint: "Shown on the public calendar and the big
   screen"), Description (optional), Scheduled start (optional — "you still start it
   manually") + Join code (custom or auto-generated).
2. **Format** — Asset picker, Round length (seconds), Lock buffer (seconds), Total rounds.
3. **Points and pricing** — Starting balance, Max stake per trade, Liquidity parameter
   `b` (a range slider whose `Field label` string is templated live:
   ``label={`Liquidity parameter b = ${form.liquidityParamB}`}``).

Submit (`btn-primary flex-1`) + Cancel (`btn-secondary sm:w-40`).

### `/admin/arenas/[id]`

`ArenaControl` (`admin/arena-control.tsx`) — the organizer's live control room:
- Header `Panel`: arena name, action buttons — Start/Pause/End (`btn-secondary`/
  `btn-primary`) and a destructive Force-resolve (`btn-danger`); a join-code block
  with copy-to-clipboard and a link to the projector `/screen` route.
- Live implied-YES panel + a compact leaderboard panel side by side.
- Full-width `Panel`s for: live trade tape (table), Rounds (table), Participants
  (table) — each with a `.label` header and a row count on the right.

### `not-found.tsx` / `error.tsx`

- 404: `SiteShell width="narrow"`, centered column: `tnum text-6xl font-bold
  tracking-tight text-fg-faint` "404", `"Nothing here"`, copy about double-checking
  the organizer's code, `Browse markets` (primary) + `Home` (secondary).
- Global error boundary (`'use client'`): centered, no SiteShell (top-level boundary),
  `"Something broke"`, reassurance copy — *"An unexpected error stopped this page from
  rendering. If a round is in play, your balance and positions are safe on the
  server."* — and a `reset()` retry button.

---

## 7. `JoinArena` (`arena/join-arena.tsx`) — exact state machine

Props: `{ code, name, status, alreadyJoined, balance, startingBalance, signedIn }`.

```
if (!signedIn)              → Panel: "Sign in to join" + Create account / Sign in buttons (callbackUrl preserved)
else if (alreadyJoined)     → Panel: green check "You are in", balance readout,
                               "Open trading screen" (or "See final results" if ENDED) primary,
                               "Round history" secondary, home-screen-install tip
else if (status === ENDED)  → Panel: "This arena has finished" + "View results" link
else if (status === DRAFT)  → Panel: "This arena has not opened yet"
else                         → Panel: "Join {name}" + starting-balance copy +
                               spaced uppercase join-code confirmation input
                               (font-mono text-xl tracking-[0.35em], pre-filled from URL)
                               + "Join arena" primary button (disabled while pending
                               or code < 4 chars) → POST /api/arenas/{code}/join
                               → router.push(`/arenas/{code}/live`)
```

---

## 8. `LiveArena` (`arena/live-arena.tsx`) — the trading screen, full structure

Uses `useArena(code)` (custom hook, WebSocket-backed) which returns: `snapshot,
round, leaderboard, arena, price, lastTrade, lastSettled, connected, error,
clockOffsetMs, refresh`.

```
now = Date.now() + clockOffsetMs
phase = roundPhase(round, now)   // 'waiting' | 'trading' | 'closing' | 'locked' | 'resolved'
tradingOpen = status === 'LIVE' && phase === 'trading'
priceYes = round?.priceYes ?? 0.5
```

`disabledReason` logic (shown under the buy buttons when trading is closed):
- `status === ENDED` → "This arena has finished."
- `status !== LIVE` → "Waiting for the organizer to start the next round."
- `phase === locked | closing` → "Trading is locked while the round settles."
- `phase === resolved` → "Round settled — the next one opens shortly."
- else → "Trading is closed."

**`StickyHeader`** (`z-30`, `bg-ink-950/85 backdrop-blur-xl`, bottom gradient
hairline): connection dot (`bg-yes` solid if connected, `animate-pulse bg-warn` if
not, with a `title`/`aria-label`), arena name (truncated), "asset · round n of m ·
{status if not LIVE}" meta line, balance right-aligned (`tnum text-base sm:text-lg
font-bold`).

**`SettlementBanner`** — shows for 8s after each settle (`useEffect` resets a timer
keyed on `roundNumber`+`outcome`). Colored by outcome: `border-warn/40 bg-warn/10`
(VOID), `border-yes/40 bg-yes/10` (YES), `border-no/40 bg-no/10` (NO). Text:
`"Round {n}"` + `"VOID — everyone refunded"` / `"closed UP · YES"` / `"closed DOWN ·
NO"` + open→close price pair.

**Main layout** — `mx-auto max-w-6xl ... lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]`.
Comment in source explains the ordering rationale directly:

> "Ordering is deliberate and differs by device. On a phone the sequence is: the two
> numbers people stare at, then the trade controls, then the chart. The buy buttons
> have to sit inside the first viewport — a participant with twenty seconds left
> should never have to scroll past a chart to reach them. On a desktop or projector
> there is room for both, so the chart takes the wide left column and the trade panel
> sits beside it."

Sections in DOM order (`order-N` utility classes control mobile stacking):
1. `order-1` **Numbers panel** (`panel hud`, bloom overlay): 2-col grid — "Chance it
   closes UP" readout (`text-4xl sm:text-6xl`, `text-yes glow-yes` if ≥0.5 else
   `text-no glow-no`) beside `RoundTimer`. Below: `ProbabilityBar`. Below a
   border-top divider: 3 `MiniStat`s — Live price, Round open (tinted by direction vs
   live), Volume (points).
2. `order-3` (col-start-1, row-start-2 on `lg`) **Chart panel**: label = asset, caption
   "Blue line = this round's open", `<CandleChart height={200}>`.
3. `order-3` (row-start-3 on `lg`) **Trade tape panel**: `<TradeTape variant="compact">`.
4. `order-4 lg:hidden` **`LeaderboardStrip`** — phone-only compact leaderboard.
5. `order-2` (col-start-2, row-span-2, `lg:sticky lg:top-24`) **Trade column**:
   - Balance header row (label + `tnum text-2xl font-bold` + "pts" suffix).
   - `<TradePanel>` (full breakdown in §9).
   - `hidden lg:block` full `<Leaderboard limit={10}>` panel.
   - Bottom row: `Results` (`btn-secondary flex-1`) + `Dashboard` (`btn-ghost flex-1`) links.

---

## 9. `TradePanel` (`arena/trade-panel.tsx`) — full prop & behavior spec

```ts
export interface TradePanelProps {
  code: string;
  balance: number;
  maxStakePerTrade: number;
  liquidityParamB: number;
  qYes: number;
  qNo: number;
  priceYes: number;
  position: PositionSummary | null;
  tradingOpen: boolean;
  disabledReason?: string;
  onFilled: () => void;
}
const QUICK_STAKES = [10, 25, 50, 100];
const DEFAULT_STAKE = 25;
```

**Stake clamping logic** (documented in-source): `ceiling = max(1, min(maxStakePerTrade,
floor(balance)))`. Panel renders before the real balance loads, so ceiling starts at 1.
A `touched` boolean tracks whether the participant has manually chosen a stake — until
touched, the stake auto-re-derives from `min(DEFAULT_STAKE, ceiling)` as balance arrives;
once touched, it's only ever clamped downward, never reset.

**Live quote**: `useMemo` computing `quoteByBudget(book, 'YES'|'NO', safeStake,
liquidityParamB)` via the client-side copy of the LMSR module — same math the server
uses, run against the last book state (`qYes`, `qNo`) the socket delivered. Explicitly
labeled an *estimate* in the UI copy: *"Estimated fill — the price moves with every
trade, so the final price may differ slightly."*

**Stake control** (`panel-tight p-3 sm:p-4`):
- `−` / `+` buttons, `btn-secondary !min-w-[52px] !px-0 text-xl`, step of 5.
- Center `<input type="number" inputMode="numeric" className="field tnum h-full
  text-center !text-2xl font-bold">` with a `pts` suffix label.
- Quick-stake chip row: `[10, 25, 50, 100].filter(amount <= ceiling)` + a `Max` chip.
  Selected chip: `border-accent bg-accent/15 text-accent`; others:
  `border-line-strong bg-ink-800 text-fg-muted`. All `min-h-[44px]`.
- `<input type="range">` slider, `h-11` (44px tall — thumb-sized track).

**Submit flow**: `POST /api/arenas/{code}/trade` with `{side, stake}`. On success,
shows a green flash confirmation (`"Filled {shares} {side} at {price}"`, auto-clears
after 4s) and calls `onFilled()`. On failure, shows the server error or a generic
network message in a red `ErrorNote`-style banner.

**`BuyButton`** — the two large purchase controls:
```tsx
className={cx(
  'hud relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded border-2 px-3 py-4 font-bold transition-all active:scale-[0.98]',
  'min-h-[88px]',
  isYes
    ? 'border-yes/50 bg-yes/10 text-yes enabled:hover:bg-yes/20 enabled:hover:shadow-glow-yes enabled:active:bg-yes/25'
    : 'border-no/50 bg-no/10 text-no enabled:hover:bg-no/20 enabled:hover:shadow-glow-no enabled:active:bg-no/25',
  (disabled || pending) && 'opacity-40',
)}
```
Content while idle: `YES`/`NO` at `font-display text-2xl uppercase glow-yes|glow-no`,
sub-label ("Closes UP"/"Closes DOWN") in mono 10px, the current price
(`formatProbability`), and `≈ {shares} sh`. While pending: a `<Spinner>` replaces all
of it.

**`PositionRow`** (only shown if the participant holds shares this round) — mark-to-
market: `markValue = yesShares*priceYes + noShares*(1-priceYes)`, `unrealised =
markValue - totalStaked`, shown top-right (`text-yes` if ≥0 else `text-no`). Below,
two `PositionCell`s (YES/NO) each showing share count, avg fill price, and cost — or
a muted "No {side} position" placeholder if empty.

---

## 10. `RoundTimer` / `RoundCounter` / `roundPhase()` (`arena/round-timer.tsx`)

```ts
export type RoundPhase = 'waiting' | 'trading' | 'closing' | 'locked' | 'resolved';

export function roundPhase(round: RoundPayload | null, now: number): RoundPhase {
  if (!round) return 'waiting';
  if (round.status === 'RESOLVED') return 'resolved';
  if (round.status === 'LOCKED') return 'locked';
  if (round.status === 'PENDING') return 'waiting';
  const locksAt = round.locksAt ? new Date(round.locksAt).getTime() : null;
  if (locksAt && now >= locksAt) return 'locked';
  if (locksAt && locksAt - now <= 10_000) return 'closing';   // final 10s before lock
  return 'trading';
}

const PHASE_LABEL: Record<RoundPhase, string> = {
  waiting:  'Next round',
  trading:  'Trading closes in',
  closing:  'Closing',
  locked:   'Locked — resolving in',
  resolved: 'Round settled',
};
```

Countdown target: before lock, counts down to `round.locksAt`; after lock, counts down
to `round.resolvesAt`. Colour: `text-no` when closing/locked, `text-fg-muted` when
resolved, `text-warn` when `remaining <= 30_000` (30s warning), else `text-fg`.
`closing` phase adds `animate-pulse-slow`. Digits use `.tnum`. `aria-live="off"`
deliberately, "so a screen reader is not interrupted every second." Compact size
`text-5xl sm:text-6xl`; display (projector) size `text-giga`.

`RoundCounter` — simpler, `"{round} / {totalRounds}"`, `text-2xl` compact / `text-6xl` display.

---

## 11. Probability components (`arena/probability.tsx`)

**`ProbabilityReadout`** — flashes `text-yes` or `text-no` for 600ms whenever the
value changes by more than `0.0005` (0.05pp), then returns to `text-fg`. Sizes:
`text-6xl sm:text-7xl` compact, `text-giga` display. Renders a label, the percentage
(`formatProbability`), and a nested `ProbabilityBar`.

**`ProbabilityBar`** — a green/red split bar: `<div role="img" aria-label="Yes {p}%,
No {1-p}%">`, `h-3` compact / `h-6` display, `bg-yes` segment animates `width`
(300ms ease-out), remainder `bg-no/70`. Optional `YES {p}% / NO {1-p}%` labels below
(`text-xs` compact, `text-2xl` display).

**`ProbabilityTrace`** — client-only sparkline SVG (`viewBox="0 0 1000 {height}"`).
Collects a new sample point on every value change, capped at 600 (older points
dropped), resets when `roundId` changes. Shows *"Waiting for the market to move…"*
until ≥2 points exist. Line color: `#00e896` if the last point ≥ first point, else
`#ff3d64`; area fill is a matching gradient to transparent; a dashed
`stroke="#2b3c60"` line marks the 50% midline.

---

## 12. `Leaderboard` / `LeaderboardStrip` (`arena/leaderboard.tsx`)

Row (`LeaderboardRow`): rank badge (`bg-warn/20 text-warn` glow for #1, muted grey
for #2, `bg-[#b06a3b]/25 text-[#d08a55]` bronze for #3, plain `bg-ink-750
text-fg-faint` beyond), a `RankDelta` (▲/▼ + count if moved >1 place, a centered dot
`·` if unchanged), truncated display name, optional last-round P/L
(`formatSignedPoints`, tinted), and the balance right-aligned in `.tnum`. The
viewer's own row: `border-accent/60 bg-accent/10 shadow-[0_0_20px_-8px_rgba(61,155,255,0.7)]`.
Sizes scale for `display` variant (projector): `h-11 w-11 text-2xl` rank badge,
`text-3xl` name, `w-40 text-right text-3xl` balance.

`LeaderboardStrip` — mobile-only compact view: shows the viewer's own rank pill
(only if not already in the visible top 3) plus the top 3 entries, horizontally
scrollable, `no-scrollbar`, plus a trailing "{n} traders" caption.

---

## 13. `TradeTape` (`arena/trade-tape.tsx`)

`TAPE_LENGTH = 8`. A ring buffer keyed by `${at}-${displayName}-${shares}` to dedupe
repeated socket deliveries of the same fill. Newest-first, newest row gets
`animate-rise`. Each row: mono, `▲`/`▼` direction glyph (tinted), truncated trader
name, side label, shares (`{n}sh`), cost (`{n}pts`) — all in a bordered pill tinted at
6% background opacity per side. Empty state: *"Waiting for the first fill…"*.

---

## 14. `CandleChart` (`arena/candle-chart.tsx`)

Wraps `lightweight-charts`. Props: `{ code, openPrice?, livePrice?, height=220,
variant='compact'|'display', candleLimit=90 }`.

```ts
const chart = createChart(container, {
  layout: { background: { type: ColorType.Solid, color: 'transparent' },
            textColor: isDisplay ? '#8fa1c4' : '#5b6b8f',
            fontSize: isDisplay ? 15 : 11 },
  grid: { vertLines: { color: 'rgba(61,155,255,0.07)' }, horzLines: { color: 'rgba(61,155,255,0.07)' } },
  rightPriceScale: { borderColor: '#1a2540', scaleMargins: { top: 0.12, bottom: 0.12 } },
  timeScale: { borderColor: '#1a2540', timeVisible: true, secondsVisible: false, rightOffset: 3 },
  crosshair: { mode: isDisplay ? CrosshairMode.Hidden : CrosshairMode.Normal, /* dashed accent lines */ },
  handleScroll: isDisplay ? false : { vertTouchDrag: false },
  handleScale: !isDisplay,
});
const series = chart.addCandlestickSeries({
  upColor: '#00e896', downColor: '#ff3d64',
  borderUpColor: '#00e896', borderDownColor: '#ff3d64',
  wickUpColor: '#00b877', wickDownColor: '#d92a4d',
});
```

History is fetched server-side (`/api/arenas/[code]/candles`, which proxies Binance
so 200 phones don't hammer the public API directly) and refetched periodically to
correct drift; the in-progress candle is advanced locally between fetches using price
ticks arriving over the WebSocket. `openPrice` is drawn as a horizontal `IPriceLine`
reference at the round's strike. On touch devices `vertTouchDrag: false` so page
scroll isn't trapped by the chart — participants need to scroll past it to reach the
buy buttons. The `display` (projector) variant disables all interaction and hides
the crosshair.

---

## 15. `BigScreen` (`arena/big-screen.tsx`) — the projector, full structure

`h-[100dvh]` container, no scroll, `scanlines`, `.grid-field` opacity-50, a large
top-centered `.bloom` (`h-[40rem] w-[70rem]`).

**Header**: arena name `text-3xl xl:text-5xl`; subline `"{host} · {asset} · join code
{CODE glowing accent mono}"`; right side has the round counter (`text-5xl xl:text-7xl`)
and a `StatusLamp` (pinging dot + uppercase status pill, `"reconnecting…"` warning
text under it if the socket is down).

**Main** — `grid lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`:
- Left column: chart `Panel` filling available height via `ChartFill` (a
  `ResizeObserver`-driven wrapper that hands `CandleChart` an explicit pixel height,
  since the chart library can't auto-fill a flex child); open-price + live-price
  readout tinted by direction at `text-4xl xl:text-5xl`. Below it, a `Panel` for
  "Implied probability this round" containing volume/trade-count stats and
  `ProbabilityTrace` at `height={100}`.
- Right column: `panel hud` with the giant probability readout (`text-mega`, glowing)
  + display-variant `ProbabilityBar`; a `panel hud` with the display-variant
  `RoundTimer` (`text-giga`); a `max-h-40` trade tape panel; a flexible leaderboard
  panel (`text-3xl` rows, top 10).

**Overlays**:
- `SettlementOverlay` — 6s full-screen center flash, `.hud animate-rise` box with a
  matching glow shadow (`shadow-glow-yes` / `shadow-glow-no`, or amber for VOID),
  showing `YES`/`NO`/`VOID` at `text-mega` and the open→close price pair (or
  "Everyone refunded" for VOID).
- `IdleOverlay` — full-screen `bg-ink-950/80-85 backdrop-blur-sm`:
  - `status === ENDED` → "Final results" + "Leaderboard below is final. Thanks for playing."
  - `status === LOBBY | DRAFT` → *the join code alone*, `animate-glow-breathe
    text-mega text-accent glow-accent`, under a "Join now at" label, with "Waiting
    for the first round to open" beneath it.

---

## 16. `ArenaControl` (`admin/arena-control.tsx`) — organizer control room summary

Header `Panel`: arena name, join code block (`.label` + code + copy button + a link to
the `/screen` projector route), and a row of lifecycle buttons: Start/Pause/End
(`btn-secondary`/`btn-primary` depending on current state) and a `btn-danger`
force-resolve for stuck rounds. Below: a live implied-YES `Panel` and a compact
leaderboard `Panel` side by side. Then three full-width `Panel`s with `.label`
headers and row counts: live trade tape, Rounds, Participants — each a scrollable
table.

---

## 17. Conventions to preserve in any new work

1. **Every arena component supports exactly two variants**: `'compact'` (phone) and
   `'display'` (projector). There is no third size tier — don't add one without a
   reason as strong as "a third physical surface exists."
2. **No fabricated activity.** Empty/idle states use honest, specific copy —
   *"Waiting for the first fill…"*, *"Nobody has joined yet"*, *"Waiting for the
   market to move…"* — never a fake sample row or skeleton content dressed as real data.
3. **`.hud` corner brackets are rationed** to the elements that matter most: hero
   numbers, the buy buttons, auth panels, empty states, the settlement overlay. Not
   every panel gets them — that would dilute the signal.
4. **Mobile trading-screen ordering always prioritizes the buy buttons** being in the
   first viewport, over showing the chart first. This is explicitly commented in
   source as a deliberate trade-off.
5. **Numbers that update live always carry `.tnum`** so digit width changes don't
   cause layout jitter — this applies to countdowns, probabilities, balances, P/L,
   and every leaderboard figure.
6. **Colour is never the sole signal.** Outcomes are also spelled out as text (`YES`
   / `NO` / `VOID`), rank changes carry a glyph + `aria-label`, the connection dot has
   a `title`/`aria-label`.
7. **Reduced motion is respected at two levels**: globally (all animation durations
   collapsed via a media query in `globals.css`) and per-component for anything
   canvas/JS-driven (`FieldBackdrop` renders nothing at all; the ticker uses
   `motion-reduce:animate-none`).
8. **All interactive targets meet a 44px minimum** (`.btn`'s `min-height: 44px`, the
   stake +/- buttons, the range sliders at `h-11`) — this is a hard floor, not a
   default that gets overridden for space reasons.
9. **Dark mode is the only mode.** There is no light-theme token set anywhere in
   `tailwind.config.ts` or `globals.css` — don't assume a `dark:` variant pattern;
   the base styles ARE the dark styles.
