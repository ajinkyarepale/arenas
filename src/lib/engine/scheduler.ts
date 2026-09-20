import type { Event } from '@/generated/client';

import {
  endEvent,
  lockRound,
  openNextRound,
  resolveRound,
  twapWindowMs,
} from '@/lib/engine/round-engine';
import { evaluateLiquidityBot } from '@/lib/bot/liquidity-bot';
import { evaluateDemoRoom } from '@/lib/engine/demo-controller';
import { executeBotMicroTrade } from '@/lib/engine/bot-trader';
import { getPrice } from '@/lib/price/binance';
import { prisma } from '@/lib/prisma';
import { emitToArena } from '@/lib/realtime/bus';

/**
 * The scheduler drives every LIVE arena concurrently.
 *
 * It is deliberately stateless: each tick reads the current round straight from
 * the database and asks "what should have happened by now?". That means a
 * restart mid-event recovers on its own, and no in-memory timer can drift out
 * of sync with what participants actually see.
 *
 * Per-arena work is serialised by an in-process mutex, because resolving a
 * round blocks for several seconds while the closing TWAP is sampled and we
 * must not start a second pass over the same arena underneath it. Arenas do not
 * block each other.
 *
 * This assumes a single scheduler process. Running several would need a
 * database advisory lock per arena; the status guards in the engine would keep
 * things correct, but the duplicated work is pointless.
 */

const TICK_INTERVAL_MS = 1000;
const OPEN_RETRY_BACKOFF_MS = 3000;

interface SchedulerHandle {
  timer: NodeJS.Timeout;
  priceTimer: NodeJS.Timeout;
}

const globalForScheduler = globalThis as unknown as {
  __arenasScheduler?: SchedulerHandle;
};

/** Arenas currently being advanced, so ticks never overlap per arena. */
const inFlight = new Set<string>();
/** Backoff for arenas whose price feed is refusing to give an opening price. */
const openRetryAfter = new Map<string, number>();

async function advanceArena(event: Event, now: number): Promise<void> {
  // If the arena has reached its scheduled end time, end it cleanly.
  if (event.endsAt && now >= event.endsAt.getTime()) {
    await endEvent(event.id);
    return;
  }

  const round =
    event.currentRound > 0
      ? await prisma.round.findUnique({
          where: {
            eventId_roundNumber: { eventId: event.id, roundNumber: event.currentRound },
          },
        })
      : null;

  // Nothing open yet — start the first round (or the next one).
  if (!round) {
    await tryOpen(event, now);
    return;
  }

  if (round.status === 'TRADING' && round.locksAt && now >= round.locksAt.getTime()) {
    await lockRound(round.id);
  } else if (round.status === 'TRADING') {
    if (event.botsEnabled || event.enableBots) {
      void evaluateLiquidityBot(event.id, now);
      void executeBotMicroTrade(event.id, round.id, 2);
    }
    if (event.mode === 'DEMO' || event.demoStatus === 'ACTIVE' || event.demoStatus === 'RUNNING') {
      void evaluateDemoRoom(event.id);
    }
  }

  if (round.status !== 'RESOLVED' && round.resolvesAt) {
    // Start sampling the close so that settlement lands on the bell rather than
    // several seconds after it.
    const sampleFrom = round.resolvesAt.getTime() - twapWindowMs(event);
    if (now >= sampleFrom) {
      await resolveRound(round.id);
      // Resolution takes a few seconds; re-read before deciding what is next.
      const fresh = await prisma.event.findUnique({ where: { id: event.id } });
      if (fresh && fresh.status === 'LIVE') {
        await advanceAfterResolve(fresh);
      }
      return;
    }
  }

  if (round.status === 'RESOLVED') {
    await advanceAfterResolve(event);
  }
}

async function advanceAfterResolve(event: Event): Promise<void> {
  if (event.currentRound >= event.totalRounds) {
    await endEvent(event.id);
    return;
  }
  await tryOpen(event, Date.now());
}

async function tryOpen(event: Event, now: number): Promise<void> {
  const retryAt = openRetryAfter.get(event.id);
  if (retryAt && now < retryAt) return;

  const result = await openNextRound(event.id);
  if (!result.ok && result.reason === 'price-unavailable') {
    openRetryAfter.set(event.id, now + OPEN_RETRY_BACKOFF_MS);
  } else {
    openRetryAfter.delete(event.id);
  }
}

async function tick(): Promise<void> {
  const now = Date.now();

  const liveEvents = await prisma.event.findMany({
    where: { status: 'LIVE' },
  });

  await Promise.all(
    liveEvents.map(async (event: Event) => {
      if (inFlight.has(event.id)) return;
      inFlight.add(event.id);
      try {
        await advanceArena(event, now);
      } catch (error) {
        console.error(`[scheduler] arena ${event.code} failed to advance`, error);
      } finally {
        inFlight.delete(event.id);
      }
    }),
  );
}

/**
 * One shared price poll per distinct asset, fanned out to every arena trading
 * it. Participants never talk to Binance directly — a room of 200 phones each
 * polling would be rate-limited within seconds.
 */
async function pollPrices(): Promise<void> {
  const events = await prisma.event.findMany({
    where: { status: { in: ['LIVE', 'LOBBY'] } },
    select: { id: true, asset: true },
  });
  if (events.length === 0) return;

  const byAsset = new Map<string, string[]>();
  for (const event of events) {
    const list = byAsset.get(event.asset) ?? [];
    list.push(event.id);
    byAsset.set(event.asset, list);
  }

  await Promise.all(
    Array.from(byAsset.entries()).map(async ([asset, eventIds]) => {
      try {
        const tick = await getPrice(asset, 0);
        for (const eventId of eventIds) {
          emitToArena(eventId, 'price', {
            symbol: tick.symbol,
            price: tick.price,
            at: tick.at,
          });
        }
      } catch {
        // A missed poll is not fatal: the chart holds its last value and the
        // closing TWAP does its own sampling with its own failure handling.
      }
    }),
  );
}

function safeInterval(fn: () => Promise<void>, ms: number): NodeJS.Timeout {
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (error) {
      console.error('[scheduler] tick failed', error);
    } finally {
      running = false;
    }
  }, ms);
  // Do not hold the process open on its own account.
  timer.unref?.();
  return timer;
}

export function startScheduler(): void {
  if (globalForScheduler.__arenasScheduler) return;

  const priceIntervalMs = Math.max(
    250,
    Number(process.env.PRICE_POLL_INTERVAL_MS ?? 1000),
  );

  globalForScheduler.__arenasScheduler = {
    timer: safeInterval(tick, TICK_INTERVAL_MS),
    priceTimer: safeInterval(pollPrices, priceIntervalMs),
  };

  console.log(
    `[scheduler] running — rounds every ${TICK_INTERVAL_MS}ms, prices every ${priceIntervalMs}ms`,
  );
}

/**
 * Whether this process is the one advancing rounds.
 *
 * Exposed for the health endpoint: a machine that is serving pages but has no
 * scheduler is the failure mode that silently stalls an event, and it is not
 * visible from the outside without asking.
 */
export function isSchedulerRunning(): boolean {
  return Boolean(globalForScheduler.__arenasScheduler);
}

export function stopScheduler(): void {
  const handle = globalForScheduler.__arenasScheduler;
  if (!handle) return;
  clearInterval(handle.timer);
  clearInterval(handle.priceTimer);
  globalForScheduler.__arenasScheduler = undefined;
}
