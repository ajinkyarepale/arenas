# ARENAS — Comprehensive Project Context & Architecture Specification

> **A High-Frequency, Polymarket-Style Campus Prediction Market Engine**  
> *Automated Market Making (LMSR) · Real-Time Crypto Price Oracles · Financial Charting · Multi-Round Tournaments*

---

## 1. Project Overview & Philosophy

**Arenas** is an open-source, full-stack prediction market platform designed for campus trading competitions, hackathons, and quantitative finance clubs. It allows hundreds of participants in a room to trade binary outcome shares (**YES** vs **NO**) on live cryptocurrency price action (e.g., *“Will BTC/USDT close higher in the next 5 minutes?”*) in rapid, sequential rounds.

### Core Pillars:
1. **Polymarket Automated Market Maker (LMSR)**:
   - Pricing and liquidity are completely automated via Robin Hanson’s **Logarithmic Market Scoring Rule (LMSR)**.
   - Guaranteed continuous liquidity: participants can buy or sell YES/NO shares instantaneously without needing an exact counterparty order.
2. **Automated Oracle Resolution**:
   - Zero manual outcome tampering. Outcomes are settled 100% automatically against Binance spot price feeds (TWAP / closing price of the 5-minute candle vs opening strike price).
3. **Multi-Round Tournament Structure**:
   - Each Arena consists of multiple sequential rounds (e.g., 12 rounds of 5 minutes each).
   - Participants start with an allocated balance (e.g., 1,000 points) and compete for the top spot on the live leaderboard.
4. **TradingView-Grade Financial Aesthetics**:
   - Built on a dark glassmorphic design system (`#131313`, `#201f1f`, `#27272A`, `#22C55E` green, `#EF4444` red).
   - High-performance GPU canvas charting via `lightweight-charts`.
5. **Zero Mock Data Principle**:
   - Every graph, price tick, position, and leaderboard entry is computed from real database records and live WebSocket oracle feeds.

---

## 2. Technology Stack

- **Framework**: Next.js 14 (App Router, Server Components & Route Handlers)
- **Language**: TypeScript (strict type checking across client & server)
- **Database & ORM**: PostgreSQL via Prisma ORM (custom client generated at `src/generated/client` to avoid Windows DLL locks)
- **Authentication**: NextAuth.js (JWT session strategy, bcrypt work factor 12)
- **Financial Charting**: `lightweight-charts` (TradingView Canvas engine for Candlesticks, Area curves, and OHLC volume bars)
- **Real-Time Communication**: Server-Sent Events (SSE) & WebSocket price subscriptions
- **Styling**: Tailwind CSS with custom fonts (`Geist` for headers/UI, `Epilogue` for metadata/badges)
- **Validation**: Zod (all API requests and mutations strictly validated)
- **Testing**: Vitest (unit tests for LMSR math, concurrency locks, and round transitions)

---

## 3. Mathematical Engine: Logarithmic Market Scoring Rule (LMSR)

### 3.1 Cost Function
Total market cost given share quantities $q_{\text{YES}}$ and $q_{\text{NO}}$ with liquidity parameter $b$:
$$C(q_{\text{YES}}, q_{\text{NO}}) = b \cdot \ln\left(e^{q_{\text{YES}}/b} + e^{q_{\text{NO}}/b}\right)$$

### 3.2 Implied Probability / Spot Price
The marginal price of a YES share is the partial derivative of the cost function:
$$p(\text{YES}) = \frac{\partial C}{\partial q_{\text{YES}}} = \frac{e^{q_{\text{YES}}/b}}{e^{q_{\text{YES}}/b} + e^{q_{\text{NO}}/b}} = \frac{1}{1 + e^{-(q_{\text{YES}} - q_{\text{NO}})/b}}$$
$$p(\text{NO}) = 1 - p(\text{YES}) = \frac{e^{q_{\text{NO}}/b}}{e^{q_{\text{YES}}/b} + e^{q_{\text{NO}}/b}}$$

### 3.3 Trade Execution & Cost Calculation
When a participant purchases $\Delta q$ shares of YES:
$$\text{Cost} = C(q_{\text{YES}} + \Delta q, q_{\text{NO}}) - C(q_{\text{YES}}, q_{\text{NO}})$$
- Implemented with numerical stability techniques in `src/lib/lmsr.ts` to prevent float overflow when $q/b > 700$.

### 3.4 Payout & Settlement
- Winning outcome shares pay out **1 point** per share (or 100 points per full unit depending on scaling).
- Losing outcome shares expire worthless (**0 points**).
- In case of exchange feed outage or round invalidation, the outcome is marked `VOID` and all participant costs are 100% refunded.

---

## 4. System Architecture & Flow

```
+-----------------------------------------------------------------------------------+
|                                 USER / CLIENT                                     |
|  +-----------------------+  +----------------------+  +------------------------+  |
|  |   Participant Mobile  |  |   Big-Screen Display |  | Organizer Admin Panel  |  |
|  +-----------------------+  +----------------------+  +------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTP / SSE / WS
+------------------------------------------v----------------------------------------+
|                               NEXT.JS APP ROUTER                                  |
|  +------------------------------------------------------------------------------+ |
|  | Route Handlers (/api/arenas, /api/admin, /api/auth, /api/events/[code]/sse)  | |
|  +------------------------------------------------------------------------------+ |
+---------------------+---------------------------------------+---------------------+
                      |                                       |
+---------------------v---------------+       +---------------v---------------------+
|       CENTRALIZED ENGINE LAYER      |       |      ORACLE & PRICE FEED (BINANCE)  |
| - Round Engine (State machine)      |       | - 5-min candle stream               |
| - LMSR Market Maker                 |       | - Live WebSocket ticks              |
| - Keyed Concurrency Lock            |       | - Strike Price & TWAP Capture       |
| - Submission Rate Limiter           |       +-------------------------------------+
+---------------------+---------------+
                      |
+---------------------v---------------+
|        PRISMA / POSTGRESQL          |
| - Users, Accounts, Sessions         |
| - Events, Participants, Rounds      |
| - Trades & Positions                |
+-------------------------------------+
```

---

## 5. Domain Models & Database Schema

### 5.1 Entities (`prisma/schema.prisma`)
1. **`User`**:
   - `id`, `name`, `email`, `passwordHash`, `role` (`SUPERADMIN`, `ADMIN`, `ORGANIZER`, `PARTICIPANT`), `status` (`ACTIVE`, `SUSPENDED`), timestamps.
2. **`Event` (Arena)**:
   - `code` (e.g. `AR-M64N`), `name`, `asset` (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`), `status` (`DRAFT`, `LOBBY`, `LIVE`, `ENDED`), `totalRounds` (default 12), `roundDurationSec` (default 300), `startingBalance` (default 1000), `liquidityParamB` (default 40), `tradesPerMinuteLimit` (0 = No limit, or 5..60), `organizerId`.
3. **`EventParticipant`**:
   - `eventId`, `userId`, `balance` (current spendable points), `joinedAt`.
4. **`Round`**:
   - `eventId`, `roundNumber`, `openPrice` (strike price locked at round open), `closePrice` (settlement price at round close), `status` (`PENDING`, `TRADING`, `LOCKED`, `RESOLVED`), `outcome` (`YES`, `NO`, `VOID`), `qYes`, `qNo`, `opensAt`, `locksAt`, `resolvesAt`.
5. **`Trade`**:
   - `id`, `eventId`, `roundId`, `userId`, `participantId`, `side` (`YES`, `NO`), `shares`, `cost`, `priceAtFill`, `payout`, `settledAt`, `createdAt`.

---

## 6. Key Features & Modules

### 6.1 Participant Experience (`/arenas/[code]`)
- **Join Tournament**: Enter short join code (e.g. `AR-M64N`) or scan QR code. Automatically creates participant wallet with starting points.
- **Live Trading View**:
  - **Binance Candlestick Chart**: Real-time spot price vs open strike reference line.
  - **YES / NO Crowd Graph**: Native TradingView canvas with **Line Graph** and **Bar Graph (OHLC Candlesticks)** toggle, showing cumulative crowd stake distribution and probability trends.
  - **Trade Panel**:
    - Select outcome (`YES` / `NO`).
    - Select stake amount (Quick chips: 50, 100, 250, Max, or custom input).
    - Real-time payoff calculator showing shares received, average price, and max payout.
    - Zero-balance protection: Disabled immediately when `balance <= 0`.
    - Submission rate limiting: Enforced per organizer rule (e.g. 10 trades/min).
  - **Positions Table**: Live view of held YES/NO shares, average cost basis, total invested points, and potential winnings.
  - **Live Leaderboard & Order Tape**: Real-time rank, balance, and incoming trade stream.

### 6.2 Organizer / Admin Panel (`/admin`, `/admin/arenas/[id]`)
- **Create Arena**: Configure Asset (`BTC`, `ETH`, `SOL`), total rounds, round duration, starting points, liquidity parameter $b$.
- **Control Panel**:
  - **Submission Rule Configuration**: Dropdown before Round 1 (`No Limit (while balance > 0)`, `5/min`, `10/min`, `15/min`, `20/min`, `30/min`, `60/min`).
  - **Tournament Controls**: Start Tournament (`LOBBY` $\rightarrow$ `LIVE`), Pause/Resume, End Tournament.
  - **Participant Management**: Live attendee list, balances, trade count, and one-click remove/eject.
  - **QR Code & Display Launcher**: One-click launcher for the auditorium projector screen.

### 6.3 Big Screen Projector View (`/arenas/[code]/screen`)
- Read-only, unauthenticated full-screen view optimized for auditorium wall displays.
- High-visibility countdown timer, live implied probability meter (`Chance it closes UP`), spot price chart, and podium leaderboard.

### 6.4 Market Catalog & Profile Dashboard (`/markets`, `/dashboard`)
- Search, filter by status (`Live now`, `Upcoming`, `Finished`), and share arenas.
- Personal trade history, net PnL statistics, win rate, and tournament standings.

---

## 7. Security & Authorization Model (RBAC)

1. **Role Hierarchy**:
   - `SUPERADMIN`: Global unrestricted access across all arenas, users, and settings.
   - `ADMIN`: Granular administrative permissions.
   - `ORGANIZER`: Scoped strictly to tournaments they own (`event.organizerId === user.id`).
   - `PARTICIPANT`: Read-only access to joined arenas and trade submissions when balance $> 0$.
2. **Concurrency & Double-Spend Protection**:
   - `withKeyedLock(participantId)` in `src/lib/keyed-lock.ts` prevents race conditions from simultaneous trade requests.
   - Atomic database transactions ensure balance checks, share minting, and point deductions occur synchronously.

---

## 8. Directory & File Structure

```
Arena/
├── prisma/
│   └── schema.prisma              # PostgreSQL schema & relationships
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── admin/                 # Admin & organizer management routes
│   │   │   ├── arenas/[id]/page.tsx # Arena Control Panel
│   │   │   ├── arenas/new/page.tsx  # Create Arena form
│   │   │   └── page.tsx           # Organizer arenas dashboard
│   │   ├── api/                   # Backend REST & SSE APIs
│   │   │   ├── admin/             # Organizer control APIs
│   │   │   ├── arenas/            # Public catalog & trade APIs
│   │   │   └── auth/              # NextAuth endpoints
│   │   ├── arenas/                # Participant routes
│   │   │   ├── [code]/page.tsx    # Join gatekeeper / lobby
│   │   │   ├── [code]/live/page.tsx # Live trading arena
│   │   │   ├── [code]/results/page.tsx # Post-tournament podium
│   │   │   └── [code]/screen/page.tsx  # Big-screen projector display
│   │   ├── dashboard/page.tsx     # User profile, PnL & trade history
│   │   ├── guide/page.tsx         # LMSR math & documentation
│   │   ├── info/page.tsx          # About Arenas platform
│   │   ├── markets/page.tsx       # Arena discovery catalog
│   │   ├── signin/page.tsx        # Authentication sign-in
│   │   └── signup/page.tsx        # Authentication sign-up
│   ├── components/                # React Components
│   │   ├── admin/                 # ArenaControl, CreateArenaForm
│   │   ├── arena/                 # LiveArena, CrowdGraph, CandleChart,
│   │   │                          # TradePanel, RoundTimer, Leaderboard,
│   │   │                          # BigScreen, ArenaShareModal
│   │   ├── arena-directory.tsx    # Catalog filter & cards
│   │   ├── auth-forms.tsx         # Sign in / sign up forms
│   │   └── site-sidebar.tsx       # Mobile-responsive slide-out navigation
│   ├── generated/client/          # Custom Prisma client output directory
│   ├── hooks/                     # Custom hooks (useArena, useSSE)
│   └── lib/                       # Core engine logic
│       ├── engine/                # round-engine.ts, trading.ts, snapshot.ts
│       ├── lmsr.ts                # LMSR math & numerical stability
│       ├── keyed-lock.ts          # Concurrency lock
│       ├── prisma.ts              # Database singleton
│       ├── auth.ts                # NextAuth options & role helpers
│       ├── validation.ts          # Zod validation schemas
│       └── format.ts              # Currency, points & probability formatters
├── context.md                     # Complete project context specification
└── package.json                   # Dependencies & scripts
```

---

## 9. Development & Verification Commands

```bash
# Start Next.js development server
npm run dev

# Start local PostgreSQL database container
npm run db:dev

# Push Prisma schema changes to database
npx prisma db push

# Generate Prisma Client to src/generated/client
npx prisma generate

# Run TypeScript typecheck (zero errors standard)
npm run typecheck

# Run full Vitest test suite (46 unit tests)
npm test
```

---

## 10. Summary for AI & LLM Assistants

When generating or refactoring code for **Arenas**:
1. **Preserve the Polymarket Concept**: Resolution is 100% automated via Binance price feeds. Do not add manual outcome resolution options for organizers.
2. **Preserve Dark Obsidian Aesthetics**: Use `#131313`, `[rgba(20,20,20,0.7)]`, `#27272A`, `#22C55E`, `Geist`, and `Epilogue`.
3. **Ensure Mobile Responsiveness**: All layouts must support mobile drawer navigation (`SiteSidebar`) with `pt-16 md:pt-0` and touch-friendly controls.
4. **Use Lightweight Charts for Visualizations**: Utilize native `lightweight-charts` canvas instances for financial charts with both Bar (Candlestick) and Line (Area) modes.
5. **No Mock Data**: Always fetch and mutate real records via Prisma models and API endpoints.
