import { prisma } from '@/lib/prisma';

/**
 * Trading analytics.
 *
 * Every number here is derived from trades that have already settled, so
 * nothing in this module can leak an in-flight position or an unresolved
 * outcome. It exists because the interesting question on a prediction market
 * is not "how many points do you have" but "were you right, and were you
 * right for the reasons you thought" — calibration, edge, and consistency.
 *
 * All of the underlying data (priceAtFill, cost, payout, round outcome) has
 * been recorded since the engine shipped; none of it was surfaced.
 */

export interface EquityPoint {
  /** Sequential index — trades in settle order, not wall-clock spaced. */
  i: number;
  at: string;
  balance: number;
  pnl: number;
  arenaCode: string;
  roundNumber: number;
}

export interface CalibrationBucket {
  /** Lower edge of the probability bucket, e.g. 0.6 for the 60–70% band. */
  from: number;
  to: number;
  /** How many settled trades landed in this bucket. */
  count: number;
  /** Share of those trades that actually won. */
  actual: number | null;
  /** Average price paid — what the trader implicitly predicted. */
  predicted: number | null;
}

export interface SideSplit {
  side: 'YES' | 'NO';
  trades: number;
  won: number;
  staked: number;
  netPnl: number;
}

export interface TraderAnalytics {
  settledTrades: number;
  /** Points staked across every settled trade. */
  totalStaked: number;
  totalReturned: number;
  netPnl: number;
  /** Return on points staked. Null when nothing has settled. */
  roi: number | null;
  /** Fraction of settled trades that paid out more than they cost. */
  hitRate: number | null;
  /** Mean price paid — below 0.5 means a habit of buying underdogs. */
  avgEntryPrice: number | null;
  /**
   * Mean |actual − predicted| across calibration buckets. Lower is better
   * calibrated. Null until there is enough spread to say anything.
   */
  calibrationError: number | null;
  bestTrade: { pnl: number; arenaCode: string; roundNumber: number } | null;
  worstTrade: { pnl: number; arenaCode: string; roundNumber: number } | null;
  longestWinStreak: number;
  currentStreak: { kind: 'win' | 'loss'; length: number } | null;
  equity: EquityPoint[];
  calibration: CalibrationBucket[];
  sides: SideSplit[];
}

const BUCKET_EDGES = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

/**
 * Career analytics for one user across every arena they have played.
 *
 * `arenaId` narrows it to a single event, which is what the results page wants.
 */
export async function getTraderAnalytics(
  userId: string,
  arenaId?: string,
): Promise<TraderAnalytics> {
  const trades = await prisma.trade.findMany({
    where: {
      userId,
      settledAt: { not: null },
      ...(arenaId ? { round: { eventId: arenaId } } : {}),
    },
    orderBy: { settledAt: 'asc' },
    select: {
      side: true,
      cost: true,
      payout: true,
      priceAtFill: true,
      settledAt: true,
      round: {
        select: {
          roundNumber: true,
          outcome: true,
          event: { select: { code: true, startingBalance: true } },
        },
      },
    },
  });

  // A VOID round refunds cost exactly. Those trades are real history but they
  // carry no information about whether anyone was right, so they are excluded
  // from every accuracy measure while still being ignored (not counted as a
  // loss) in the streak and hit-rate maths.
  const decided = trades.filter((t) => t.round.outcome !== 'VOID');

  const totalStaked = decided.reduce((sum, t) => sum + t.cost, 0);
  const totalReturned = decided.reduce((sum, t) => sum + (t.payout ?? 0), 0);
  const netPnl = totalReturned - totalStaked;

  const wins = decided.filter((t) => (t.payout ?? 0) > t.cost).length;

  // Equity curve: cumulative P/L in settle order. Uses a running total rather
  // than the participant balance so it stays meaningful across arenas, which
  // each have their own starting balance.
  let running = 0;
  const equity: EquityPoint[] = decided.map((t, i) => {
    running += (t.payout ?? 0) - t.cost;
    return {
      i,
      at: t.settledAt!.toISOString(),
      balance: running,
      pnl: (t.payout ?? 0) - t.cost,
      arenaCode: t.round.event.code,
      roundNumber: t.round.roundNumber,
    };
  });

  // Calibration: bucket by the price paid, then compare the average price in
  // the bucket against how often those trades actually won.
  const calibration: CalibrationBucket[] = [];
  for (let b = 0; b < BUCKET_EDGES.length - 1; b += 1) {
    const from = BUCKET_EDGES[b];
    const to = BUCKET_EDGES[b + 1];
    const inBucket = decided.filter(
      (t) => t.priceAtFill >= from && (b === BUCKET_EDGES.length - 2 ? t.priceAtFill <= to : t.priceAtFill < to),
    );
    calibration.push({
      from,
      to,
      count: inBucket.length,
      actual:
        inBucket.length > 0
          ? inBucket.filter((t) => (t.payout ?? 0) > t.cost).length / inBucket.length
          : null,
      predicted:
        inBucket.length > 0
          ? inBucket.reduce((sum, t) => sum + t.priceAtFill, 0) / inBucket.length
          : null,
    });
  }

  // Only buckets with enough trades to mean anything contribute to the score.
  const scored = calibration.filter((b) => b.count >= 3 && b.actual !== null && b.predicted !== null);
  const calibrationError =
    scored.length > 0
      ? scored.reduce((sum, b) => sum + Math.abs((b.actual ?? 0) - (b.predicted ?? 0)), 0) /
        scored.length
      : null;

  // Streaks, in settle order.
  let longestWinStreak = 0;
  let run = 0;
  for (const t of decided) {
    if ((t.payout ?? 0) > t.cost) {
      run += 1;
      longestWinStreak = Math.max(longestWinStreak, run);
    } else {
      run = 0;
    }
  }

  let currentStreak: TraderAnalytics['currentStreak'] = null;
  if (decided.length > 0) {
    const lastWon = (decided[decided.length - 1].payout ?? 0) > decided[decided.length - 1].cost;
    let length = 0;
    for (let i = decided.length - 1; i >= 0; i -= 1) {
      const won = (decided[i].payout ?? 0) > decided[i].cost;
      if (won !== lastWon) break;
      length += 1;
    }
    currentStreak = { kind: lastWon ? 'win' : 'loss', length };
  }

  const withPnl = decided.map((t) => ({
    pnl: (t.payout ?? 0) - t.cost,
    arenaCode: t.round.event.code,
    roundNumber: t.round.roundNumber,
  }));

  const bestTrade = withPnl.reduce<typeof withPnl[number] | null>(
    (best, t) => (best === null || t.pnl > best.pnl ? t : best),
    null,
  );
  const worstTrade = withPnl.reduce<typeof withPnl[number] | null>(
    (worst, t) => (worst === null || t.pnl < worst.pnl ? t : worst),
    null,
  );

  const sides: SideSplit[] = (['YES', 'NO'] as const).map((side) => {
    const own = decided.filter((t) => t.side === side);
    return {
      side,
      trades: own.length,
      won: own.filter((t) => (t.payout ?? 0) > t.cost).length,
      staked: own.reduce((sum, t) => sum + t.cost, 0),
      netPnl: own.reduce((sum, t) => sum + ((t.payout ?? 0) - t.cost), 0),
    };
  });

  return {
    settledTrades: decided.length,
    totalStaked,
    totalReturned,
    netPnl,
    roi: totalStaked > 0 ? netPnl / totalStaked : null,
    hitRate: decided.length > 0 ? wins / decided.length : null,
    avgEntryPrice:
      decided.length > 0
        ? decided.reduce((sum, t) => sum + t.priceAtFill, 0) / decided.length
        : null,
    calibrationError,
    bestTrade,
    worstTrade,
    longestWinStreak,
    currentStreak,
    equity,
    calibration,
    sides,
  };
}

export interface RoundHistoryEntry {
  roundNumber: number;
  outcome: 'YES' | 'NO' | 'VOID' | null;
  openPrice: number | null;
  closePrice: number | null;
  /** What the market believed at settle time, from the final book state. */
  impliedYes: number | null;
  volume: number;
  tradeCount: number;
  /** True when the market's favourite matched the actual outcome. */
  marketCorrect: boolean | null;
}

export interface ArenaAnalytics {
  rounds: RoundHistoryEntry[];
  resolvedRounds: number;
  yesCount: number;
  noCount: number;
  voidCount: number;
  totalVolume: number;
  totalTrades: number;
  /** How often the market's favourite won. The headline "was the crowd right" number. */
  crowdAccuracy: number | null;
  /** Mean |impliedYes − actual| over decided rounds. Lower is a sharper market. */
  crowdBrier: number | null;
  busiestRound: { roundNumber: number; volume: number } | null;
}

/**
 * Market-level analytics for one arena: what happened each round, and whether
 * the room was collectively any good at calling it.
 */
export async function getArenaAnalytics(arenaId: string): Promise<ArenaAnalytics> {
  const rounds = await prisma.round.findMany({
    where: { eventId: arenaId },
    orderBy: { roundNumber: 'asc' },
    select: {
      roundNumber: true,
      status: true,
      outcome: true,
      openPrice: true,
      closePrice: true,
      qYes: true,
      qNo: true,
      trades: { select: { cost: true } },
      event: { select: { liquidityParamB: true } },
    },
  });

  const entries: RoundHistoryEntry[] = rounds
    .filter((r) => r.status === 'RESOLVED')
    .map((r) => {
      const b = r.event.liquidityParamB;
      // Recover the market's final implied probability from the closing book.
      // Same logistic the LMSR prices with, written in the numerically stable
      // form so a lopsided book cannot overflow.
      const d = (r.qYes - r.qNo) / b;
      const impliedYes = d >= 0 ? 1 / (1 + Math.exp(-d)) : Math.exp(d) / (1 + Math.exp(d));

      const volume = r.trades.reduce((sum, t) => sum + t.cost, 0);
      const decided = r.outcome === 'YES' || r.outcome === 'NO';

      return {
        roundNumber: r.roundNumber,
        outcome: r.outcome,
        openPrice: r.openPrice,
        closePrice: r.closePrice,
        impliedYes,
        volume,
        tradeCount: r.trades.length,
        marketCorrect: decided
          ? (impliedYes > 0.5 && r.outcome === 'YES') || (impliedYes < 0.5 && r.outcome === 'NO')
          : null,
      };
    });

  const decidedRounds = entries.filter((e) => e.marketCorrect !== null);
  const correct = decidedRounds.filter((e) => e.marketCorrect).length;

  // Brier-style mean absolute error of the market's forecast.
  const brier =
    decidedRounds.length > 0
      ? decidedRounds.reduce(
          (sum, e) => sum + Math.abs((e.impliedYes ?? 0.5) - (e.outcome === 'YES' ? 1 : 0)),
          0,
        ) / decidedRounds.length
      : null;

  const busiestRound = entries.reduce<{ roundNumber: number; volume: number } | null>(
    (best, e) =>
      best === null || e.volume > best.volume
        ? { roundNumber: e.roundNumber, volume: e.volume }
        : best,
    null,
  );

  return {
    rounds: entries,
    resolvedRounds: entries.length,
    yesCount: entries.filter((e) => e.outcome === 'YES').length,
    noCount: entries.filter((e) => e.outcome === 'NO').length,
    voidCount: entries.filter((e) => e.outcome === 'VOID').length,
    totalVolume: entries.reduce((sum, e) => sum + e.volume, 0),
    totalTrades: entries.reduce((sum, e) => sum + e.tradeCount, 0),
    crowdAccuracy: decidedRounds.length > 0 ? correct / decidedRounds.length : null,
    crowdBrier: brier,
    busiestRound,
  };
}
