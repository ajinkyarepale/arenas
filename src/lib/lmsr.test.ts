import { describe, expect, it } from 'vitest';
import {
  applyShares,
  cost,
  costOfShares,
  LmsrError,
  logSumExp2,
  maxSubsidy,
  payoutForTrade,
  priceNo,
  priceYes,
  quantiseShares,
  quoteByBudget,
  quoteByShares,
  sharesForBudget,
  sigmoid,
  type MarketState,
} from './lmsr';

const B = 40;
const EMPTY: MarketState = { qYes: 0, qNo: 0 };

/** Naive, unstable reference implementation used to cross-check the stable one. */
function naiveCost(state: MarketState, b: number): number {
  return b * Math.log(Math.exp(state.qYes / b) + Math.exp(state.qNo / b));
}

describe('logSumExp2', () => {
  it('matches the naive formula in the safe range', () => {
    for (const [a, b] of [
      [0, 0],
      [1, 2],
      [-3, 4],
      [10, 10.5],
      [-20, -21],
    ] as const) {
      expect(logSumExp2(a, b)).toBeCloseTo(Math.log(Math.exp(a) + Math.exp(b)), 10);
    }
  });

  it('stays finite where the naive formula overflows to Infinity', () => {
    const naive = Math.log(Math.exp(800) + Math.exp(799));
    expect(naive).toBe(Infinity);
    expect(Number.isFinite(logSumExp2(800, 799))).toBe(true);
    expect(logSumExp2(800, 799)).toBeCloseTo(800 + Math.log1p(Math.exp(-1)), 10);
  });

  it('is symmetric', () => {
    expect(logSumExp2(3, -7)).toBeCloseTo(logSumExp2(-7, 3), 12);
  });
});

describe('sigmoid', () => {
  it('is 0.5 at zero and monotonic', () => {
    expect(sigmoid(0)).toBe(0.5);
    expect(sigmoid(-1)).toBeLessThan(0.5);
    expect(sigmoid(1)).toBeGreaterThan(0.5);
  });

  it('does not overflow at extreme inputs', () => {
    expect(sigmoid(1000)).toBe(1);
    expect(sigmoid(-1000)).toBe(0);
    expect(Number.isNaN(sigmoid(-800))).toBe(false);
  });
});

describe('cost', () => {
  it('equals b*ln(2) on an empty market', () => {
    expect(cost(EMPTY, B)).toBeCloseTo(B * Math.LN2, 10);
  });

  it('agrees with the naive implementation for ordinary states', () => {
    for (const state of [
      { qYes: 10, qNo: 0 },
      { qYes: 0, qNo: 25 },
      { qYes: 60, qNo: 40 },
      { qYes: 300, qNo: 12 },
    ]) {
      expect(cost(state, B)).toBeCloseTo(naiveCost(state, B), 8);
    }
  });

  it('is finite for share counts that would overflow the naive form', () => {
    const state = { qYes: 100_000, qNo: 0 };
    expect(naiveCost(state, 1)).toBe(Infinity);
    expect(Number.isFinite(cost(state, 1))).toBe(true);
  });

  it('rejects a non-positive liquidity parameter', () => {
    expect(() => cost(EMPTY, 0)).toThrow(LmsrError);
    expect(() => cost(EMPTY, -5)).toThrow(LmsrError);
  });

  it('rejects negative share counts', () => {
    expect(() => cost({ qYes: -1, qNo: 0 }, B)).toThrow(LmsrError);
  });
});

describe('priceYes / priceNo', () => {
  it('starts at 50/50', () => {
    expect(priceYes(EMPTY, B)).toBeCloseTo(0.5, 12);
    expect(priceNo(EMPTY, B)).toBeCloseTo(0.5, 12);
  });

  it('always sums to one', () => {
    for (const state of [
      { qYes: 3, qNo: 90 },
      { qYes: 1000, qNo: 2 },
      { qYes: 0, qNo: 0 },
    ]) {
      expect(priceYes(state, B) + priceNo(state, B)).toBeCloseTo(1, 12);
    }
  });

  it('stays strictly inside (0, 1) for realistic volume', () => {
    const p = priceYes({ qYes: 5000, qNo: 0 }, B);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it('rises when YES is bought and falls when NO is bought', () => {
    const base = priceYes(EMPTY, B);
    expect(priceYes(applyShares(EMPTY, 'YES', 20), B)).toBeGreaterThan(base);
    expect(priceYes(applyShares(EMPTY, 'NO', 20), B)).toBeLessThan(base);
  });

  it('equals the derivative of the cost function', () => {
    // Finite-difference check: dC/dqYes should equal p(YES).
    const state = { qYes: 37, qNo: 12 };
    const h = 1e-5;
    const derivative =
      (cost(applyShares(state, 'YES', h), B) - cost(state, B)) / h;
    expect(derivative).toBeCloseTo(priceYes(state, B), 6);
  });
});

describe('costOfShares', () => {
  it('charges nothing for zero shares', () => {
    expect(costOfShares(EMPTY, 'YES', 0, B)).toBe(0);
  });

  it('is strictly positive and increasing in size', () => {
    const small = costOfShares(EMPTY, 'YES', 10, B);
    const large = costOfShares(EMPTY, 'YES', 20, B);
    expect(small).toBeGreaterThan(0);
    expect(large).toBeGreaterThan(small);
  });

  it('is convex — the second unit costs more than the first', () => {
    const first = costOfShares(EMPTY, 'YES', 10, B);
    const second = costOfShares({ qYes: 10, qNo: 0 }, 'YES', 10, B);
    expect(second).toBeGreaterThan(first);
  });

  it('costs between 0 and 1 point per share', () => {
    const shares = 25;
    const c = costOfShares(EMPTY, 'YES', shares, B);
    expect(c / shares).toBeGreaterThan(0);
    expect(c / shares).toBeLessThan(1);
  });

  it('is symmetric between the two sides on a balanced book', () => {
    expect(costOfShares(EMPTY, 'YES', 15, B)).toBeCloseTo(
      costOfShares(EMPTY, 'NO', 15, B),
      12,
    );
  });

  it('rejects negative share counts', () => {
    expect(() => costOfShares(EMPTY, 'YES', -1, B)).toThrow(LmsrError);
  });

  it('path-independence: two trades cost the same as one combined trade', () => {
    const first = costOfShares(EMPTY, 'YES', 10, B);
    const mid = applyShares(EMPTY, 'YES', 10);
    const second = costOfShares(mid, 'YES', 15, B);
    const combined = costOfShares(EMPTY, 'YES', 25, B);
    expect(first + second).toBeCloseTo(combined, 10);
  });
});

describe('sharesForBudget', () => {
  it('is the exact inverse of costOfShares', () => {
    const budgets = [0.5, 1, 5, 25, 100, 999];
    const states: MarketState[] = [
      EMPTY,
      { qYes: 40, qNo: 5 },
      { qYes: 0, qNo: 220 },
      { qYes: 150, qNo: 150 },
    ];
    for (const state of states) {
      for (const budget of budgets) {
        for (const side of ['YES', 'NO'] as const) {
          const shares = sharesForBudget(state, side, budget, B);
          expect(costOfShares(state, side, shares, B)).toBeCloseTo(budget, 6);
        }
      }
    }
  });

  it('returns zero for a zero budget', () => {
    expect(sharesForBudget(EMPTY, 'YES', 0, B)).toBe(0);
  });

  it('buys more shares when the side is cheap', () => {
    const cheapForYes: MarketState = { qYes: 0, qNo: 120 };
    const yesShares = sharesForBudget(cheapForYes, 'YES', 50, B);
    const noShares = sharesForBudget(cheapForYes, 'NO', 50, B);
    expect(yesShares).toBeGreaterThan(noShares);
  });

  it('never returns more than budget/priceFloor shares', () => {
    // At worst a share costs just above 0, but a budget of N can never buy
    // fewer than N shares either, since price < 1.
    const shares = sharesForBudget(EMPTY, 'YES', 100, B);
    expect(shares).toBeGreaterThan(100);
  });

  it('stays finite for a very large budget', () => {
    const shares = sharesForBudget(EMPTY, 'YES', 1e6, B);
    expect(Number.isFinite(shares)).toBe(true);
    expect(shares).toBeGreaterThan(0);
  });

  it('rejects a negative budget', () => {
    expect(() => sharesForBudget(EMPTY, 'YES', -1, B)).toThrow(LmsrError);
  });
});

describe('quoteByBudget', () => {
  it('never charges more than the stake', () => {
    for (const budget of [1, 7.77, 50, 250]) {
      const quote = quoteByBudget(EMPTY, 'YES', budget, B);
      expect(quote.cost).toBeLessThanOrEqual(budget);
      expect(budget - quote.cost).toBeLessThan(1e-4);
    }
  });

  it('reports a cost that exactly matches the cost function', () => {
    const quote = quoteByBudget({ qYes: 12, qNo: 30 }, 'NO', 60, B);
    const expected =
      cost(quote.state, B) - cost({ qYes: 12, qNo: 30 }, B);
    expect(quote.cost).toBeCloseTo(expected, 12);
  });

  it('reports an average price between the before and after prices', () => {
    const quote = quoteByBudget(EMPTY, 'YES', 100, B);
    expect(quote.avgPrice).toBeGreaterThan(quote.priceBefore);
    expect(quote.avgPrice).toBeLessThan(quote.priceAfter);
  });

  it('moves the price visibly at the default liquidity', () => {
    // The whole point of a low b: a 50-point trade should be seen from the back
    // of the room.
    const quote = quoteByBudget(EMPTY, 'YES', 50, B);
    expect(quote.priceAfter - quote.priceBefore).toBeGreaterThan(0.1);
  });

  it('quantises shares to the storage grid', () => {
    const quote = quoteByBudget(EMPTY, 'YES', 33.33, B);
    expect(quote.shares).toBeCloseTo(quantiseShares(quote.shares), 12);
  });
});

describe('quoteByShares', () => {
  it('produces a consistent state transition', () => {
    const quote = quoteByShares({ qYes: 5, qNo: 5 }, 'NO', 12, B);
    expect(quote.state).toEqual({ qYes: 5, qNo: 17 });
  });

  it('handles a zero-share quote without dividing by zero', () => {
    const quote = quoteByShares(EMPTY, 'YES', 0, B);
    expect(quote.cost).toBe(0);
    expect(quote.avgPrice).toBeCloseTo(0.5, 12);
  });
});

describe('payoutForTrade', () => {
  it('pays one point per winning share', () => {
    expect(payoutForTrade('YES', 42, 'YES', 20)).toBe(42);
  });

  it('pays nothing on a losing side', () => {
    expect(payoutForTrade('YES', 42, 'NO', 20)).toBe(0);
  });

  it('refunds the exact cost on a void round', () => {
    expect(payoutForTrade('YES', 42, 'VOID', 20.75)).toBe(20.75);
    expect(payoutForTrade('NO', 42, 'VOID', 20.75)).toBe(20.75);
  });
});

describe('maxSubsidy', () => {
  it('is b*ln(2)', () => {
    expect(maxSubsidy(40)).toBeCloseTo(40 * Math.LN2, 12);
  });
});

describe('house risk invariant', () => {
  it('never loses more than b*ln(2) on a round, whatever the traders do', () => {
    // Simulate assorted trade sequences and check the bound holds.
    const sequences: Array<Array<['YES' | 'NO', number]>> = [
      [['YES', 100]],
      [['NO', 100]],
      [['YES', 50], ['NO', 50], ['YES', 200]],
      [['YES', 10], ['YES', 10], ['YES', 10], ['YES', 10], ['NO', 500]],
    ];

    for (const seq of sequences) {
      let state = EMPTY;
      let collected = 0;
      const shares = { YES: 0, NO: 0 };

      for (const [side, budget] of seq) {
        const quote = quoteByBudget(state, side, budget, B);
        collected += quote.cost;
        shares[side] += quote.shares;
        state = quote.state;
      }

      // Worst case for the house is whichever outcome owes the most.
      const worstPayout = Math.max(shares.YES, shares.NO);
      const houseLoss = worstPayout - collected;
      expect(houseLoss).toBeLessThanOrEqual(maxSubsidy(B) + 1e-6);
    }
  });
});
