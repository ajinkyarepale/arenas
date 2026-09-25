/**
 * Arena Monte Carlo.
 *
 * Answers the questions the cost function cannot answer on its own: with N real
 * people in the room and liquidity `b`, how many trades land, what shape does
 * the YES trace draw, does the market end up right, and does knowing what you
 * are doing actually pay?
 *
 * It drives the REAL `src/lib/lmsr` module — same cost function, same
 * invertible budget quoting the trade panel uses — against a synthetic BTC path
 * and a room of traders with mixed skill. Nothing is fitted to a desired
 * answer; the price is whatever the simulated crowd's money says it is.
 *
 *   npx tsx scripts/simulate-arena.ts
 */

import { priceYes, quoteByBudget, type MarketState, type Side } from '../src/lib/lmsr';

// ---------------------------------------------------------------------------
// Random numbers — seeded, so a run is reproducible and every config is scored
// against the same set of BTC paths.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function gauss(rng: Rng): number {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Abramowitz and Stegun 7.1.26 — absolute error under 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax);
  return sign * y;
}

const normalCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));
const clamp = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

/** BTC at roughly 50% annualised vol, expressed per second. */
const SIGMA_SEC = 0.5 / Math.sqrt(365 * 24 * 3600);
const SPOT0 = 110_000;

/**
 * Model-fair probability that the candle closes above its open, given the price
 * now and the seconds left. Pure random walk, no drift. The sqrt(T) is what
 * makes the honest answer converge on 0 or 1 as the bell approaches.
 */
function fairValue(spot: number, strike: number, secondsLeft: number): number {
  const T = Math.max(secondsLeft, 1);
  return clamp(
    normalCdf(Math.log(spot / strike) / (SIGMA_SEC * Math.sqrt(T))),
    0.001,
    0.999,
  );
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------

/**
 * Four ways a person in a lecture hall forms a view. The mix matters more than
 * any one of them: a room of pure quants prices efficiently and is boring to
 * watch, a room of pure gamblers prices noise and teaches nobody anything.
 */
type Archetype = 'quant' | 'chartist' | 'gambler' | 'fader';

interface ArchetypeSpec {
  kind: Archetype;
  share: number;
  /** Mean seconds between glances at the screen. */
  lookEvery: number;
  /** Mispricing they need to see before they act. */
  edgeNeeded: number;
  /** Fraction of balance committed at full conviction. */
  aggression: number;
}

const ROOM: ArchetypeSpec[] = [
  // Reads the move against the clock. Rare in a college hall.
  { kind: 'quant', share: 0.12, lookEvery: 18, edgeNeeded: 0.05, aggression: 0.16 },
  // Sees BTC green, buys YES. Right about the sign, wrong about the magnitude.
  { kind: 'chartist', share: 0.44, lookEvery: 22, edgeNeeded: 0.07, aggression: 0.13 },
  // Here for the leaderboard, not the theory.
  { kind: 'gambler', share: 0.28, lookEvery: 26, edgeNeeded: 0.05, aggression: 0.11 },
  // Instinctively sells anything that looks too certain.
  { kind: 'fader', share: 0.16, lookEvery: 30, edgeNeeded: 0.09, aggression: 0.12 },
];

interface Trader {
  kind: Archetype;
  balance: number;
  /** Persistent personal bias — some people are simply wrong all night. */
  bias: number;
  lookEvery: number;
  edgeNeeded: number;
  aggression: number;
}

function buildRoom(n: number, rng: Rng): Trader[] {
  const traders: Trader[] = [];
  for (const spec of ROOM) {
    const count = Math.round(n * spec.share);
    for (let i = 0; i < count; i += 1) {
      traders.push({
        kind: spec.kind,
        balance: 0,
        bias: gauss(rng) * (spec.kind === 'quant' ? 0.04 : 0.1),
        // Attention varies a lot around the archetype mean.
        lookEvery: spec.lookEvery * (0.5 + rng()),
        edgeNeeded: spec.edgeNeeded,
        aggression: spec.aggression,
      });
    }
  }
  while (traders.length > n) traders.pop();
  while (traders.length < n) traders.push({ ...traders[traders.length - 1] });
  return traders;
}

/** What this person thinks the probability is, right now. */
function belief(
  trader: Trader,
  spot: number,
  strike: number,
  secondsLeft: number,
  rng: Rng,
): number {
  const model = fairValue(spot, strike, secondsLeft);
  const move = Math.log(spot / strike);

  switch (trader.kind) {
    case 'quant':
      return clamp(model + trader.bias + gauss(rng) * 0.03, 0.01, 0.99);

    case 'chartist': {
      // Extrapolates direction, ignores how little time is left.
      const naive = 0.5 + 0.5 * Math.tanh(move / (SIGMA_SEC * Math.sqrt(120)) / 1.4);
      return clamp(naive + trader.bias + gauss(rng) * 0.07, 0.01, 0.99);
    }

    case 'gambler':
      return clamp(
        0.5 + 0.35 * gauss(rng) + trader.bias + 0.25 * (model - 0.5),
        0.01,
        0.99,
      );

    case 'fader':
      return clamp(0.5 + 0.55 * (model - 0.5) + trader.bias + gauss(rng) * 0.05, 0.01, 0.99);
  }
}

// ---------------------------------------------------------------------------
// One round
// ---------------------------------------------------------------------------

interface Config {
  n: number;
  b: number;
  /** Scales how hard the room bets and how often it looks. 1 = base case. */
  engagement?: number;
  roundSec: number;
  lockSec: number;
  maxStake: number;
  startBalance: number;
  rounds: number;
}

interface RoundResult {
  trades: number;
  volume: number;
  stakes: number[];
  /** Implied probability sampled once a second across the whole round. */
  path: number[];
  /** Model-fair probability at the same instants, for comparison. */
  modelPath: number[];
  /** Absolute probability jump caused by each individual fill. */
  jumps: number[];
  outcome: Side;
  pAtLock: number;
  subsidy: number;
}

function simulateRound(cfg: Config, traders: Trader[], rng: Rng): RoundResult {
  const strike = SPOT0;
  let spot = strike;
  let state: MarketState = { qYes: 0, qNo: 0 };

  const tradingSec = cfg.roundSec - cfg.lockSec;
  const path: number[] = [];
  const modelPath: number[] = [];
  const jumps: number[] = [];
  const stakes: number[] = [];
  let volume = 0;
  let paidOutShares = 0;

  const positions = traders.map(() => ({ yes: 0, no: 0 }));

  for (let t = 1; t <= cfg.roundSec; t += 1) {
    spot *= Math.exp(SIGMA_SEC * gauss(rng) - 0.5 * SIGMA_SEC * SIGMA_SEC);
    const secondsLeft = cfg.roundSec - t;

    if (t <= tradingSec) {
      for (let i = 0; i < traders.length; i += 1) {
        const trader = traders[i];
        // Poisson glance at the screen.
        if (rng() > 1 / trader.lookEvery) continue;

        const pMkt = priceYes(state, cfg.b);
        const view = belief(trader, spot, strike, secondsLeft, rng);
        const edge = view - pMkt;
        if (Math.abs(edge) < trader.edgeNeeded) continue;

        const side: Side = edge > 0 ? 'YES' : 'NO';
        const conviction = Math.min(1, Math.abs(edge) / 0.25);
        const stake = Math.min(
          cfg.maxStake,
          trader.balance,
          Math.max(
            1,
            trader.balance * trader.aggression * conviction * (cfg.engagement ?? 1),
          ),
        );
        if (stake < 1) continue;

        const quote = quoteByBudget(state, side, stake, cfg.b);
        if (quote.shares <= 0) continue;

        jumps.push(Math.abs(quote.priceAfter - quote.priceBefore));
        trader.balance -= quote.cost;
        volume += quote.cost;
        stakes.push(quote.cost);
        if (side === 'YES') positions[i].yes += quote.shares;
        else positions[i].no += quote.shares;
        state = quote.state;
      }
    }

    path.push(priceYes(state, cfg.b));
    modelPath.push(fairValue(spot, strike, Math.max(secondsLeft, 1)));
  }

  const outcome: Side = spot > strike ? 'YES' : 'NO';

  for (let i = 0; i < traders.length; i += 1) {
    const won = outcome === 'YES' ? positions[i].yes : positions[i].no;
    traders[i].balance += won;
    paidOutShares += won;
  }

  return {
    trades: jumps.length,
    volume,
    stakes,
    path,
    modelPath,
    jumps,
    outcome,
    pAtLock: path[tradingSec - 1] ?? 0.5,
    // What the house handed out beyond what it took in.
    subsidy: paidOutShares - volume,
  };
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : 0);

function quantile(xs: number[], q: number): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, c) => a - c);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

function correlation(a: number[], c: number[]): number {
  const n = Math.min(a.length, c.length);
  if (n < 2) return 0;
  const ma = mean(a.slice(0, n));
  const mc = mean(c.slice(0, n));
  let num = 0;
  let da = 0;
  let dc = 0;
  for (let i = 0; i < n; i += 1) {
    const x = a[i] - ma;
    const y = c[i] - mc;
    num += x * y;
    da += x * x;
    dc += y * y;
  }
  return da && dc ? num / Math.sqrt(da * dc) : 0;
}

interface Summary {
  n: number;
  b: number;
  tradesPerRound: number;
  fillsPerMin: number;
  avgStake: number;
  volumePerRound: number;
  amplitude: number;
  medianJump: number;
  p99Jump: number;
  biggestJump: number;
  pinnedPct: number;
  crossings: number;
  hitRate: number;
  brier: number;
  trackingCorr: number;
  subsidyPerRound: number;
  pnlByKind: Record<Archetype, number>;
  spread: number;
}

function push(target: number[], source: number[]): void {
  // Avoid spread — these arrays get long enough to blow the argument limit.
  for (let i = 0; i < source.length; i += 1) target.push(source[i]);
}

function run(cfg: Config, seeds: number): Summary {
  const trades: number[] = [];
  const stakes: number[] = [];
  const volume: number[] = [];
  const amplitude: number[] = [];
  const jumps: number[] = [];
  const maxJump: number[] = [];
  const pinned: number[] = [];
  const crossings: number[] = [];
  const hits: number[] = [];
  const brier: number[] = [];
  const corr: number[] = [];
  const subsidy: number[] = [];
  const finals: number[] = [];
  const pnl: Record<Archetype, number[]> = {
    quant: [],
    chartist: [],
    gambler: [],
    fader: [],
  };

  for (let s = 0; s < seeds; s += 1) {
    const rng = mulberry32(1000 + s * 7919);
    const traders = buildRoom(cfg.n, rng);
    for (const trader of traders) trader.balance = cfg.startBalance;

    for (let r = 0; r < cfg.rounds; r += 1) {
      const res = simulateRound(cfg, traders, rng);
      trades.push(res.trades);
      push(stakes, res.stakes);
      volume.push(res.volume);
      amplitude.push(Math.max(...res.path) - Math.min(...res.path));
      push(jumps, res.jumps);
      maxJump.push(res.jumps.length ? Math.max(...res.jumps) : 0);
      pinned.push(res.path.filter((p) => p < 0.05 || p > 0.95).length / res.path.length);

      let cross = 0;
      for (let i = 1; i < res.path.length; i += 1) {
        if ((res.path[i - 1] - 0.5) * (res.path[i] - 0.5) < 0) cross += 1;
      }
      crossings.push(cross);

      const truth = res.outcome === 'YES' ? 1 : 0;
      hits.push((res.pAtLock > 0.5 ? 1 : 0) === truth ? 1 : 0);
      brier.push((res.pAtLock - truth) ** 2);
      corr.push(correlation(res.path, res.modelPath));
      subsidy.push(res.subsidy);
    }

    for (const trader of traders) {
      pnl[trader.kind].push(trader.balance - cfg.startBalance);
      finals.push(trader.balance);
    }
  }

  // Spread between a top-quartile and bottom-quartile finish — how much the
  // leaderboard actually separates people.
  const spread = quantile(finals, 0.9) - quantile(finals, 0.1);

  return {
    n: cfg.n,
    b: cfg.b,
    tradesPerRound: mean(trades),
    fillsPerMin: (mean(trades) / (cfg.roundSec - cfg.lockSec)) * 60,
    avgStake: mean(stakes),
    volumePerRound: mean(volume),
    amplitude: mean(amplitude),
    medianJump: quantile(jumps, 0.5),
    p99Jump: quantile(jumps, 0.99),
    biggestJump: mean(maxJump),
    pinnedPct: mean(pinned) * 100,
    crossings: mean(crossings),
    hitRate: mean(hits) * 100,
    brier: mean(brier),
    trackingCorr: mean(corr),
    subsidyPerRound: mean(subsidy),
    spread,
    pnlByKind: {
      quant: mean(pnl.quant),
      chartist: mean(pnl.chartist),
      gambler: mean(pnl.gambler),
      fader: mean(pnl.fader),
    },
  };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const pad = (s: string | number, w: number) => String(s).padStart(w);
const f = (x: number, d = 1) => x.toFixed(d);

function table(
  title: string,
  rows: Summary[],
  cols: Array<[string, number, (s: Summary) => string | number]>,
): void {
  console.log(`\n${title}`);
  console.log(cols.map(([h, w]) => pad(h, w)).join('  '));
  console.log(cols.map(([, w]) => '-'.repeat(w)).join('  '));
  for (const row of rows) {
    console.log(cols.map(([, w, get]) => pad(get(row), w)).join('  '));
  }
}

const SEEDS = Number(process.env.SEEDS ?? 24);

const base = {
  roundSec: 300,
  lockSec: 30,
  maxStake: 250,
  startBalance: 1000,
  rounds: 12,
};

console.log(
  `Arena Monte Carlo - ${SEEDS} seeds x ${base.rounds} rounds, ` +
    `${base.roundSec}s rounds (${base.roundSec - base.lockSec}s trading), BTC at 50% vol`,
);

const peopleSweep = [5, 10, 25, 50, 100].map((n) => run({ ...base, n, b: 40 }, SEEDS));

table('SWEEP 1 - headcount at the current b = 40', peopleSweep, [
  ['people', 6, (s) => s.n],
  ['trades/rd', 9, (s) => f(s.tradesPerRound, 0)],
  ['fills/min', 9, (s) => f(s.fillsPerMin, 1)],
  ['avg stake', 9, (s) => f(s.avgStake, 0)],
  ['vol/rd', 8, (s) => f(s.volumePerRound, 0)],
  ['amplitud', 8, (s) => f(s.amplitude * 100, 0) + '%'],
  ['medjump', 7, (s) => f(s.medianJump * 100, 1) + '%'],
  ['pinned', 7, (s) => f(s.pinnedPct, 0) + '%'],
  ['hit%', 5, (s) => f(s.hitRate, 0)],
]);

const bSweep = [40, 200, 500, 800, 1200, 2000, 3000].map((b) =>
  run({ ...base, n: 50, b }, SEEDS),
);

table('SWEEP 2 - liquidity b, with 50 active traders', bSweep, [
  ['b', 5, (s) => s.b],
  ['trades/rd', 9, (s) => f(s.tradesPerRound, 0)],
  ['fills/min', 9, (s) => f(s.fillsPerMin, 1)],
  ['avg stake', 9, (s) => f(s.avgStake, 0)],
  ['vol/rd', 8, (s) => f(s.volumePerRound, 0)],
  ['amplitud', 8, (s) => f(s.amplitude * 100, 0) + '%'],
  ['medjump', 7, (s) => f(s.medianJump * 100, 2) + '%'],
  ['p99jump', 7, (s) => f(s.p99Jump * 100, 1) + '%'],
  ['maxjump', 7, (s) => f(s.biggestJump * 100, 1) + '%'],
  ['pinned', 7, (s) => f(s.pinnedPct, 0) + '%'],
  ['flips', 6, (s) => f(s.crossings, 1)],
]);

table('SWEEP 2b - is it comprehensible? (50 traders)', bSweep, [
  ['b', 5, (s) => s.b],
  ['hit%', 6, (s) => f(s.hitRate, 0)],
  ['brier', 6, (s) => f(s.brier, 3)],
  ['trackmodel', 10, (s) => f(s.trackingCorr, 2)],
  ['subsid/rd', 9, (s) => f(s.subsidyPerRound, 0)],
  ['quant', 7, (s) => f(s.pnlByKind.quant, 0)],
  ['chartist', 8, (s) => f(s.pnlByKind.chartist, 0)],
  ['gambler', 8, (s) => f(s.pnlByKind.gambler, 0)],
  ['fader', 7, (s) => f(s.pnlByKind.fader, 0)],
  ['spread', 7, (s) => f(s.spread, 0)],
]);

const thinRoom = [5, 10, 20, 35, 50, 75].map((n) => run({ ...base, n, b: 1200 }, SEEDS));

table('SWEEP 3 - b = 1200 across turnout risk', thinRoom, [
  ['people', 6, (s) => s.n],
  ['trades/rd', 9, (s) => f(s.tradesPerRound, 0)],
  ['fills/min', 9, (s) => f(s.fillsPerMin, 1)],
  ['amplitud', 8, (s) => f(s.amplitude * 100, 0) + '%'],
  ['medjump', 7, (s) => f(s.medianJump * 100, 2) + '%'],
  ['pinned', 7, (s) => f(s.pinnedPct, 0) + '%'],
  ['hit%', 6, (s) => f(s.hitRate, 0)],
  ['tracks', 7, (s) => f(s.trackingCorr, 2)],
]);

// --- Sweep 4: how sensitive is the answer to how hard the room bets? --------
//
// The stake sizes above are my assumption, not your data. This sweep varies
// them and reports the liquidity that keeps the median trade near a 1.5%
// probability step -- smooth on screen, still visible.

const ENGAGEMENT: Array<[string, number]> = [
  ['timid (~15pt avg)', 0.25],
  ['light (~28pt avg)', 0.5],
  ['base  (~55pt avg)', 1],
  ['heavy (~95pt avg)', 2],
];

console.log('');
console.log('SWEEP 4 - sensitivity to how hard the room bets (50 traders)');
console.log(
  `${pad('room', 18)}  ${pad('avg stake', 9)}  ${pad('vol/rd', 8)}  ` +
    [500, 800, 1200, 2000].map((b) => pad(`b=${b}`, 12)).join('  '),
);
console.log(
  `${'-'.repeat(18)}  ${'-'.repeat(9)}  ${'-'.repeat(8)}  ` +
    [500, 800, 1200, 2000].map(() => '-'.repeat(12)).join('  '),
);

for (const [label, engagement] of ENGAGEMENT) {
  const cells = [500, 800, 1200, 2000].map((b) => {
    const r = run({ ...base, n: 50, b, engagement }, 12);
    return pad(`${f(r.medianJump * 100, 2)}% ${f(r.amplitude * 100, 0)}%`, 12);
  });
  const ref = run({ ...base, n: 50, b: 1200, engagement }, 12);
  console.log(
    `${pad(label, 18)}  ${pad(f(ref.avgStake, 0), 9)}  ${pad(f(ref.volumePerRound, 0), 8)}  ` +
      cells.join('  '),
  );
}
console.log('');
console.log('  cells show: median probability step per trade / price range across the round');
console.log('  target: step near 1.5% (smooth line), range above 35% (visible movement)');
