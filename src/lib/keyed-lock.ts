/**
 * A per-key async mutex.
 *
 * Trades against one round are serialised through this so that a room tapping
 * BUY simultaneously queues instead of colliding. Each trade is one short
 * transaction, so the queue drains in milliseconds; the alternative — letting
 * every request race the optimistic-concurrency guard — means most of them lose
 * the race and get rejected, which is what a participant experiences as "my
 * trade didn't go through".
 *
 * This serialises within one process. The compare-and-set guard in the trading
 * module is still the actual correctness boundary, and still handles the
 * multi-process case; this lock exists to keep contention off it.
 */

const tails = new Map<string, Promise<unknown>>();

export async function withKeyedLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const previous = tails.get(key) ?? Promise.resolve();

  // Run after the predecessor regardless of whether it resolved or rejected —
  // one failed trade must not wedge the queue for everyone behind it.
  const mine = previous.then(
    () => fn(),
    () => fn(),
  );

  const settled = mine.then(
    () => undefined,
    () => undefined,
  );
  tails.set(key, settled);

  try {
    return await mine;
  } finally {
    // Only drop the key if nobody queued behind us.
    if (tails.get(key) === settled) tails.delete(key);
  }
}

/** How many callers are queued on a key. Exposed for tests and diagnostics. */
export function isLocked(key: string): boolean {
  return tails.has(key);
}
