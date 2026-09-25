import type { Event, Prisma, Round } from '@prisma/client';

import { priceYes as lmsrPriceYes, payoutForTrade } from '@/lib/lmsr';
import { getPrice, sampleTwap } from '@/lib/price/binance';
import { prisma } from '@/lib/prisma';
import { emitToArena } from '@/lib/realtime/bus';
import type {
  LeaderboardEntry,
  LeaderboardPayload,
  RoundPayload,
} from '@/lib/realtime/events';
import { clearRateLimit } from '@/lib/rate-limit';

/**
 * The round state machine.
 *
 *   PENDING ──open──▶ TRADING ──lock──▶ LOCKED ──resolve──▶ RESOLVED
 *
 * Every transition is written with a guard on the current status, so a
 * duplicate scheduler tick, a retry, or an organizer clicking twice cannot
 * double-open or double-settle a round. Settlement in particular runs inside a
 * transaction that pays out and flips the status together.
 */

export interface RoundTimings {
  opensAt: Date;
  locksAt: Date;
  resolvesAt: Date;
}

/**
 * How long before the bell we start sampling the closing price. Sampling the
 * final seconds (rather than the seconds after) means the round resolves right
 * on schedule instead of drifting later every round. Trading is already locked
 * throughout this window, so nobody can trade against the sampling.
 */
export function twapWindowMs(event: Pick<Event, 'lockBufferSec'>): number {
  const samples = Math.max(1, Math.min(Number(process.env.TWAP_SAMPLES ?? 6), 20));
  const interval = Math.max(200, Number(process.env.TWAP_INTERVAL_MS ?? 1000));
  const desired = samples * interval;
  // Never sample into the trading window.
  const available = Math.max(1000, event.lockBufferSec * 1000 - 500);
  return Math.min(desired, available);
}

export function computeTimings(event: Event, from = new Date()): RoundTimings {
  const opensAt = from;
  const durationMs = event.roundDurationSec * 1000;
  const lockMs = Math.min(event.lockBufferSec * 1000, durationMs - 1000);
  return {
    opensAt,
    locksAt: new Date(opensAt.getTime() + durationMs - lockMs),
    resolvesAt: new Date(opensAt.getTime() + durationMs),
  };
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

export interface RoundAggregate {
  volume: number;
  tradeCount: number;
}

export async function aggregateRound(roundId: string): Promise<RoundAggregate> {
  const result = await prisma.trade.aggregate({
    where: { roundId },
    _sum: { cost: true },
    _count: { _all: true },
  });
  return {
    volume: result._sum.cost ?? 0,
    tradeCount: result._count._all ?? 0,
  };
}

export function buildRoundPayload(
  event: Event,
  round: Round,
  aggregate: RoundAggregate,
): RoundPayload {
  return {
    id: round.id,
    roundNumber: round.roundNumber,
    totalRounds: event.totalRounds,
    status: round.status,
    openPrice: round.openPrice,
    closePrice: round.closePrice,
    outcome: round.outcome,
    priceYes: lmsrPriceYes({ qYes: round.qYes, qNo: round.qNo }, event.liquidityParamB),
    qYes: round.qYes,
    qNo: round.qNo,
    volume: aggregate.volume,
    tradeCount: aggregate.tradeCount,
    opensAt: round.opensAt?.toISOString() ?? null,
    locksAt: round.locksAt?.toISOString() ?? null,
    resolvesAt: round.resolvesAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
  };
}

export async function broadcastRound(event: Event, round: Round): Promise<void> {
  const aggregate = await aggregateRound(round.id);
  emitToArena(event.id, 'round', buildRoundPayload(event, round, aggregate));
}

export function broadcastArenaState(event: Event): void {
  emitToArena(event.id, 'arena', {
    status: event.status,
    currentRound: event.currentRound,
    totalRounds: event.totalRounds,
    endedAt: event.endsAt?.toISOString() ?? null,
  });
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/**
 * Previous ranks, per arena, so the big screen can show rank-change arrows.
 * Purely presentational — losing it on restart costs one round of arrows, so
 * it is deliberately not persisted.
 */
const previousRanks = new Map<string, Map<string, number>>();

export interface LeaderboardOptions {
  limit?: number;
  /** Recompute the "since last round" arrows from this snapshot. */
  commitRanks?: boolean;
}

export async function computeLeaderboard(
  eventId: string,
  options: LeaderboardOptions = {},
): Promise<LeaderboardPayload> {
  const { limit, commitRanks = false } = options;

  const participants = await prisma.eventParticipant.findMany({
    where: { eventId },
    orderBy: [{ balance: 'desc' }, { joinedAt: 'asc' }],
    select: {
      id: true,
      balance: true,
      user: { select: { name: true } },
    },
  });

  // Points won or lost on the most recently resolved round.
  const lastResolved = await prisma.round.findFirst({
    where: { eventId, status: 'RESOLVED' },
    orderBy: { roundNumber: 'desc' },
    select: { id: true },
  });

  const pnlByParticipant = new Map<string, number>();
  if (lastResolved) {
    const trades = await prisma.trade.findMany({
      where: { roundId: lastResolved.id },
      select: { participantId: true, cost: true, payout: true },
    });
    for (const trade of trades) {
      const current = pnlByParticipant.get(trade.participantId) ?? 0;
      pnlByParticipant.set(trade.participantId, current + ((trade.payout ?? 0) - trade.cost));
    }
  }

  const prior = previousRanks.get(eventId) ?? new Map<string, number>();
  const nextRanks = new Map<string, number>();

  const entries: LeaderboardEntry[] = participants.map((participant, index) => {
    const rank = index + 1;
    nextRanks.set(participant.id, rank);
    const wasRanked = prior.get(participant.id);
    return {
      participantId: participant.id,
      displayName: participant.user.name,
      balance: participant.balance,
      rank,
      rankDelta: wasRanked === undefined ? 0 : wasRanked - rank,
      lastRoundPnl: pnlByParticipant.get(participant.id) ?? 0,
    };
  });

  if (commitRanks) {
    previousRanks.set(eventId, nextRanks);
  }

  return {
    entries: typeof limit === 'number' ? entries.slice(0, limit) : entries,
    participantCount: participants.length,
    updatedAt: new Date().toISOString(),
  };
}

export async function broadcastLeaderboard(
  eventId: string,
  options: LeaderboardOptions = {},
): Promise<void> {
  const payload = await computeLeaderboard(eventId, options);
  emitToArena(eventId, 'leaderboard', payload);
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export type OpenResult =
  | { ok: true; round: Round }
  | { ok: false; reason: 'price-unavailable' | 'complete' | 'not-live' };

/**
 * Open the next round: snapshot the asset price as the strike, reset the LMSR
 * book to 50/50, and start the trading window.
 */
export async function openNextRound(eventId: string): Promise<OpenResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'LIVE') return { ok: false, reason: 'not-live' };

  if (event.currentRound >= event.totalRounds) {
    await endEvent(eventId);
    return { ok: false, reason: 'complete' };
  }

  // The strike. Without it there is nothing to resolve against, so we refuse to
  // open and let the scheduler retry on the next tick.
  let openPrice: number;
  try {
    const tick = await getPrice(event.asset, 0);
    openPrice = tick.price;
  } catch (error) {
    console.error(`[engine] cannot open round for ${event.code}: price unavailable`, error);
    return { ok: false, reason: 'price-unavailable' };
  }

  const roundNumber = event.currentRound + 1;
  const timings = computeTimings(event);

  const round = await prisma.round.upsert({
    where: { eventId_roundNumber: { eventId, roundNumber } },
    create: {
      eventId,
      roundNumber,
      openPrice,
      status: 'TRADING',
      qYes: 0,
      qNo: 0,
      ...timings,
    },
    update: {
      openPrice,
      status: 'TRADING',
      qYes: 0,
      qNo: 0,
      closePrice: null,
      outcome: null,
      voidReason: null,
      resolvedAt: null,
      ...timings,
    },
  });

  const updatedEvent = await prisma.event.update({
    where: { id: eventId },
    data: { currentRound: roundNumber },
  });

  // A fresh round means a fresh trade budget.
  clearRateLimit(`trade:${eventId}:`);

  await broadcastRound(updatedEvent, round);
  broadcastArenaState(updatedEvent);
  await broadcastLeaderboard(eventId);

  return { ok: true, round };
}

/** Close the trading window. Guarded so a repeated tick is harmless. */
export async function lockRound(roundId: string): Promise<boolean> {
  const updated = await prisma.round.updateMany({
    where: { id: roundId, status: 'TRADING' },
    data: { status: 'LOCKED' },
  });
  if (updated.count === 0) return false;

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { event: true },
  });
  if (round) await broadcastRound(round.event, round);
  return true;
}

export interface ResolveOptions {
  /** Organizer override when the feed has failed. Skips price sampling. */
  forcedOutcome?: 'YES' | 'NO' | 'VOID';
  reason?: string;
}

/**
 * Resolve and settle a round.
 *
 * The close is a short TWAP, never a single tick. Strictly greater than the
 * open resolves YES; equal or lower resolves NO — a flat close is not a win for
 * YES. If the feed cannot produce usable data the round is VOID and every trade
 * is refunded in full, which is always preferable to inventing a price.
 */
export async function resolveRound(
  roundId: string,
  options: ResolveOptions = {},
): Promise<boolean> {
  // Claim the round so a concurrent tick cannot also resolve it.
  const claimed = await prisma.round.updateMany({
    where: { id: roundId, status: { in: ['TRADING', 'LOCKED'] } },
    data: { status: 'LOCKED' },
  });

  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { event: true },
  });
  if (!round || round.status === 'RESOLVED') return false;
  if (claimed.count === 0 && round.status !== 'LOCKED') return false;

  const event = round.event;

  let closePrice: number | null = null;
  let outcome: 'YES' | 'NO' | 'VOID';
  let voidReason: string | null = null;

  if (options.forcedOutcome) {
    outcome = options.forcedOutcome;
    voidReason = options.reason ?? 'Resolved manually by the organizer';
    if (outcome !== 'VOID') {
      try {
        closePrice = (await getPrice(event.asset, 2000)).price;
      } catch {
        closePrice = null;
      }
    }
  } else if (round.openPrice === null) {
    outcome = 'VOID';
    voidReason = 'No opening price was recorded for this round';
  } else {
    const twap = await sampleTwap(event.asset);
    if (twap.price === null) {
      outcome = 'VOID';
      voidReason = `Price feed unavailable at close (${twap.samples.length}/${twap.requested} samples)`;
    } else {
      closePrice = twap.price;
      // Strictly greater is a YES. A tie goes to NO, by the stated rule.
      outcome = closePrice > round.openPrice ? 'YES' : 'NO';
    }
  }

  await settleRound(roundId, outcome, closePrice, voidReason);
  return true;
}

/**
 * Pay out a resolved round.
 *
 * Trade costs were already debited when each trade was placed, so settlement
 * only ever credits: 1 point per winning share, 0 for losing shares, and a full
 * refund of what was paid on a VOID. Balances, trade payouts, and the round
 * status all move inside one transaction so a crash mid-settlement cannot leave
 * a round half-paid.
 */
export async function settleRound(
  roundId: string,
  outcome: 'YES' | 'NO' | 'VOID',
  closePrice: number | null,
  voidReason: string | null,
): Promise<void> {
  const settledAt = new Date();

  const { event, round } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const current = await tx.round.findUniqueOrThrow({
        where: { id: roundId },
        include: { event: true },
      });

      if (current.status === 'RESOLVED') {
        return { event: current.event, round: current };
      }

      const trades = await tx.trade.findMany({
        where: { roundId },
        select: { id: true, participantId: true, side: true, shares: true, cost: true },
      });

      const creditByParticipant = new Map<string, number>();

      for (const trade of trades) {
        const payout = payoutForTrade(trade.side, trade.shares, outcome, trade.cost);
        await tx.trade.update({
          where: { id: trade.id },
          data: { payout, settledAt },
        });
        creditByParticipant.set(
          trade.participantId,
          (creditByParticipant.get(trade.participantId) ?? 0) + payout,
        );
      }

      for (const [participantId, credit] of creditByParticipant) {
        if (credit === 0) continue;
        await tx.eventParticipant.update({
          where: { id: participantId },
          data: { balance: { increment: credit } },
        });
      }

      const resolved = await tx.round.update({
        where: { id: roundId },
        data: {
          status: 'RESOLVED',
          outcome,
          closePrice,
          voidReason,
          resolvedAt: settledAt,
        },
      });

      return { event: current.event, round: resolved };
    },
    { timeout: 20_000 },
  );

  emitToArena(event.id, 'settled', {
    roundId: round.id,
    roundNumber: round.roundNumber,
    outcome,
    openPrice: round.openPrice,
    closePrice: round.closePrice,
    voidReason: round.voidReason,
  });

  await broadcastRound(event, round);
  // commitRanks so the next leaderboard renders arrows relative to this moment.
  await broadcastLeaderboard(event.id, { commitRanks: true });
}

// ---------------------------------------------------------------------------
// Event-level control
// ---------------------------------------------------------------------------

export async function startEvent(eventId: string): Promise<Event> {
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: 'LIVE',
      startedAt: new Date(),
    },
  });
  broadcastArenaState(event);
  await openNextRound(eventId);
  return prisma.event.findUniqueOrThrow({ where: { id: eventId } });
}

/**
 * Pause an arena. Any round still in flight is voided and fully refunded —
 * a paused round cannot be resolved fairly, since the close would land at an
 * arbitrary time nobody traded against. Resuming opens a fresh round.
 */
export async function pauseEvent(eventId: string): Promise<Event> {
  const active = await prisma.round.findFirst({
    where: { eventId, status: { in: ['TRADING', 'LOCKED'] } },
  });

  if (active) {
    await settleRound(active.id, 'VOID', null, 'Arena paused by the organizer');
    // The voided round should not consume a round number.
    await prisma.event.update({
      where: { id: eventId },
      data: { currentRound: { decrement: 1 } },
    });
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: 'LOBBY' },
  });
  broadcastArenaState(event);
  return event;
}

export async function endEvent(eventId: string): Promise<Event> {
  const active = await prisma.round.findFirst({
    where: { eventId, status: { in: ['TRADING', 'LOCKED'] } },
  });
  if (active) {
    await settleRound(active.id, 'VOID', null, 'Arena ended by the organizer');
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: { status: 'ENDED', endsAt: new Date() },
  });

  broadcastArenaState(event);
  await broadcastLeaderboard(eventId, { commitRanks: true });
  clearRateLimit(`trade:${eventId}:`);
  return event;
}
