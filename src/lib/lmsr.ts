/**
 * LMSR — Logarithmic Market Scoring Rule.
 *
 * A binary (YES/NO) automated market maker. Cumulative outstanding shares are
 * tracked as `qYes` and `qNo`; the cost function
 *
 *     C(q) = b * ln( e^(qYes/b) + e^(qNo/b) )
 *
 * defines the price of every trade: buying shares costs `C(after) - C(before)`.
 * The instantaneous price of YES is the partial derivative of C with respect to
 * qYes, which is the softmax weight
 *
 *     p(YES) = e^(qYes/b) / ( e^(qYes/b) + e^(qNo/b) )
 *
 * and always lies in (0, 1), so it reads directly as an implied probability.
 *
 * `b` is the liquidity parameter. Lower `b` means each trade moves the price
 * further — for a live event that visible movement is the whole point. The
 * market maker worst-case subsidy is `b * ln(2)` points per round, which is
 * also what caps how much the house can lose. No real money is involved.
 *
 * This module is pure: no I/O, no database, no framework. Every function is
 * total and numerically stable for the ranges a live arena will ever see.
 */

export type Side = 'YES' | 'NO';

export interface MarketState {
  qYes: number;
  qNo: number;
}

export interface Quote {
  side: Side;
  /** Shares acquired. */
  shares: number;
  /** Points paid — exactly C(after) - C(before). */
  cost: number;
  /** cost / shares — the effective (average) fill price, in (0, 1). */
  avgPrice: number;
  /** Implied probability of YES before the trade. */
  priceBefore: number;
  /** Implied probability of YES after the trade. */
  priceAfter: number;
  /** Resulting market state. */
  state: MarketState;
}

/** Shares are quantised to this granularity so stored values stay exact-ish. */
export const SHARE_PRECISION = 1e-6;

export class LmsrError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LmsrError';
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new LmsrError(`${label} must be a finite positive number, got ${value}`);
  }
}

function assertState(state: MarketState): void {
  if (!Number.isFinite(state.qYes) || !Number.isFinite(state.qNo)) {
    throw new LmsrError('Market state must be finite');
  }
  if (state.qYes < 0 || state.qNo < 0) {
    throw new LmsrError('Market state cannot hold negative share counts');
  }
}

/**
 * ln(e^a + e^b) computed without ever forming e^a directly, so it survives
 * large exponents. The standard log-sum-exp trick, specialised to two terms.
 */
export function logSumExp2(a: number, b: number): number {
  if (a === b) return a + Math.LN2;
  const max = a > b ? a : b;
  const min = a > b ? b : a;
  // log1p keeps precision when the two terms are far apart.
  return max + Math.log1p(Math.exp(min - max));
}

/** Numerically stable logistic function. */
export function sigmoid(x: number): number {
  if (x >= 0) {
    return 1 / (1 + Math.exp(-x));
  }
  const ex = Math.exp(x);
  return ex / (1 + ex);
}

/** The LMSR cost function C(q). */
export function cost(state: MarketState, b: number): number {
  assertFinitePositive(b, 'liquidity parameter b');
  assertState(state);
  return b * logSumExp2(state.qYes / b, state.qNo / b);
}

/** Instantaneous implied probability of YES, in (0, 1). */
export function priceYes(state: MarketState, b: number): number {
  assertFinitePositive(b, 'liquidity parameter b');
  assertState(state);
  return sigmoid((state.qYes - state.qNo) / b);
}

/** Instantaneous implied probability of NO, in (0, 1). */
export function priceNo(state: MarketState, b: number): number {
  return 1 - priceYes(state, b);
}

/** Price of whichever side is asked for. */
export function priceOf(state: MarketState, side: Side, b: number): number {
  return side === 'YES' ? priceYes(state, b) : priceNo(state, b);
}

/** The state that results from adding `shares` to one side. */
export function applyShares(state: MarketState, side: Side, shares: number): MarketState {
  return side === 'YES'
    ? { qYes: state.qYes + shares, qNo: state.qNo }
    : { qYes: state.qYes, qNo: state.qNo + shares };
}

/**
 * Cost in points of buying `shares` of `side` from the current state.
 * Always strictly positive for positive `shares`.
 */
export function costOfShares(
  state: MarketState,
  side: Side,
  shares: number,
  b: number,
): number {
  assertFinitePositive(b, 'liquidity parameter b');
  assertState(state);
  if (!Number.isFinite(shares) || shares < 0) {
    throw new LmsrError(`shares must be a finite non-negative number, got ${shares}`);
  }
  if (shares === 0) return 0;
  return cost(applyShares(state, side, shares), b) - cost(state, b);
}

/**
 * Invert the cost function: how many shares of `side` does `budget` points buy?
 *
 * Solving `C(q + s * e_side) - C(q) = budget` for s gives
 *
 *     s = b * ln( e^((C0 + budget)/b) - e^(qOther/b) ) - qSelf
 *
 * which is evaluated in log-space as `A + log1p(-e^(B-A))` to avoid
 * exponentiating large numbers or subtracting two nearly equal ones.
 * `C0 > qOther` always holds, so the log argument is strictly positive.
 */
export function sharesForBudget(
  state: MarketState,
  side: Side,
  budget: number,
  b: number,
): number {
  assertFinitePositive(b, 'liquidity parameter b');
  assertState(state);
  if (!Number.isFinite(budget) || budget < 0) {
    throw new LmsrError(`budget must be a finite non-negative number, got ${budget}`);
  }
  if (budget === 0) return 0;

  const qSelf = side === 'YES' ? state.qYes : state.qNo;
  const qOther = side === 'YES' ? state.qNo : state.qYes;

  const c0 = cost(state, b);
  const a = (c0 + budget) / b;
  const other = qOther / b;

  // `other < a` is guaranteed: C0 > qOther and budget > 0.
  const logTerm = a + Math.log1p(-Math.exp(other - a));
  const shares = b * logTerm - qSelf;

  return shares > 0 ? shares : 0;
}

/** Round shares DOWN to the storage granularity so cost never exceeds budget. */
export function quantiseShares(shares: number): number {
  return Math.floor(shares / SHARE_PRECISION) * SHARE_PRECISION;
}

/** Quote a trade denominated in shares. */
export function quoteByShares(
  state: MarketState,
  side: Side,
  shares: number,
  b: number,
): Quote {
  const priceBefore = priceYes(state, b);
  const nextState = applyShares(state, side, shares);
  const tradeCost = shares === 0 ? 0 : cost(nextState, b) - cost(state, b);
  const priceAfter = priceYes(nextState, b);

  return {
    side,
    shares,
    cost: tradeCost,
    avgPrice: shares === 0 ? priceOf(state, side, b) : tradeCost / shares,
    priceBefore,
    priceAfter,
    state: nextState,
  };
}

/**
 * Quote a trade denominated in points — what a participant actually types into
 * the stake box. Shares are quantised downward and the returned `cost` is then
 * recomputed exactly from the cost function, so the invariant
 * `cost === C(after) - C(before)` holds precisely and `cost <= budget`.
 */
export function quoteByBudget(
  state: MarketState,
  side: Side,
  budget: number,
  b: number,
): Quote {
  const raw = sharesForBudget(state, side, budget, b);
  const shares = quantiseShares(raw);
  return quoteByShares(state, side, shares, b);
}

/**
 * Payout at settlement: each winning share is worth exactly 1 point, losing
 * shares are worth 0. A VOID round refunds what was paid instead.
 */
export function payoutForTrade(
  side: Side,
  shares: number,
  outcome: Side | 'VOID',
  paid: number,
): number {
  if (outcome === 'VOID') return paid;
  return side === outcome ? shares : 0;
}

/**
 * Worst-case points the market maker can pay out beyond what it collects, per
 * round. Useful for organizers sizing `b` against the starting balance.
 */
export function maxSubsidy(b: number): number {
  assertFinitePositive(b, 'liquidity parameter b');
  return b * Math.LN2;
}
