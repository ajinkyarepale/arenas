import type { Prisma } from '@/generated/client';

import { withKeyedLock } from '@/lib/keyed-lock';
import {
  quantiseShares,
  quoteByBudget,
  quoteByShares,
  priceYes as lmsrPriceYes,
  type Side,
} from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';
import { emitToArena } from '@/lib/realtime/bus';
import { aggregateRound } from '@/lib/engine/round-engine';

/**
 * Placing a trade.
 *
 * The tricky part is that the price depends on the book, and the book changes
 * with every fill. Two participants tapping BUY YES at the same instant must
 * not both be quoted the same price and both move the book from the same
 * starting state — that would hand out shares the cost function never charged
 * for, and the implied probability would stop matching the shares outstanding.
 *
 * So the LMSR state is updated with an optimistic concurrency guard: we read
 * (qYes, qNo), price the trade against exactly those numbers, and then write
 * the new state only if the row still holds the values we priced against. If
 * another fill landed first, we re-read and re-price. The loser of the race
 * gets the (slightly worse) price they should have gotten, not a free fill.
 */

export const MIN_STAKE = 1;

export type TradeFailure =
  | 'not-participant'
  | 'no-active-round'
  | 'round-locked'
  | 'insufficient-balance'
  | 'stake-too-small'
  | 'stake-too-large'
  | 'rate-limited'
  | 'contention';

export interface TradeSuccess {
  ok: true;
  trade: {
    id: string;
    side: Side;
    shares: number;
    cost: number;
    priceAtFill: number;
  };
  balance: number;
  priceYes: number;
  roundId: string;
  position: PositionSummary;
}

export interface TradeRejection {
  ok: false;
  reason: TradeFailure;
  message: string;
}

export type TradeResult = TradeSuccess | TradeRejection;

export interface PositionSummary {
  yesShares: number;
  noShares: number;
  yesCost: number;
  noCost: number;
  /** Average price paid per share, per side. Null when nothing is held. */
  yesAvgPrice: number | null;
  noAvgPrice: number | null;
  totalStaked: number;
}

export function summarisePosition(
  trades: Array<{ side: Side; shares: number; cost: number }>,
): PositionSummary {
  let yesShares = 0;
  let noShares = 0;
  let yesCost = 0;
  let noCost = 0;

  for (const trade of trades) {
    if (trade.side === 'YES') {
      yesShares += trade.shares;
      yesCost += trade.cost;
    } else {
      noShares += trade.shares;
      noCost += trade.cost;
    }
  }

  return {
    yesShares,
    noShares,
    yesCost,
    noCost,
    yesAvgPrice: yesShares > 0 ? yesCost / yesShares : null,
    noAvgPrice: noShares > 0 ? noCost / noShares : null,
    totalStaked: yesCost + noCost,
  };
}

export async function getPosition(
  roundId: string,
  participantId: string,
): Promise<PositionSummary> {
  const trades = await prisma.trade.findMany({
    where: { roundId, participantId },
    select: { side: true, shares: true, cost: true },
  });
  return summarisePosition(trades);
}

const MAX_CONTENTION_RETRIES = 12;

export interface PlaceTradeInput {
  eventId: string;
  userId: string;
  side: Side;
  /** Points the participant wants to stake. Mutually exclusive with `shares`. */
  stake?: number;
  /**
   * Exact number of shares to buy, with the cost derived from the book.
   * Mutually exclusive with `stake`.
   *
   * The arena's per-trade cap is denominated in points, so a share order is
   * capped on its resulting cost rather than on the share count — the guard
   * therefore runs after the quote instead of before it.
   */
  shares?: number;
}

/**
 * Place a trade.
 *
 * Trades against a single arena are serialised so that a whole room tapping at
 * once queues rather than colliding — without this, most simultaneous orders
 * lose the compare-and-set race and come back as "the market moved, try again",
 * which is unusable during a live round. Each trade is a short transaction, so
 * the queue drains in milliseconds. Different arenas never block each other.
 */
const roundAggregateCache = new Map<string, { volume: number; tradeCount: number }>();
const userNameCache = new Map<string, string>();

/**
 * Place a trade.
 *
 * Trades against a single arena are serialised during the atomic pricing and
 * transaction commit so that concurrent orders queue smoothly rather than
 * colliding or experiencing contention retries. As soon as the transaction commits,
 * the mutex is released so that queued orders can immediately proceed. Heavy
 * post-fill operations (aggregations, user lookups, and websocket fanouts)
 * happen outside the lock using in-memory caches.
 */
export async function placeTrade(input: PlaceTradeInput): Promise<TradeResult> {
  const { eventId, userId, side, stake, shares: requestedShares } = input;

  const byShares = requestedShares !== undefined;
  if (byShares === (stake !== undefined)) {
    return {
      ok: false,
      reason: 'stake-too-small',
      message: 'Specify either a stake in points or a number of shares.',
    };
  }

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== 'LIVE') {
    return { ok: false, reason: 'no-active-round', message: 'This arena is not live.' };
  }

  // Budget-denominated orders are bounded before pricing. Share-denominated
  // ones cannot be — their cost is not known until the book is read — so they
  // are checked against the same cap once quoted, inside the retry loop.
  if (!byShares) {
    if (stake! < MIN_STAKE) {
      return {
        ok: false,
        reason: 'stake-too-small',
        message: `The minimum stake is ${MIN_STAKE} point.`,
      };
    }
    if (stake! > event.maxStakePerTrade) {
      return {
        ok: false,
        reason: 'stake-too-large',
        message: `The maximum stake in this arena is ${event.maxStakePerTrade} points per trade.`,
      };
    }
  } else if (quantiseShares(requestedShares!) <= 0) {
    return {
      ok: false,
      reason: 'stake-too-small',
      message: 'That is too few shares to buy.',
    };
  }

  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!participant) {
    return {
      ok: false,
      reason: 'not-participant',
      message: 'Join this arena before trading.',
    };
  }

  if (participant.balance <= 0) {
    return {
      ok: false,
      reason: 'insufficient-balance',
      message: 'You have 0 points remaining. You cannot submit any more trades.',
    };
  }

  // Check organizer-configured trades per minute limit
  if (event.tradesPerMinuteLimit && event.tradesPerMinuteLimit > 0) {
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recentTradesCount = await prisma.trade.count({
      where: {
        eventId,
        userId,
        createdAt: { gte: oneMinuteAgo },
      },
    });
    if (recentTradesCount >= event.tradesPerMinuteLimit) {
      return {
        ok: false,
        reason: 'rate-limited',
        message: `Submission limit reached: Maximum ${event.tradesPerMinuteLimit} trades per minute allowed by organizer.`,
      };
    }
  }

  // Execute atomic pricing and transaction under the keyed lock.
  // The lock is released IMMEDIATELY after transaction commit, unlocking next orders.
  const execution = await withKeyedLock(`trade:${eventId}`, async () => {
    for (let attempt = 0; attempt < MAX_CONTENTION_RETRIES; attempt += 1) {
      const round = await prisma.round.findUnique({
        where: { eventId_roundNumber: { eventId, roundNumber: event.currentRound } },
      });

      if (!round) {
        return {
          ok: false as const,
          reason: 'no-active-round' as const,
          message: 'No round is open right now.',
        };
      }
      if (round.status !== 'TRADING') {
        return {
          ok: false as const,
          reason: 'round-locked' as const,
          message: 'Trading is closed for this round.',
        };
      }
      if (round.locksAt && Date.now() >= round.locksAt.getTime()) {
        return {
          ok: false as const,
          reason: 'round-locked' as const,
          message: 'Trading is closed for this round.',
        };
      }

      // Price against exactly the state we just read.
      const bookBefore = { qYes: round.qYes, qNo: round.qNo };
      const quote = byShares
        ? quoteByShares(
            bookBefore,
            side,
            quantiseShares(requestedShares!),
            event.liquidityParamB,
          )
        : quoteByBudget(bookBefore, side, stake!, event.liquidityParamB);

      if (quote.shares <= 0) {
        return {
          ok: false as const,
          reason: 'stake-too-small' as const,
          message: byShares
            ? 'That is too few shares to buy.'
            : 'That stake is too small to buy any shares.',
        };
      }

      // The per-trade cap is a points cap, so a share order is measured by what
      // it actually costs at the current book.
      if (byShares && quote.cost > event.maxStakePerTrade) {
        return {
          ok: false as const,
          reason: 'stake-too-large' as const,
          message:
            `That many shares would cost ${quote.cost.toFixed(2)} points, above this ` +
            `arena's limit of ${event.maxStakePerTrade} per trade.`,
        };
      }

      let result;
      try {
        result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          // Balance is re-checked inside the transaction against the live row.
          const freshParticipant = await tx.eventParticipant.findUniqueOrThrow({
            where: { id: participant.id },
            select: { balance: true },
          });

          if (freshParticipant.balance + 1e-9 < quote.cost) {
            return { kind: 'insufficient' as const, balance: freshParticipant.balance };
          }

          // The guard: only commit if the book is still where we priced it.
          const moved = await tx.round.updateMany({
            where: {
              id: round.id,
              status: 'TRADING',
              qYes: bookBefore.qYes,
              qNo: bookBefore.qNo,
            },
            data: { qYes: quote.state.qYes, qNo: quote.state.qNo },
          });

          if (moved.count === 0) {
            return { kind: 'contention' as const };
          }

          const updatedParticipant = await tx.eventParticipant.update({
            where: { id: participant.id },
            data: { balance: { decrement: quote.cost } },
          });

          const trade = await tx.trade.create({
            data: {
              eventId,
              roundId: round.id,
              userId,
              participantId: participant.id,
              side,
              shares: quote.shares,
              cost: quote.cost,
              priceAtFill: quote.avgPrice,
            },
          });

          // Record immutable double-entry ledger record
          await tx.pointLedger.create({
            data: {
              eventId,
              participantId: participant.id,
              userId,
              tradeId: trade.id,
              type: 'PREDICTION_STAKE',
              amount: -quote.cost,
              balanceBefore: freshParticipant.balance,
              balanceAfter: updatedParticipant.balance,
              reason: `Staked ${quote.cost.toFixed(2)} pts on ${side}`,
            },
          });

          return {
            kind: 'filled' as const,
            trade,
            balance: updatedParticipant.balance,
          };
        });
      } catch {
        continue;
      }

      if (result.kind === 'insufficient') {
        return {
          ok: false as const,
          reason: 'insufficient-balance' as const,
          message: `Not enough points — you have ${result.balance.toFixed(2)}.`,
        };
      }

      if (result.kind === 'contention') {
        continue;
      }

      return {
        ok: true as const,
        trade: result.trade,
        balance: result.balance,
        quote,
        round,
      };
    }

    return {
      ok: false as const,
      reason: 'contention' as const,
      message: 'The market moved while your order was pricing. Try again.',
    };
  });

  if (!execution.ok) {
    return execution;
  }

  const { trade, balance, quote, round } = execution;

  // In-memory aggregate cache maintenance for ultra-fast fills without O(N) table scans
  let currentAgg = roundAggregateCache.get(round.id);
  if (!currentAgg) {
    currentAgg = await aggregateRound(round.id);
  } else {
    currentAgg = {
      volume: Math.round((currentAgg.volume + quote.cost) * 100) / 100,
      tradeCount: currentAgg.tradeCount + 1,
    };
  }
  roundAggregateCache.set(round.id, currentAgg);

  let displayName = userNameCache.get(userId);
  if (!displayName) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    displayName = u?.name ?? 'Trader';
    userNameCache.set(userId, displayName);
  }

  const [position] = await Promise.all([
    getPosition(round.id, participant.id),
  ]);

  const newPriceYes = lmsrPriceYes(quote.state, event.liquidityParamB);

  emitToArena(eventId, 'market', {
    roundId: round.id,
    priceYes: newPriceYes,
    qYes: quote.state.qYes,
    qNo: quote.state.qNo,
    volume: currentAgg.volume,
    tradeCount: currentAgg.tradeCount,
    lastTrade: {
      side,
      shares: quote.shares,
      cost: quote.cost,
      displayName,
      at: trade.createdAt.toISOString(),
    },
  });

  return {
    ok: true,
    trade: {
      id: trade.id,
      side,
      shares: quote.shares,
      cost: quote.cost,
      priceAtFill: quote.avgPrice,
    },
    balance,
    priceYes: newPriceYes,
    roundId: round.id,
    position,
  };
}
