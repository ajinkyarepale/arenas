/**
 * Binance public REST price feed.
 *
 * Two things matter here for a live event:
 *
 *  1. We must never hammer Binance once per participant. Every quote goes
 *     through a short-lived cache, and the live ticker that clients see is a
 *     single server-side poller broadcasting over Socket.io.
 *  2. A round must never be resolved on a single tick. `sampleTwap` takes
 *     several readings and averages them, and reports honestly when it could
 *     not get enough data so the round can be voided instead of guessed.
 */

import { getStreamPrice } from '@/lib/price/binance-stream';

export interface PriceTick {
  symbol: string;
  price: number;
  at: number;
}

export interface Candle {
  /** Seconds since epoch — the format lightweight-charts expects. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export class PriceFeedError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'PriceFeedError';
  }
}

const BASE = process.env.BINANCE_REST_BASE?.replace(/\/$/, '') || 'https://api.binance.com';
const REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = 250;

const priceCache = new Map<string, PriceTick>();

export function normaliseSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

async function binanceFetch<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) {
      throw new PriceFeedError(`Binance responded ${res.status} for ${path}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof PriceFeedError) throw error;
    throw new PriceFeedError(`Binance request failed for ${path}`, error);
  } finally {
    clearTimeout(timer);
  }
}

/** Latest trade price, served from stream or sub-second cache. */
export async function getPrice(symbol: string, maxAgeMs = CACHE_TTL_MS): Promise<PriceTick> {
  const sym = normaliseSymbol(symbol);
  const streamTick = getStreamPrice(sym);
  if (streamTick && Date.now() - streamTick.at < 5000) {
    return streamTick;
  }

  const cached = priceCache.get(sym);
  const now = Date.now();
  if (cached && now - cached.at < maxAgeMs) return cached;

  const data = await binanceFetch<{ symbol: string; price: string }>(
    `/api/v3/ticker/price?symbol=${encodeURIComponent(sym)}`,
  );
  const price = Number.parseFloat(data.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new PriceFeedError(`Binance returned an unusable price for ${sym}: ${data.price}`);
  }

  const tick: PriceTick = { symbol: sym, price, at: Date.now() };
  priceCache.set(sym, tick);
  return tick;
}

/** Last known price without touching the network. Used by the socket layer. */
export function getCachedPrice(symbol: string): PriceTick | undefined {
  const sym = normaliseSymbol(symbol);
  return getStreamPrice(sym) ?? priceCache.get(sym);
}

/** Confirm a symbol exists before an organizer commits to it. */
export async function symbolExists(symbol: string): Promise<boolean> {
  try {
    await getPrice(symbol, 0);
    return true;
  } catch {
    return false;
  }
}

const SUPPORTED_INTERVALS = [
  { label: '1m', seconds: 60 },
  { label: '3m', seconds: 180 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
] as const;

/**
 * Pick the Binance kline interval that best matches a round duration, so the
 * chart candles line up with what participants are actually betting on.
 */
export function intervalForRoundDuration(roundDurationSec: number): string {
  let best: (typeof SUPPORTED_INTERVALS)[number] = SUPPORTED_INTERVALS[0];
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const candidate of SUPPORTED_INTERVALS) {
    const delta = Math.abs(candidate.seconds - roundDurationSec);
    if (delta < bestDelta) {
      best = candidate;
      bestDelta = delta;
    }
  }
  return best.label;
}

export async function getCandles(
  symbol: string,
  interval: string,
  limit = 60,
): Promise<Candle[]> {
  const sym = normaliseSymbol(symbol);
  const capped = Math.min(Math.max(limit, 1), 500);
  const raw = await binanceFetch<unknown[][]>(
    `/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(interval)}&limit=${capped}`,
  );

  return raw.map((k) => ({
    time: Math.floor(Number(k[0]) / 1000),
    open: Number.parseFloat(String(k[1])),
    high: Number.parseFloat(String(k[2])),
    low: Number.parseFloat(String(k[3])),
    close: Number.parseFloat(String(k[4])),
  }));
}

export interface TwapResult {
  /** Time-weighted (here: evenly sampled) average price, or null if unusable. */
  price: number | null;
  samples: number[];
  requested: number;
}

/**
 * Sample the price several times and average it.
 *
 * A single tick can be a wick, a stale quote, or a one-off print, and a round
 * settled on one of those is a round the room will argue about. We take
 * `samples` readings `intervalMs` apart and average whatever comes back. If
 * fewer than half the samples land, the caller should void the round rather
 * than resolve it on thin data.
 */
export async function sampleTwap(
  symbol: string,
  samples = Number(process.env.TWAP_SAMPLES ?? 6),
  intervalMs = Number(process.env.TWAP_INTERVAL_MS ?? 1000),
): Promise<TwapResult> {
  const count = Math.max(1, Math.min(samples, 20));
  const collected: number[] = [];

  for (let i = 0; i < count; i += 1) {
    try {
      // maxAge 0 forces a real read — a cached value would defeat the average.
      const tick = await getPrice(symbol, 0);
      collected.push(tick.price);
    } catch {
      // Swallow individual failures; the count check below is the real gate.
    }
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  if (collected.length === 0 || collected.length * 2 < count) {
    return { price: null, samples: collected, requested: count };
  }

  const mean = collected.reduce((sum, p) => sum + p, 0) / collected.length;
  return { price: mean, samples: collected, requested: count };
}
