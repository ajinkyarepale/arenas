# Arenas — Master Issues & Fixes Checklist

This document tracks all identified bugs, lagging features, missing links, animation stutters, and currency migration across the platform.

---

## Stage 1: Critical Compiler & API Type Errors
- [x] **1.1 Fix TypeScript TS2339 in Tournament Analysis**: Add `marketCategory` to `TournamentAnalysisPayload['arena']` and include `marketCategory: event.marketCategory` in `src/app/api/arenas/[code]/analysis/route.ts`.
- [x] **1.2 Fix Next.js 14 Route Handler / Page Params Typing**:
  - [x] `src/app/arenas/[code]/results/page.tsx`: Fix `params: Promise` -> synchronous `{ params: { code: string } }`.
  - [x] `src/app/api/admin/organizers/[id]/review/route.ts`: Fix `params: Promise` -> synchronous `{ params: { id: string } }`.
  - [x] `src/app/api/admin/arenas/[id]/export/route.ts`: Fix `params: Promise` -> synchronous `{ params: { id: string } }`.
- [x] **1.3 Fix Socket.io Arena Code Regex in `server.ts`**: Update `/^[A-Z0-9]{4,12}$/` to `/^[A-Z0-9-]{4,16}$/` so hyphenated and 13–16 char codes are not rejected.
- [x] **1.4 Verify `npm run typecheck` passes with zero errors**.

---

## Stage 2: Currency System Migration (`points` / `pts` → `arcs` / `ARCS`)
- [x] **2.1 Format Helpers (`src/lib/format.ts`)**: Add/update currency formatting helpers (`formatPoints` / `formatArcs`).
- [x] **2.2 Engine Validation (`src/lib/engine/trading.ts`)**: Update error messages from `points` to `arcs` (e.g. min stake, max stake, zero balance).
- [x] **2.3 Trade Panel (`src/components/arena/trade-panel.tsx`)**:
  - [x] Change `POINTS BUDGET` to `ARCS BUDGET`, `PTS` badge to `ARCS`.
  - [x] Update `pts` to `arcs` on balances, required margins, payouts, and button subtexts.
  - [x] Replace cent symbol `¢ / share` with `arcs/sh` / `% probability`.
  - [x] Update zero balance text to `0 Arcs Available`.
- [x] **2.4 Live Arena (`src/components/arena/live-arena.tsx`)**: Update balance, positions table headers, and fill histories to `arcs`.
- [x] **2.5 Leaderboard (`src/components/arena/leaderboard.tsx`)**: Replace `pts` with `arcs`.
- [x] **2.6 Big Screen Projector (`src/components/arena/big-screen.tsx`)**: Replace `pts` with `arcs` in podium, standings, and volume.
- [x] **2.7 Trade Tape & Crowd Graph (`src/components/arena/trade-tape.tsx`, `crowd-graph.tsx`)**: Replace `pts` with `arcs`.
- [x] **2.8 Tournament Analysis (`src/components/arena/tournament-analysis.tsx`)**: Replace `pts` with `arcs`.
- [x] **2.9 Admin Arena Controls (`src/components/admin/create-arena-form.tsx`, `arena-control.tsx`)**: Replace `pts` with `arcs`.
- [x] **2.10 User Profile / Dashboard (`src/app/dashboard/page.tsx`)**: Replace `pts` with `arcs` across Net PnL, prediction history, and payouts.

---

## Stage 3: Header Authentication & Navigation Links
- [x] **3.1 Fix "After Login Still Sign Up" in Page Headers**:
  - [x] `src/app/arenas/page.tsx`: Replace hardcoded static Sign In / Sign Up with `<SiteNavAuth />`.
  - [x] `src/app/guide/page.tsx`: Replace hardcoded static Sign In / Sign Up with `<SiteNavAuth />`.
  - [x] `src/app/info/page.tsx`: Replace hardcoded static Sign In / Sign Up with `<SiteNavAuth />`.
- [x] **3.2 SuperAdmin Pending Approvals Link**:
  - [x] `src/app/admin/page.tsx`: Add pending organizer request alert/counter badge linking to `/admin/organizers`.
  - [x] `src/components/site-sidebar.tsx`: Add `/admin/organizers` navigation link for SuperAdmins.
- [x] **3.3 Fix Dead "Forgot?" Password Link (`src/components/auth-forms.tsx`)**: Connect forgot password handler / modal.
- [x] **3.4 Fix Guide Documentation Payout (`src/app/guide/page.tsx`)**: Correct payout from 100 points to 1 arc per share.

---

## Stage 4: Countdown Timer & Real-time State Synchronization
- [x] **4.1 LiveArena Heartbeat Synchronization (`src/components/arena/live-arena.tsx`)**:
  - [x] Add 1-second interval ticker so `tradingOpen`, `phase`, and `TradePanel` update in real time without waiting for external socket messages.
- [x] **4.2 BigScreen HeaderTimer Fixes (`src/components/arena/big-screen.tsx`)**:
  - [x] Fix urgency check from `remaining <= 30` to `remaining <= 30_000` (30 seconds).
  - [x] Handle the ~6-second TWAP window smoothly with a `"Settling..."` status instead of frozen `00:00`.
- [x] **4.3 Smooth Phase Transitions (`src/components/arena/round-timer.tsx`)**:
  - [x] Clearly label "TRADING LOCKS IN" vs "RESOLVING IN" to prevent visual clock jumps.

---

## Stage 5: Animation Flow & Performance Bottlenecks
- [x] **5.1 Fix 2D Canvas CPU Blur Bottleneck (`src/components/ui/beams-background.tsx`)**:
  - [x] Remove CPU software `ctx.filter = 'blur(28px)'` in requestAnimationFrame.
  - [x] Implement GPU-accelerated CSS styling to restore 60 FPS.
- [x] **5.2 Fix Motion vs CSS Transition Conflict (`src/components/ui/card-stack.tsx`)**:
  - [x] Remove `transform` from CSS transitions so Framer Motion spring physics animate smoothly without hitching.
- [x] **5.3 Fix Ticker Tape Marquee (`src/components/live-arenas-ticker.tsx`)**:
  - [x] Remove `motion-reduce:animate-none` so ticker does not halt on Windows PCs with accessibility animations off.
  - [x] Convert items to clickable Next.js `<Link>` elements.
  - [x] Add pause on hover (`hover:[animation-play-state:paused]`).
  - [x] Update `pt start` to `arcs start`.

---

## Stage 6: UI Theme Harmonization & Form Anomalies
- [x] **6.1 Event Overview & Intelligence (`src/app/analytics/page.tsx`)**:
  - [x] Replaced mismatching `#09090b` / `#0d0d10` dark theme with canonical Arena `#131313` background and `bg-[rgba(20,20,20,0.7)]` glass cards.
  - [x] Standardized KPI metric cards to `rounded-xl p-5 bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-md` without clashing colored blur circles.
  - [x] Migrated volume traded metric from `pts` to `arcs`.
  - [x] Harmonized filter pill bar, search input, and tournament card grid styling to match platform standards.
  - [x] Added `<SiteNavAuth />` to top navigation header alongside the refresh action.
- [x] **6.2 Arena Creation Form Anomalies (`src/components/admin/create-arena-form.tsx`)**:
  - [x] Standardized stepper bar to `bg-[rgba(20,20,20,0.7)] rounded-xl border border-[#27272A]`, active green accent `bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30`.
  - [x] Harmonized inputs across all 4 steps to consistent `bg-[#141414] border border-[#27272A] rounded-xl text-white focus:border-[#22C55E]`.
  - [x] Replaced rogue iOS-style bright blue accents (`#3b82f6`, `#60a5fa`, `#93c5fd`) in the Demo Arena Mode toggle, simulation badges, and info notes with standard `#22C55E` green accent and `#181818` card backgrounds.
  - [x] Cleaned up conflicting background colors (`#18181B`, `#202024`, `#121214`) to standard Arena palette tokens.

---

## Stage 7: Loading States & Wireframe Skeletons (No Spinners)
- [x] **7.1 Reusable Skeleton Primitive (`src/components/ui/skeleton.tsx`, `src/components/ui.tsx`)**:
  - [x] Implemented `<Skeleton />` primitive with dark-mode pulse styling (`bg-[rgba(255,255,255,0.06)] border border-[#27272A]/40 animate-pulse rounded-md`).
  - [x] Exported from `@/components/ui`.
- [x] **7.2 Root Application Loading Shell (`src/app/loading.tsx`)**:
  - [x] Added Next.js root suspense fallback wireframe with top nav, metric blocks, and card list silhouettes.
- [x] **7.3 Catalog Loading Skeletons (`src/app/arenas/loading.tsx`, `src/app/markets/loading.tsx`)**:
  - [x] Replaced blank states and spinners with full catalog wireframes (sidebar silhouette, search bar, and 6 tournament market cards).
- [x] **7.4 Analytics Intelligence Loading Skeleton (`src/app/analytics/loading.tsx`)**:
  - [x] Added wireframe matching *Event Overview & Intelligence* (4 KPI stat cards, filter bar, and tournament intelligence cards).
- [x] **7.5 Admin Dashboard Loading Skeleton (`src/app/admin/loading.tsx`)**:
  - [x] Added wireframe with sidebar silhouette, action buttons, stat counters, and arena management list rows.
- [x] **7.6 Live Trading Room Skeleton (`src/app/arenas/[code]/loading.tsx`)**:
  - [x] Replaced rotating ring spinner with complete terminal wireframe (header ticker bar, crowd probability graph box, and trade order entry panel).
- [x] **7.7 Trader Profile Loading Skeleton (`src/app/dashboard/loading.tsx`)**:
  - [x] Replaced rotating ring spinner with user profile masthead, 4 KPI stats cards (`arcs`), and prediction table rows.

---

## Stage 8: Comprehensive Back Navigation & Mobile Continuity
- [x] **8.1 Fix Admin Organizers 404 Link (`src/app/admin/organizers/page.tsx`)**:
  - [x] Replaced broken `/admin/arenas` link with valid `<Link href="/admin">← Back to Arenas</Link>`.
- [x] **8.2 Live Arena Back Navigation (`src/components/arena/live-arena.tsx`)**:
  - [x] Converted static "Arenas" logo in desktop header to a functional back link `<Link href="/arenas">`.
  - [x] Added mobile back arrow link in the mobile status strip so mobile traders can exit the trading room.
- [x] **8.3 Big Screen Projector Exit Option (`src/components/arena/big-screen.tsx`)**:
  - [x] Added `← Exit` link button in header controls allowing presenters to exit projector mode back to the arena.
- [x] **8.4 Mobile Header Back Bars**:
  - [x] Added mobile back bars (`md:hidden`) to `src/app/admin/arenas/new/page.tsx`, `src/app/admin/arenas/[id]/page.tsx`, and `src/app/arenas/[code]/results/page.tsx` so mobile users are never stranded without a back button.
- [x] **8.5 Tournament Analysis Back Fallback (`src/components/arena/tournament-analysis.tsx`)**:
  - [x] Added fallback back link to `<Link href={`/arenas/${initialArena.code}`}>← Arena</Link>` when opened standalone.

---

## Stage 9: Flow Optimizations & Supabase Database Migration
- [x] **9.1 Trade Execution Feedback & Label Harmonization (`src/components/arena/trade-panel.tsx`)**:
  - [x] Added animated emerald fill confirmation alert: `✓ Filled X shares for Y arcs`.
  - [x] Migrated mode toggle tabs and budget headers from `By Points` to `By Arcs`.
  - [x] Replaced remaining cent references (`¢`) with `%` and updated zero balance warning to `0 Arcs Remaining`.
- [x] **9.2 Smart Arena Code Input & Fast Directory Jump**:
  - [x] `src/components/arena/join-arena.tsx`: Added auto-uppercase, alphanumeric sanitization, and input clear button.
  - [x] `src/components/arena-directory.tsx`: Added fast Enter key jump directly into tournament rooms by code and search clear button.
- [x] **9.3 Local to Supabase Database Synchronization (`scripts/sync-local-to-supabase.ts`)**:
  - [x] Built bidirectional data transfer script and added `npm run db:sync:supabase` script to `package.json`.

---

## Stage 10: Mobile Background Animation Visibility Fix
- [x] **10.1 Mobile DPR Coordinate Scaling (`src/components/ui/beams-background.tsx`)**:
  - [x] Fixed coordinate calculation to use CSS logical viewport dimensions (`window.innerWidth`, `window.innerHeight`) rather than physical pixels.
  - [x] Reset 2D transform matrix before scaling (`ctx.setTransform(1, 0, 0, 1, 0, 0)`), preventing compounding scale on resize.
  - [x] Capped `devicePixelRatio` at `2.0` for mobile GPU memory safety.
  - [x] Adjusted responsive canvas blur (`blur-[18px] md:blur-[28px]`) to prevent mobile Safari/Android texture drops.

---

## Stage 11: Dynamic Centering, Responsive AppShell, & Tournament Card Polish
- [x] **11.1 Global Responsive Layout (`src/components/app-shell.tsx`, `src/context/sidebar-context.tsx`)**:
  - [x] Created `SidebarProvider` and `useSidebar()` with persistent preference in `localStorage`.
  - [x] Created responsive `AppShell` that dynamically binds left margin to `collapsed ? 'md:ml-16' : 'md:ml-64'` with `transition-[margin] duration-300 ease-in-out` and `pt-16 md:pt-0` for mobile.
  - [x] Converted all core application routes to `AppShell`:
    - `src/app/analytics/page.tsx`
    - `src/app/arenas/page.tsx`
    - `src/app/markets/page.tsx`
    - `src/app/dashboard/page.tsx`
    - `src/app/admin/page.tsx`
    - `src/app/admin/arenas/new/page.tsx`
    - `src/app/admin/arenas/[id]/page.tsx`
    - `src/app/arenas/[code]/page.tsx`
    - `src/app/arenas/[code]/results/page.tsx`
    - `src/app/guide/page.tsx`
    - `src/app/info/page.tsx`
    - `src/app/not-found.tsx`
    - `src/components/arena/live-arena.tsx`
- [x] **11.2 Collapsed Sidebar Aesthetic Polish (`src/components/site-sidebar.tsx`)**:
  - [x] Fixed collapsed state padding: reduced to `md:px-2` and converted items into centered 40×40px square tiles (`w-10 h-10 p-0 justify-center mx-auto rounded-xl`).
  - [x] Eliminated squished green oval distortion on active tabs.
  - [x] Centered collapse/expand chevron and user avatar when collapsed.
- [x] **11.3 Tournament Analytics Card Normalization (`src/app/analytics/page.tsx`)**:
  - [x] Replaced multi-line wrapping textual badges (`R1: NO · WON ...`) with a compact, uniform round calibration strip (`flex items-center gap-1.5 h-4` with `h-2 rounded-full` indicators).
  - [x] Green for Won, Red for Miss, Neutral for Pending/Void with full hover tooltip information.
  - [x] Normalized card heights to a uniform geometry across all screen sizes.
