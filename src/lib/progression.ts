/**
 * Trader progression — titles and levels derived entirely from real,
 * already-computed stats. No separate XP ledger, no inventable points:
 * a title is a deterministic function of (settledTrades, netPnl, hitRate,
 * longestWinStreak), so it can never drift from the portfolio beneath it.
 */

export interface Progression {
  level: number;
  title: string;
  flavor: string;
  /** Settled trades to the next level, or null at the cap. */
  toNext: number | null;
  /** 0..1 progress within the current level band. */
  bandProgress: number;
}

const BANDS: Array<{ min: number; title: string; flavor: string }> = [
  { min: 0, title: 'Rookie', flavor: 'Every sharp was a rookie for eleven rounds.' },
  { min: 10, title: 'Regular', flavor: 'You show up, you size, you learn the board.' },
  { min: 40, title: 'Sharp', flavor: 'Your prices mean something now.' },
  { min: 120, title: 'Apex', flavor: 'The room watches your fills.' },
];

export function progressionFor(stats: {
  settledTrades: number;
  netPnl: number;
  hitRate: number | null;
}): Progression {
  const settled = Math.max(0, Math.floor(stats.settledTrades));
  let band = 0;
  for (let i = 0; i < BANDS.length; i += 1) {
    if (settled >= BANDS[i].min) band = i;
  }
  const current = BANDS[band];
  const next = BANDS[band + 1] ?? null;

  const floor = current.min;
  const ceil = next ? next.min : floor + 1;
  const bandProgress = next
    ? Math.min(1, Math.max(0, (settled - floor) / (ceil - floor)))
    : 1;

  // Flavor suffix from accuracy, when enough history exists.
  let title = current.title;
  if (settled >= 10 && stats.hitRate !== null) {
    if (stats.hitRate >= 0.6) title = `${current.title} · Hot hand`;
    else if (stats.hitRate <= 0.4) title = `${current.title} · Contrarian`;
  }

  return {
    level: band + 1,
    title,
    flavor: current.flavor,
    toNext: next ? next.min - settled : null,
    bandProgress,
  };
}
