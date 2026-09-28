# Arenas — Concurrent Trading Architecture Redesign

## Context

Arenas is a points-based live prediction market for college FinTech events.

Stack:

* Next.js 14
* Prisma + PostgreSQL
* Socket.io
* Custom `server.ts`
* Round scheduler
* LMSR-based market pricing
* Participants can buy/sell shares
* Live prices/graphs are pushed to clients
* Bots are currently being used ONLY as load/stress generators

The bots are **not actual product users** and they do not need special business priority.

Their purpose is to intentionally create noise, contention, and concurrent traffic so we can determine whether Arenas can handle many simultaneous users/trades.

I have an analysis file called `order_system_choke_analysis.md` describing the current trade flow and suspected choke points. Treat it as the starting point, but **verify every claim against the actual code before changing anything.**

---

# The actual goal

The goal is NOT:

> "Make bots slower."

The goal is NOT:

> "Give humans priority over bots."

The goal is:

> **Design Arenas so that many concurrent users can submit trades safely and the market remains correct, responsive, and consistent under heavy contention.**

For example, the system should eventually be able to handle scenarios such as:

```text
10 humans
50 bots
100 concurrent trade requests
```

or:

```text
50 humans
500 bot-generated trades
```

without:

* corrupting LMSR state
* losing trades
* overwriting concurrent trades
* producing incorrect balances/positions
* producing inconsistent prices
* causing humans to wait behind an unbounded bot queue
* causing Socket.io clients to diverge permanently
* producing random contention failures under normal load

Bots should therefore be treated as **load generators**, not as a special category of application user.

---

# Critical architectural principle

DO NOT simply remove the current trade lock.

The LMSR market state is inherently stateful.

If two trades modify the same market state simultaneously, both cannot safely calculate from the same old state and then overwrite each other.

For example:

```text
Current state:
qYES = 100

Trade A reads 100
Trade B reads 100

A calculates based on 100
B calculates based on 100

A writes 105
B writes 103
```

One state transition can effectively overwrite another.

We therefore still need **serialized/concurrency-safe market-state mutation**.

However, the current implementation may be serializing far too much.

The architectural objective is:

> **Serialize only the critical market-state transition, not the entire HTTP request lifecycle or unrelated work.**

---

# Desired conceptual architecture

Think about the system like this:

```text
                 MANY CONCURRENT CLIENTS
                         │
          ┌──────────────┼──────────────┐
          │              │              │
        Human          Human           Bot
        trade          trade           trade
          │              │              │
          └──────────────┼──────────────┘
                         ↓
                  REQUEST INGESTION
                         ↓
                  VALIDATE / AUTH
                         ↓
                   TRADE COMMAND
                         ↓
              ┌─────────────────────┐
              │    MARKET ENGINE    │
              │                     │
              │ Serialize ONLY the  │
              │ market state change │
              └──────────┬──────────┘
                         ↓
                 ATOMIC DB CHANGE
                         ↓
                  COMMIT SUCCESS
                         ↓
                  MARKET EVENT
                         ↓
                    Socket.io
                         ↓
             ALL CONNECTED CLIENTS
```

The important distinction is:

### Many things should remain concurrent:

* HTTP requests arriving
* authentication
* basic validation
* rate limiting
* reading non-critical data
* Socket.io connections
* frontend rendering
* leaderboard reads
* market graph reads
* price feed processing

### Only the necessary market mutation should be serialized:

```text
current market state
        ↓
calculate LMSR result
        ↓
calculate price/cost
        ↓
update market state
        ↓
create trade
        ↓
update position/balance/ledger
        ↓
commit
```

Keep this critical section as small as possible.

---

# DO NOT implement priority logic yet

Do NOT immediately create:

```text
human queue
bot queue
human priority
bot priority
```

That may eventually be useful as an overload protection mechanism, but it is NOT the first problem to solve.

First determine:

1. What exactly must be serialized for LMSR correctness?
2. What currently happens while holding `trade:{eventId}`?
3. Which operations actually require the lock?
4. Which operations can safely happen before the lock?
5. Which operations can safely happen after the transaction?
6. Which operations are unnecessarily extending lock duration?
7. Whether the current lock is in-memory only and what happens if there are multiple server processes/instances.
8. Whether PostgreSQL itself is already providing some of the required concurrency guarantees.

Only after answering those questions should we consider queueing or admission-control strategies.

---

# Current suspected problem

The current system appears to use something conceptually like:

```text
withKeyedLock("trade:{eventId}")
```

If that lock surrounds the entire trade operation, then:

```text
Bot 1 ─┐
Bot 2 ─┤
Bot 3 ─┤
...    ├──→ ONE ARENA LOCK → ONE TRADE AT A TIME
Bot N ─┤
Human ─┘
```

This can make the arena throughput equal to the processing speed of that one serialized critical section.

That is acceptable for the actual market-state mutation.

It is NOT acceptable if the lock also includes:

* unnecessary DB reads
* aggregations
* leaderboard calculations
* user lookups
* Socket.io work
* HTTP response work
* unrelated processing

We need to minimize the critical section.

---

# What I want you to do

## Phase 1 — Inspect before modifying

Do NOT modify code yet.

Inspect the actual implementation of:

* `src/lib/keyed-lock.ts`
* `src/lib/engine/trading.ts`
* `src/lib/lmsr.ts`
* `src/app/api/arenas/[code]/trade/route.ts`
* `server.ts`
* `src/lib/realtime/bus.ts`
* `src/lib/realtime/events.ts`
* `src/lib/rate-limit.ts` if present
* scheduler / round engine
* Prisma schema
* relevant indexes
* `live-arena.tsx`
* `trade-panel.tsx`
* any bot/evaluation code that submits trades

Also inspect the current transaction boundaries.

---

# Phase 2 — Produce a concurrency map

Before changing anything, document the actual current flow:

```text
HTTP request
   ↓
validation
   ↓
DB read
   ↓
lock acquisition
   ↓
transaction
   ↓
LMSR calculation
   ↓
position update
   ↓
ledger
   ↓
trade creation
   ↓
lock release
   ↓
aggregation
   ↓
socket event
   ↓
HTTP response
```

Replace this with the REAL flow from the code.

For every operation, classify it as:

### A — MUST be serialized

Required for market correctness.

### B — MUST be atomic but does not necessarily require the application lock

Potentially handled by PostgreSQL transaction/row locking/CAS/etc.

### C — Can happen concurrently

No reason to block other trades.

### D — Should happen asynchronously after commit

Does not need to delay the trade response.

---

# Phase 3 — Find the true critical section

Determine the smallest safe section required to transform:

```text
Market State N
```

into:

```text
Market State N+1
```

For example:

```text
READ CURRENT MARKET STATE
        ↓
CALCULATE LMSR
        ↓
VALIDATE FUNDS/SHARES
        ↓
WRITE NEW MARKET STATE
        ↓
WRITE POSITION
        ↓
WRITE LEDGER
        ↓
WRITE TRADE
        ↓
COMMIT
```

If some of these can be safely moved outside the lock without sacrificing correctness, explain exactly why.

If they cannot, explain why.

Do not guess.

---

# Phase 4 — Design the concurrent architecture

The target should conceptually become:

```text
                  CONCURRENT REQUESTS
                         │
                         ↓
                 request validation
                         │
                         ↓
                  TradeCommand
                         │
                         ↓
                MARKET EXECUTOR
                         │
              ┌──────────┴──────────┐
              │                     │
          Trade A                Trade B
              │                     │
              ↓                     │
       atomic state change          │
              │                     │
              └──────────┬──────────┘
                         ↓
                  committed event
                         ↓
                     Socket.io
```

The executor/serialization mechanism must guarantee:

```text
Trade A sees state after previous committed trade
Trade B sees state after Trade A
Trade C sees state after Trade B
```

while allowing the rest of the application to remain concurrent.

---

# Phase 5 — Preserve server authority

Frontend optimistic updates are allowed.

For example:

```text
User clicks BUY
     ↓
UI immediately animates expected price
     ↓
request sent
     ↓
server executes authoritative trade
     ↓
server broadcasts authoritative state
     ↓
client reconciles
```

But NEVER optimistically modify authoritative:

* points
* balance
* shares
* position
* ledger
* executed trade state

Those remain server-authoritative.

---

# Phase 6 — Introduce event sequencing

The live market should have a monotonically increasing sequence number.

For example:

```text
TRADE_EXECUTED
sequence = 101

TRADE_EXECUTED
sequence = 102

TRADE_EXECUTED
sequence = 103
```

Clients maintain:

```text
lastSequence = 102
```

If they receive:

```text
104
```

instead of:

```text
103
```

they know an event was missed.

The client should then be able to request/retrieve an authoritative snapshot and resynchronize.

This is important for a high-concurrency Socket.io system.

---

# Phase 7 — Separate workloads

Do not allow secondary workloads to unnecessarily compete with the trade critical path.

Investigate:

* leaderboard calculation
* round aggregation
* crowd graph aggregation
* user/name lookups
* price feed updates
* TWAP sampling
* bot evaluation
* Socket.io broadcasting

If these are not required to commit the trade, they should not unnecessarily extend the market mutation critical section.

---

# Phase 8 — Stress testing

After the architecture is understood and modified, create realistic load tests.

Test at least:

```text
10 concurrent traders
50 concurrent traders
100 concurrent traders
250 concurrent traders
500 concurrent traders
```

Then mixed workloads:

```text
10 humans + 100 bots
10 humans + 500 bots
50 humans + 500 bots
```

Bots should intentionally create noise.

Do NOT artificially give humans priority just to make the test look good.

The system should demonstrate that the architecture itself handles concurrency correctly.

Measure:

* requests/sec
* successful trades/sec
* p50 latency
* p95 latency
* p99 latency
* lock wait time
* transaction duration
* queue depth
* DB connection usage
* DB CPU/load if available
* Socket.io event throughput
* failed trades
* contention errors
* retries
* stale/missed events
* client reconciliation frequency

---

# Very important: distinguish throughput from correctness

A fast system that loses trades is broken.

A system that processes trades correctly but makes users wait several seconds under normal load also has a scalability problem.

We need BOTH:

### Correctness

```text
No lost trades
No double spending
No incorrect positions
No stale LMSR calculations
No overwritten market state
No impossible balances
```

### Performance

```text
Low queue wait
Short critical section
High trade throughput
Fast socket propagation
Responsive UI
```

---

# Do not blindly implement all suspected choke points

The file `order_system_choke_analysis.md` contains several suspected bottlenecks.

Treat them as hypotheses.

For each one, label:

```text
CONFIRMED
LIKELY
POSSIBLE
NOT ACTUALLY A PROBLEM
```

and show the exact code that proves the classification.

In particular, verify:

1. Whether the per-arena lock really serializes all trades.
2. How long the lock is actually held.
3. Whether bot traffic can starve other requests.
4. Whether cache misses actually cause expensive full-table scans.
5. Whether aggregation creates a stampede.
6. Whether leaderboard queries compete with trade transactions.
7. Whether TWAP sampling delays the scheduler.
8. Whether `refresh()` is still unnecessarily called after every trade.
9. Whether the price polling path duplicates WebSocket updates.
10. Whether the DB trade-count query is actually redundant with the in-memory limiter.

Do not make changes simply because the analysis file says something is a bottleneck.

---

# Most important question

Before writing code, answer this:

> **What is the smallest exact piece of Arenas that MUST be serialized to guarantee correct LMSR market-state transitions under concurrent trades?**

Then answer:

> **What can remain fully concurrent around that serialized section?**

That is the core architectural problem we are solving.

---

# Desired end state

I want Arenas to behave conceptually like this:

```text
             100s OF CONCURRENT USERS
                       │
                       ↓
                CONCURRENT INGESTION
                       │
                       ↓
                 TRADE COMMANDS
                       │
                       ↓
             ┌─────────────────────┐
             │    MARKET ENGINE    │
             │                     │
             │ serialized state    │
             │ transitions only   │
             └──────────┬──────────┘
                        ↓
                 ATOMIC COMMIT
                        ↓
                  MARKET EVENT
                        ↓
                   Socket.io
                        ↓
              ALL CONNECTED CLIENTS
```

The system should NOT become:

```text
100 users
   ↓
ONE HUGE LOCK
   ↓
EVERYTHING WAITS
```

And it should NOT become:

```text
100 users
   ↓
NO SERIALIZATION
   ↓
CORRUPTED MARKET STATE
```

The target is the middle:

> **Concurrent system + serialized market-state transitions + atomic persistence + real-time event propagation.**

Do the analysis first. Show me the current critical section, the proposed critical section, and the exact files/functions that need changing.

**Do not start by coding.**
