# Arenas

A multi-tenant platform for running live prediction market tournaments at college FinTech events.

The flagship format is **5-Min Candle**: participants trade virtual points on whether a crypto asset's candle closes above or below where it opened, priced by an LMSR automated market maker. Any organizer can create their own arena with its own join code, timing and participants, and several arenas can run simultaneously and independently on one deployment.

Points are virtual and have no cash value. There is no deposit, withdrawal, or payment processing anywhere in the system.

---

## Quick start

You need Node 18.18+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env
```

Set `NEXTAUTH_SECRET` in `.env` to a long random string:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Get a database

**No Docker?** A real Postgres is bundled for development. Run this in its own terminal and leave it running:

```bash
npm run db:dev
```

**Have Docker?**

```bash
docker compose up -d
```

Either way, the default `DATABASE_URL` in `.env.example` already points at it.

### Create the schema and start

```bash
npm run db:push
npm run db:seed
npm run dev
```

Open <http://localhost:3000>.

The seed creates two demo arenas and a set of accounts:

| Account | Password | Role |
| --- | --- | --- |
| `organizer@arenas.dev` | `arenas-demo-2024` | Organizer |
| `ada.chen@arenas.dev` (and 7 others) | `arenas-demo-2024` | Participant |

Demo arenas: **DEMO24** (open, ready to start) and **RECAP7** (finished, with full results).

---

## Running an event

1. Sign in as an organizer and go to **/admin → New arena**. Pick the asset, round length, number of rounds, starting balance and liquidity.
2. Share the join code (or the join link) with the room. Only people with the code can enter.
3. Open **/arenas/{CODE}/screen** on the projector. It needs no login and has no controls.
4. Press **Start session** in the control panel. Rounds then open, lock, settle and advance on their own.
5. Participants open **/arenas/{CODE}** on their phones, join, and trade.

Point people at **/guide** beforehand — it is written so nothing needs explaining in the room.

If the price feed fails mid-round, the control panel can force-resolve or void the round. Voiding refunds every trade in it.

---

## How it works

### LMSR pricing

Each round is a fresh binary market over `qYes` / `qNo`, priced by Hanson's Logarithmic Market Scoring Rule:

```
C(q)   = b · ln( e^(qYes/b) + e^(qNo/b) )
p(YES) = e^(qYes/b) / ( e^(qYes/b) + e^(qNo/b) )
```

A trade costs `C(after) − C(before)`. Every share pays 1 point if its side wins and 0 if it loses, so the price sits in (0, 1) and reads directly as an implied probability.

`b` is the liquidity parameter. Low `b` means trades visibly move the price, which is the whole point on a projector — the default of 40 makes a 50-point trade move the market about 20 points of probability. It also bounds the house: the market maker can subsidise at most `b · ln(2)` points per round.

Everything lives in [`src/lib/lmsr.ts`](src/lib/lmsr.ts) as a pure, dependency-free module. It is written for numerical stability (log-sum-exp, `log1p`, a stable logistic) so it does not overflow at high volume, and the cost function is inverted in closed form so a participant can stake in points rather than shares.

### Round lifecycle

```
PENDING ──open──▶ TRADING ──lock──▶ LOCKED ──resolve──▶ RESOLVED
```

1. **Open** — record the asset price as the strike, reset the book to 50/50.
2. **Trade** — fills update the book and broadcast a new price to every screen.
3. **Lock** — `lockBufferSec` before the close, trading stops.
4. **Resolve** — the close is a short TWAP (several samples, averaged), never a single tick. Strictly above the strike is YES; equal or below is NO. If the feed cannot produce usable data the round is VOID.
5. **Settle** — winning shares pay 1 point each, VOID refunds cost in full, balances and leaderboard update.
6. **Next** — the following round opens immediately, or the arena ends.

The scheduler ([`src/lib/engine/scheduler.ts`](src/lib/engine/scheduler.ts)) is stateless: every tick reads the current round from the database and asks what should have happened by now. A restart mid-event recovers on its own. Each arena is advanced independently.

### Concurrency

Two people tapping BUY at the same instant must not both be quoted the same price against the same book. Trades are:

- **serialised per arena** by an in-process async mutex, so a room tapping at once queues instead of colliding, and
- **guarded by a compare-and-set** on `(qYes, qNo)` inside the transaction, which is the actual correctness boundary and still holds if this is ever run as multiple processes.

Without the mutex, most simultaneous orders lose the CAS race and come back as "the market moved" — measured at 43 rejections out of 50 concurrent trades before it was added, and 0 after.

### Realtime

A custom server ([`server.ts`](server.ts)) hosts Next.js, Socket.io and the scheduler in one process, so a route handler that fills a trade can broadcast the new price with no queue in between.

Only public arena data goes over the socket — prices, implied probability, round state, leaderboard. Private state (your balance, your position) is fetched over authenticated HTTP. That is what lets the projector route subscribe without any login.

**The socket is an accelerator, never the source of truth.** Every screen can rebuild itself from `GET /api/arenas/{code}/state`, and does so on mount, on every reconnect, when the tab becomes visible, on a bfcache restore, when the network returns, and whenever a round settles. This is aimed at iOS Safari: a locked phone suspends timers and silently drops the websocket, so rather than replaying missed messages we ask the server what is true now — correct no matter how long the phone slept.

---

## Cross-platform

One responsive codebase, no native apps. Verified at 360, 375, 430, 768 and 1280px.

- **Trading screen is mobile-first.** On a phone the order is deliberately: the two numbers people stare at, then the trade controls, then the chart — the buy buttons sit fully inside the first viewport so nobody scrolls past a chart with twenty seconds left. On desktop the chart takes the wide column and the trade panel sits beside it.
- **Tap targets** clear 44px everywhere. The buy buttons are 157×119 on a 375px phone.
- **No hover-dependent interactions** anywhere.
- **PWA-lite**: web app manifest plus generated icons, so the trading screen can be added to a home screen. Regenerate with `npm run icons`.
- **Safe-area handling** for notched iOS devices, `viewport-fit=cover` with explicit insets, and 16px input fonts so iOS does not zoom on focus. Zoom stays enabled.
- **Big screen is desktop/TV-first** — 115px probability, 166px countdown, zero interactive controls.

---

## Security

- Passwords are bcrypt-hashed at cost factor 12, never logged and never returned by any endpoint.
- Every state-changing route checks the session server-side via `getServerSession`. Middleware gating is treated as a convenience layer, and every admin route re-checks the role independently.
- Organizers can only see and control their own arenas; another organizer's arena returns 404 rather than 403, so IDs cannot be probed. Verified end-to-end.
- Every API input is validated with zod. Malformed JSON, negative stakes, wrong enums and out-of-range values are rejected at the edge with field-level errors.
- Join codes are random, drawn from an alphabet with no ambiguous characters (no `0/O`, no `1/I/L`), and join attempts are rate-limited. The code is a door, not a vault — the intended control is that the organizer hands it to the people in the room.
- Trades are rate-limited per user per round, with a per-round budget and a minimum interval.

---

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start Next.js + Socket.io + scheduler |
| `npm run build` / `npm start` | Production build and serve |
| `npm test` | Unit tests (LMSR maths, keyed lock) |
| `npm run verify:engine` | End-to-end engine checks against a real database |
| `npm run typecheck` | TypeScript, no emit |
| `npm run db:dev` | Local Postgres without Docker |
| `npm run db:push` / `db:seed` / `db:studio` | Schema, seed data, Prisma Studio |
| `npm run db:reset-demo` | Delete test arenas, keep the seeded demo |
| `npm run icons` | Regenerate PWA icons |

### Tests

`npm test` covers the LMSR module in isolation — the cost function against a naive reference, stability where the naive form overflows, price as the derivative of cost, path independence, the closed-form inverse round-tripping against `costOfShares`, and the `b·ln(2)` house-risk bound.

`npm run verify:engine` needs a database and covers what only breaks with Postgres and concurrency involved: 50 simultaneous trades leaving the book exactly consistent with the shares issued, points collected equalling `C(after) − C(before)` to the cent, settlement paying 1 point per winning share, VOID refunding exactly, double-settlement being a no-op, and the trading guards.

---

## Deployment

**[DEPLOY.md](DEPLOY.md) is the full walkthrough** — Supabase for Postgres and Northflank for the app, both free and neither sleeping, with Fly.io and Render covered as alternatives. A `Dockerfile` and `fly.toml` are included and the initial migration is committed under `prisma/migrations/`.

The constraints behind that guide:

- **Requires a persistent Node process.** The custom server hosts the websocket layer and the round scheduler, so this does not run on a serverless platform (Vercel, Netlify) as-is.
- **Run one instance.** The scheduler, the per-arena trade mutex and the rate limiter are all in-process. The engine's status guards keep things correct if several run, but the duplicated work is pointless and the rate limits get split. Scaling horizontally would need a database advisory lock per arena and Redis-backed limits.
- **Do not let it sleep.** Rounds advance on a timer, so an instance that scales to zero stalls a running arena. `fly.toml` sets `auto_stop_machines = false` for exactly this reason.
- Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL`, and point `DATABASE_URL` at managed Postgres. Use `prisma migrate deploy` rather than `db push`.
- `BINANCE_REST_BASE` can be repointed if the default endpoint is unavailable from your region.

### A note on the Next.js version

This is pinned to `next@14.2.35`, the latest patched release of the 14 line, as specified. `npm audit` still reports advisories against that line whose only fix is Next 16, a major upgrade. The relevant ones concern Server Actions and rewrites, neither of which this app uses — it uses route handlers and no rewrites — but if you plan to run this publicly for an extended period, upgrading to Next 16 is worth scheduling.

---

## Project layout

```
server.ts                     Custom server: Next + Socket.io + scheduler
prisma/schema.prisma          Data model; every arena isolated by Event id
src/lib/lmsr.ts               Pure LMSR module (tested in isolation)
src/lib/engine/
  round-engine.ts             Round state machine, settlement, leaderboard
  scheduler.ts                Stateless tick loop driving every live arena
  trading.ts                  Trade placement, serialisation, CAS guard
  snapshot.ts                 The authoritative state every screen rebuilds from
src/lib/realtime/             Socket contract and broadcast bridge
src/lib/price/binance.ts      Cached price feed and closing TWAP
src/hooks/use-arena.ts        Client realtime + reconnect/resync handling
src/app/                      Routes (public, participant, organizer, projector)
src/components/arena/         Trading screen, projector view, chart, leaderboard
```
