/**
 * In-process rate limiting.
 *
 * The platform runs as a single Node process (the custom server that also hosts
 * Socket.io and the round scheduler), so an in-memory limiter is both correct
 * and the cheapest thing that works. If this is ever scaled horizontally these
 * counters need to move to Redis — the trade limiter in particular, since it is
 * the one that protects the market.
 */

interface Bucket {
  count: number;
  resetAt: number;
  lastAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic sweep so a long-running event does not accumulate dead keys.
let lastSweep = Date.now();
function sweep(now: number): void {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitRule {
  /** Maximum number of hits inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
  /** Minimum gap between two consecutive hits, in milliseconds. */
  minIntervalMs?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Milliseconds until the caller may try again. */
  retryAfterMs: number;
  reason?: 'too-fast' | 'quota';
}

export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + rule.windowMs, lastAt: 0 };
    buckets.set(key, bucket);
  }

  if (rule.minIntervalMs && bucket.lastAt && now - bucket.lastAt < rule.minIntervalMs) {
    return {
      ok: false,
      remaining: Math.max(0, rule.limit - bucket.count),
      retryAfterMs: rule.minIntervalMs - (now - bucket.lastAt),
      reason: 'too-fast',
    };
  }

  if (bucket.count >= rule.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: bucket.resetAt - now,
      reason: 'quota',
    };
  }

  bucket.count += 1;
  bucket.lastAt = now;
  return {
    ok: true,
    remaining: rule.limit - bucket.count,
    retryAfterMs: 0,
  };
}

/** Drop a limiter key — used when a round resolves and its budget resets. */
export function clearRateLimit(prefix: string): void {
  for (const key of buckets.keys()) {
    if (key.startsWith(prefix)) buckets.delete(key);
  }
}

// --- Rules used across the app -------------------------------------------

/** Trades: generous enough for real play, tight enough to stop a script. */
export const TRADE_RULE: RateLimitRule = {
  limit: 25,
  windowMs: 60_000,
  minIntervalMs: 400,
};

/** Join attempts, keyed by user — the practical guard against code guessing. */
export const JOIN_RULE: RateLimitRule = {
  limit: 12,
  windowMs: 60_000,
  minIntervalMs: 500,
};

/** Signup, keyed by IP. */
export const SIGNUP_RULE: RateLimitRule = {
  limit: 6,
  windowMs: 15 * 60_000,
};

/** Arena creation, keyed by organizer. */
export const CREATE_ARENA_RULE: RateLimitRule = {
  limit: 20,
  windowMs: 60 * 60_000,
};
