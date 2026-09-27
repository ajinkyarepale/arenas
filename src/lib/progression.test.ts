import { describe, expect, it } from 'vitest';

import { progressionFor } from './progression';

describe('progressionFor', () => {
  it('starts every new trader as a Rookie at level 1', () => {
    const p = progressionFor({ settledTrades: 0, netPnl: 0, hitRate: null });
    expect(p).toMatchObject({ level: 1, title: 'Rookie', toNext: 10, bandProgress: 0 });
  });

  it('advances bands at 10 / 40 / 120 settled trades', () => {
    expect(progressionFor({ settledTrades: 9, netPnl: 0, hitRate: null }).title).toBe('Rookie');
    expect(progressionFor({ settledTrades: 10, netPnl: 0, hitRate: null }).title).toBe('Regular');
    expect(progressionFor({ settledTrades: 40, netPnl: 0, hitRate: null }).title).toBe('Sharp');
    expect(progressionFor({ settledTrades: 200, netPnl: 0, hitRate: null })).toMatchObject({
      level: 4,
      title: 'Apex',
      toNext: null,
      bandProgress: 1,
    });
  });

  it('reports progress within a band', () => {
    const p = progressionFor({ settledTrades: 25, netPnl: 0, hitRate: null });
    expect(p.toNext).toBe(15);
    expect(p.bandProgress).toBeCloseTo(0.5, 5);
  });

  it('flavours titles by hit rate only with real history', () => {
    expect(progressionFor({ settledTrades: 20, netPnl: 5, hitRate: 0.7 }).title).toContain('Hot hand');
    expect(progressionFor({ settledTrades: 20, netPnl: -5, hitRate: 0.3 }).title).toContain('Contrarian');
    expect(progressionFor({ settledTrades: 5, netPnl: 5, hitRate: 0.9 }).title).toBe('Rookie');
  });

  it('never goes negative on odd input', () => {
    const p = progressionFor({ settledTrades: -3, netPnl: 0, hitRate: null });
    expect(p.bandProgress).toBe(0);
    expect(p.toNext).toBe(10);
  });
});
