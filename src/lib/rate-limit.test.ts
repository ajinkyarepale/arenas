import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkRateLimit, clearRateLimit } from './rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    clearRateLimit('test:');
    vi.useRealTimers();
  });

  it('allows up to the limit, then reports quota with a retry delay', () => {
    const rule = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit('test:quota', rule)).toMatchObject({ ok: true, remaining: 2 });
    expect(checkRateLimit('test:quota', rule)).toMatchObject({ ok: true, remaining: 1 });
    expect(checkRateLimit('test:quota', rule)).toMatchObject({ ok: true, remaining: 0 });
    const blocked = checkRateLimit('test:quota', rule);
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toBe('quota');
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('enforces a minimum interval between hits', () => {
    const rule = { limit: 100, windowMs: 60_000, minIntervalMs: 60_000 };
    expect(checkRateLimit('test:fast', rule).ok).toBe(true);
    const second = checkRateLimit('test:fast', rule);
    expect(second.ok).toBe(false);
    expect(second.reason).toBe('too-fast');
  });

  it('resets the quota once the window passes', () => {
    vi.useFakeTimers();
    try {
      const rule = { limit: 1, windowMs: 50 };
      expect(checkRateLimit('test:window', rule).ok).toBe(true);
      expect(checkRateLimit('test:window', rule).ok).toBe(false);
      vi.advanceTimersByTime(60);
      expect(checkRateLimit('test:window', rule).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('isolates buckets by key', () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit('test:a', rule).ok).toBe(true);
    expect(checkRateLimit('test:b', rule).ok).toBe(true);
    expect(checkRateLimit('test:a', rule).ok).toBe(false);
  });

  it('clearRateLimit drops only the matching prefix', () => {
    const rule = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit('test:x', rule).ok).toBe(true);
    expect(checkRateLimit('other:x', rule).ok).toBe(true);
    clearRateLimit('test:');
    expect(checkRateLimit('test:x', rule).ok).toBe(true);
    expect(checkRateLimit('other:x', rule).ok).toBe(false);
  });
});
