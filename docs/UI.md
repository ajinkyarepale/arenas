# Arenas — Current UI

A written snapshot of the interface as it stands today: the design system, every
route, and every component that draws something on screen. Written from the code
in `src/`, not from a design file — where the two disagree, this document follows
the code.

---

## 1. What the product is, visually

Arenas is a live prediction-market platform for college FinTech events. The
interface has to work in three very different places at once:

| Surface | Device | Constraint |
| --- | --- | --- |
| **Trading screen** | a phone held one-handed, mid-round | thumb reach, 44px targets, buy buttons in the first viewport |
| **Projector view** | a wall at the back of a lecture hall | no controls, no hover, two numbers sized to fill the room |
| **Marketing / admin** | a laptop | conventional reading layout, dense forms and tables |

The visual language is **instrument panel** — a near-black blue-biased ground with
luminous elements layered on top, so everything coloured reads as *emitted light*
rather than painted colour. Corner brackets, hairline rules, scanlines and a
perspective grid do the decorative work; nothing is skeuomorphic and nothing is
rounded-and-friendly.

---

## 2. Design system

### 2.1 Colour (`tailwind.config.ts`)

**Ground — `ink`**, near-black with a blue bias:

| Token | Hex | Used for |
| --- | --- | --- |
| `ink-950` | `#04060d` | page background, `html` background, theme colour |
| `ink-900` | `#070b16` | footer, inset wells, scrollbar track |
| `ink-850` | `#0b111f` | panel fill (at 80% alpha) |
| `ink-800` | `#101827` | secondary button fill, chips, skeletons |
| `ink-750` | `#162034` | hover state, rank pills past 3rd |
| `ink-700` / `ink-600` | `#1d2942` / `#2a3a5c` | scrollbar thumb, rare fills |

**Lines and text:**

| Token | Hex |
| --- | --- |
| `line` | `#1a2540` |
| `line-strong` | `#2b3c60` |
| `fg` | `#e6edfb` |
| `fg-muted` | `#8fa1c4` |
| `fg-faint` | `#5b6b8f` |

**Semantics** — the whole product reads off these, pushed luminous so they can
carry glow:

| Token | Hex | Meaning |
| --- | --- | --- |
| `yes` | `#00e896` | YES / up / win / connected |
| `no` | `#ff3d64` | NO / down / loss / locked |
| `accent` | `#3d9bff` | interaction, join codes, HUD detail |
| `warn` | `#ffb020` | 1st place, voids, degraded connection |
| `plasma` | `#22d3ee` | secondary luminous hue, used sparingly |

Each of `yes` / `no` / `accent` also carries `-dim` and `-glow` variants.

Dark mode is the only mode: `darkMode: 'class'` with `dark` hard-coded on `<html>`,
`colorScheme: 'dark'` in the viewport export. There is no light theme.

### 2.2 Type (`src/app/layout.tsx`, `globals.css`)

Three Google fonts, loaded via `next/font` with `display: swap`:

- **`--font-display` — Chakra Petch** (500/600/700). Angular and technical.
  Every heading, every large number, always `uppercase tracking-tight`.
- **`--font-sans` — Barlow** (400–700). Body copy, labels, buttons.
- **`--font-mono` — JetBrains Mono**. Eyebrows, join codes, the trade tape,
  nav links, timestamps.

Two custom clamped sizes exist for the projector:

- `text-mega` → `clamp(3rem, 9vw, 9rem)`
- `text-giga` → `clamp(4rem, 13vw, 14rem)`

**`.tnum`** applies `font-variant-numeric: tabular-nums`, and is on every number
that changes in place — countdown, probability, balances, leaderboard. Digits must
never jitter.

### 2.3 Component classes (`globals.css`, `@layer components`)

| Class | What it is |
| --- | --- |
| `.panel` | the instrument housing: `rounded-md`, `border-line`, `bg-ink-850/80`, `shadow-panel`, backdrop blur, plus a `::before` hairline luminous top edge |
| `.panel-tight` | a lighter inset well inside a panel |
| `.hud` | corner brackets via `::before`/`::after` — the single most characteristic device, applied only to things that matter |
| `.label` | mono, 10px, uppercase, `tracking-[0.18em]`, `text-fg-faint` — the universal field label |
| `.field` | form input: `border-line`, `bg-ink-900/80`, accent focus ring, **font-size pinned to 16px** so iOS Safari never zooms on focus |
| `.btn` | base: `min-height: 44px`, inline-flex, `rounded`, semibold |
| `.btn-primary` | accent fill, ink text, glow on hover |
| `.btn-secondary` | outlined, `bg-ink-800/80`, accent border on hover |
| `.btn-ghost` | text-only until hover |
| `.btn-danger` | `no`-toned outline for destructive organizer actions |
| `.grid-field` | 44px perspective grid — the ground plane of the whole system |
| `.bloom` | radial accent gradient behind hero numbers and headlines |
| `.scanlines` | 3px repeating horizontal lines at ~2.8% opacity — texture, not noise |
| `.safe-top` / `.safe-bottom` / `.safe-x` | `env(safe-area-inset-*)` padding for the notch and home indicator |
| `.no-scrollbar` | hides scrollbars on horizontal strips without losing scroll |
| `.glow-accent` / `.glow-yes` / `.glow-no` | `text-shadow` for the handful of numbers that should look emitted |

### 2.4 Motion

Custom animations: `pulse-slow`, `flash-up` / `flash-down` (600ms green/red wash on
a value change), `rise` (6px + fade, for arriving rows and banners), `marquee`
(32s ticker loop), `sweep` (a light bar travelling an edge — live indicators),
`glow-breathe`, `scan`.

`prefers-reduced-motion: reduce` is honoured globally in `globals.css` (all
durations collapsed to 0.01ms) *and* individually — `FieldBackdrop` renders nothing
at all, the ticker uses `motion-reduce:animate-none`.

### 2.5 Accessibility and platform behaviour baked into the CSS

- `:focus-visible` only — a 2px accent outline for keyboards, nothing for taps.
- `-webkit-tap-highlight-color: transparent` globally.
- `overscroll-behavior-y: none` on body — pull-to-refresh must not fire mid-round.
- `html` painted `#04060d` so iOS rubber-band scroll never reveals white.
- Zoom stays **enabled** (`maximumScale: 5`, `userScalable: true`); the 16px input
  floor is what prevents auto-zoom instead.
- Number inputs have their spinners stripped on all engines.
- Custom scrollbars, 10px, ink-toned.

---

## 3. Shared primitives (`src/components/ui.tsx`)

| Export | Description |
| --- | --- |
| `Panel` | thin wrapper applying `.panel` |
| `StatusPill` | arena status. `LIVE` = green with a pinging dot; `LOBBY` renders as **OPEN** in accent; `DRAFT` / `ENDED` are muted |
| `Badge` | small pill, tones `neutral / yes / no / accent / warn` |
| `Stat` | `panel-tight` tile: `.label`, a display-font value, optional hint, and a vertical accent hairline that lights on hover |
| `EmptyState` | `.panel .hud .grid-field` centred block with title, body, optional CTA |
| `ErrorNote` | `role="alert"` red-bordered notice |
| `PageHeader` | eyebrow (with a 6px accent tick), 4–5xl display title, subtitle, actions; a gradient rule anchors it to the page |
| `Spinner` | 4px spinning ring in `currentColor` |

---

## 4. Page chrome

### `SiteShell` (`site-shell.tsx`)

Header + `<main>` + footer. Applied **per page**, deliberately not via a route-group
layout — the two full-bleed routes (`/arenas/[code]/live`, `/arenas/[code]/screen`)
live under the same path segment and must not inherit a header. Widths: `narrow`
(`max-w-xl`), `default` (`max-w-5xl`), `wide` (`max-w-6xl`).

### `SiteHeader` (`site-header.tsx`)

Sticky, `z-40`, `bg-ink-950/80` + `backdrop-blur-xl`, with a gradient hairline along
the bottom edge. 64px tall.

- **Logo**: a 28px inline SVG — a rounded ink square with accent corner brackets
  (echoing `.hud`) framing one green and one red candlestick.
- **Nav**: mono, uppercase, `tracking-[0.12em]`. The active route is accent-coloured
  with a glowing underline.
- Links are role-aware: `Markets / Guide / About` always, `+ Dashboard` when signed
  in, `+ Organize` for `ORGANIZER` and `SUPERADMIN`.
- Right side: session name + Sign out, or Sign in / Sign up. A skeleton pulses while
  `useSession` is loading.
- Below `md`: a hamburger toggling a full-width panel of stacked links.

### `SiteFooter` (`site-footer.tsx`)

Wordmark and one-line description, a mono link grid, then the compliance block:
educational platform, virtual points only, no deposits/withdrawals/payment
processing, not a financial instrument, not advice. Credits the Binance public API.

### `FieldBackdrop` (`field-backdrop.tsx`)

A canvas particle field — drifting dots linked when within 120px, plus a slow
travelling sine wave at 62% height. Built to get out of the way: ~1 dot per 14k
device-independent pixels capped at 90, pauses on `visibilitychange`, and renders
nothing under reduced motion. Used on the landing hero and both auth pages.

---

## 5. Routes

### `/` — Landing (`app/page.tsx`)

1. **Hero**: layered `grid-field` + `bloom` + `FieldBackdrop` + `scanlines`, faded out
   at the bottom into `ink-950`. A pinging "Live rooms · not homework" chip, then a
   `text-8xl` display headline — *"A trading floor / **in an afternoon**"* — with the
   second line accent and glowing. Two CTAs, and a mono line: *free · virtual points
   only · no deposits*.
2. **`LiveArenasTicker`**: a marquee of arenas actually `LIVE` or `LOBBY` right now,
   polled from `/api/arenas` every 20s, with a sweeping light bar. It renders
   **nothing** when nothing is open — a trading floor with no trades should look
   quiet, not fake it.
3. **"One round, start to finish"**: four `.hud` panels numbered `01`–`04` — the bell,
   the room trades, lock, settle.
4. **Two audiences**: side-by-side panels for participants (green bullets) and
   organizers (accent bullets).
5. **Closing**: a `hud grid-field scanlines` panel — *"Anyone can host. Every arena is
   independent."*

### `/markets` and `/arenas` — Directory

Both render `ArenaDirectory`; `/arenas` passes `showJoinActions`. A search field
(event, college, or asset) plus a segmented status filter in a bordered pill rail.
Each result is a group-hover card: status pill, mono code, display-font name that
turns accent on hover, metadata row, and a right-hand action column. Live cards get
a green sweeping hairline across the top. Loading shows three pulsing skeletons.

### `/guide` — How to trade

Long-form onboarding, `max-w-5xl`. Sections: the question you are answering · what
you are actually buying · how the price moves · reading the live price · the clock ·
your first round · mistakes people make. Local primitives: `Strong`, `Mono` (bordered
inline code), `Bullet`, and `Callout` in `yes` / `no` / `warn` tones. Ends with a
worked example and a two-button CTA panel.

### `/info` — About

Sections: the problem it solves · how a prediction market prices information · the
market maker · how rounds settle · multiple colleges, one platform · the join code ·
**no money. anywhere.** Uses a `Formula` block (horizontally scrollable bordered mono
row) for the LMSR maths.

### `/signin`, `/signup`

`narrow` shell, `max-w-sm` column, with `grid-field` + `FieldBackdrop` (density 0.6)
+ `bloom` bled out past the viewport edges. Eyebrow reads **Access** / **Enlist**,
then a display-font title and a `.hud` panel containing the form. Forms use `.label`
spans over `.field` inputs; signup adds a bordered checkbox row for terms.

### `/dashboard` — Trader analytics

`wide` shell, server-rendered, `force-dynamic`.

1. **Masthead** — `panel hud grid-field scanlines`, with the trader's `EquityCurve`
   bled in behind at 70% opacity and a bloom top-left. Email as eyebrow, first name
   as a 5xl display title, then **Career P/L** at `text-6xl` glowing green or red,
   flanked by `KeyFigure`s: return on stake, hit rate, streak.
2. **Calibration** (only with settled history) — `CalibrationChart` against a dashed
   perfect-calibration diagonal, with an "average miss" readout colour-coded green
   (<10%) / amber (<20%) / red.
3. **How you trade** — average entry (labelled *you back underdogs / favourites /
   balanced*), points staked, best and worst trade, and a `SplitBar` of YES vs NO
   preference. Plus a three-figure career row: arenas, rounds won, podiums.
4. **Live and upcoming** / **Finished** — `ArenaRow` cards showing balance, P/L, rank
   over a three-column rule, and contextual actions.

### `/arenas/[code]` — Join gate

`narrow`. A detail panel (host eyebrow, display-font name, status pill, description)
over a 9-cell `<dl>`: format, asset, rounds, round length, lock buffer, starting
points, start time, traders joined, and the **join code in glowing accent mono**.

Below it, `JoinArena` renders one of four states:

- **not signed in** → create account / sign in, carrying `callbackUrl`
- **already joined** → green check, current balance, open-trading-screen CTA, and a
  tip about adding it to the home screen
- **closed / not yet open** → explanation, results link if ended
- **joinable** → starting-balance copy and a spaced-out uppercase code input

Then a "first time trading a market?" card pointing at `/guide`.

### `/arenas/[code]/live` — The trading screen

Full-bleed, no site chrome, auth-gated and participation-gated server-side.

**Sticky header** (`z-30`, blurred, gradient hairline): connection dot (green solid /
amber pulsing), arena name, asset · round *n* of *m* · status, and the balance
right-aligned.

**Settlement banner**: on settle, an `animate-rise` strip in the outcome's colour —
*Round 7 · closed UP · YES · 64,210 → 64,388* — auto-dismissing after 8s. Voids read
*VOID — everyone refunded* in amber.

**Layout ordering is deliberate and differs by device.** On a phone: the numbers,
then the trade controls, then the chart. A participant with twenty seconds left must
never scroll past a chart to reach the buy buttons. On `lg` and up it becomes a
`1.6fr / 1fr` grid — chart column left, trade panel sticky at `top-24` on the right.

Panels, in DOM order:

1. **Numbers** (`panel hud` + bloom): *Chance it closes UP* at `text-6xl`, coloured
   and glowing green above 50% / red below, beside the `RoundTimer`. Then a
   `ProbabilityBar`, then three mini-stats — live price, round open (tinted by
   direction), volume.
2. **Chart** — `CandleChart`, 200px, lazily loaded (`ssr: false`) because
   lightweight-charts touches `window` at import and adds ~50KB to a screen people
   open on 4G. Caption: *Blue line = this round's open.*
3. **Trade tape** — compact variant.
4. **`LeaderboardStrip`** — phone only.
5. **Trade column** — balance header, `TradePanel`, a full top-10 `Leaderboard`
   (desktop only), and Results / Dashboard links.

### `/arenas/[code]/screen` — The projector

Public, unauthenticated by design (a projector should never be signed into a
participant account), `h-[100dvh]`, no scroll, no hover, no controls.

- **Header**: arena name at `text-5xl`, host · asset · **join code glowing in accent
  mono**, the round counter at `text-7xl`, and a `StatusLamp` with a pinging dot.
- **Left column**: the candle chart filling available height (an internal
  `ResizeObserver` hands it an explicit pixel height), with the live price at
  `text-5xl` tinted by direction; below it, `ProbabilityTrace` — an SVG sparkline of
  implied probability across the round with a gradient fill and a dashed 50% line.
- **Right column**: implied probability at `text-mega` with glow, a display-variant
  `ProbabilityBar`, the countdown at `text-giga`, the trade tape, and a top-10
  leaderboard at `text-3xl` rows.
- **Overlays**: a 6s full-screen settlement flash — `YES` / `NO` / `VOID` at
  `text-mega` inside a glowing bracketed box; and an idle overlay that, in lobby,
  shows only **the join code, breathing, at `text-mega`**.

### `/arenas/[code]/results`

Header, a "your event" stat row, an analytics section (crowd accuracy, `PnlBars`,
`RoundTimeline`, "how the candles actually closed"), the final leaderboard, the
viewer's round-by-round table, and an every-round table with open, close, outcome
and final YES price.

### `/admin`, `/admin/arenas/new`, `/admin/arenas/[id]`

- **Index**: `PageHeader` with a create CTA, four `Stat` tiles (arenas, live now,
  participants, trades), then arena cards with the join code in bordered accent mono.
- **New**: `CreateArenaForm` — three fieldset groups (*The event*, *Format*, *Points
  and pricing*) built from a local `Field` wrapper carrying label, hint and
  per-field server error. The liquidity parameter is a slider whose label shows its
  live value.
- **Control**: `ArenaControl` — arena header with start/pause/end/force-resolve
  buttons (`btn-danger` for destructive ones), a join-code block with copy and
  projector links, live implied-YES and leaderboard panels, and tables for the trade
  tape, rounds, and participants.

### `not-found.tsx` / `error.tsx`

404: a `text-6xl` faint numeral, *"Nothing here"*, and copy about checking the code
the organizer gave you. Error boundary: *"Something broke"* plus the reassurance that
balances and positions are safe on the server, with a retry button.

---

## 6. Arena components in detail

### `TradePanel` (`trade-panel.tsx`)

Mobile-first and thumb-first.

- **Stake row**: a −/+ pair at 52px wide flanking a centre-aligned `text-2xl` number
  input, then quick-stake chips (10 / 25 / 50 / 100 / Max, filtered to what is
  affordable, selected chip in accent), then a 44px-tall range slider. The chips
  exist so nobody has to use a phone keyboard mid-round.
- **Quote**: computed client-side with the same LMSR module the server prices with,
  against the last book state from the socket — and labelled as an estimate, because
  the server re-prices and can fill slightly differently.
- **Buy buttons**: two `.hud` blocks at `min-h-[88px]`, tinted and glowing per side.
  Each shows `YES`/`NO` at `text-2xl` display, a sub-label (*Closes UP* / *Closes
  DOWN*), the price, and `≈ n sh`. They press in via `active:scale-[0.98]` and swap
  to a spinner while pending.
- **`PositionRow`**: mark-to-market for the round — unrealised P/L in the header,
  then a YES cell and a NO cell with share count, average price and cost.
- Below: an error note, a green fill confirmation that clears after 4s, or the
  disabled reason (*trading is locked while the round settles*).

### `RoundTimer` / `RoundCounter` (`round-timer.tsx`)

Five phases — `waiting`, `trading`, `closing`, `locked`, `resolved` — each with its
own label. Colour carries meaning: neutral while trading, **amber under 30 seconds**,
red once closing or locked, muted once resolved. `text-6xl` compact, `text-giga` on
the projector. `closing` adds `animate-pulse-slow`. `aria-live="off"` deliberately,
so a screen reader is not interrupted every second.

### `ProbabilityReadout` / `ProbabilityBar` / `ProbabilityTrace` (`probability.tsx`)

The readout flashes green or red on any change over 0.05pp — the whole reason the
liquidity parameter is kept low is so a single trade visibly moves this number in
front of a room. The bar is a green/red split with `role="img"` and a spoken label,
animating width over 300ms. The trace is a client-collected SVG sparkline, capped at
600 points, reset on round change, and never persisted.

### `Leaderboard` / `LeaderboardStrip` (`leaderboard.tsx`)

Rank pills are colour-graded: gold-glowing for 1st, muted for 2nd, bronze for 3rd,
ink beyond. `RankDelta` renders ▲/▼ with a count past one place, and a neutral dot
for held positions. The viewer's own row is accent-bordered with a soft glow. The
strip, for phones, shows your rank plus the top three and nothing else.

### `TradeTape` (`trade-tape.tsx`)

An 8-deep ring buffer of fills, newest first and `animate-rise` on arrival. Each row
is mono: direction arrow, name, side, shares, cost — tinted per side.

### `CandleChart` (`candle-chart.tsx`)

lightweight-charts on a transparent background with accent-tinted grid lines and the
`yes`/`no` palette on the candles. History comes from the server (which proxies
Binance so 200 phones do not all hit the public API) and the in-progress candle is
advanced locally from socket ticks, with periodic re-fetch to correct drift. The
round's strike is a horizontal reference line. On touch, `vertTouchDrag` is off so
the page scrolls rather than the gesture being trapped — participants need to scroll
past this to reach the buttons. The projector variant hides the crosshair and
disables all interaction.

### `charts.tsx` (analytics)

`EquityCurve`, `CalibrationChart` (dots against a dashed diagonal), `PnlBars`
(per-round bars above/below a centre rule), `RoundTimeline`, `SplitBar`. All
hand-rolled SVG/flex — no charting dependency — with dashed-border empty states.

---

## 7. Conventions worth keeping

- **Two variants, everywhere.** Almost every arena component takes
  `variant: 'compact' | 'display'`. Compact is the phone; display is the wall. There
  is no third size.
- **Nothing fake.** Empty states say *"Waiting for the first fill…"*, *"Nobody has
  joined yet"*, *"Waiting for the market to move…"* — never placeholder activity.
- **`.hud` is rationed.** Corner brackets go on the things that matter — the hero
  numbers, the buy buttons, the auth panels, empty states — not on every panel.
- **The buy buttons win every layout argument.** Ordering, sticky positioning and
  chart gesture handling are all decided in their favour.
- **Colour is never the only signal.** Outcomes carry text (`YES` / `NO` / `VOID`),
  rank changes carry glyphs and `aria-label`s, the connection dot carries a `title`.
