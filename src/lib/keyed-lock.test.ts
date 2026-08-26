import { describe, expect, it } from 'vitest';

import { isLocked, withKeyedLock } from './keyed-lock';

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe('withKeyedLock', () => {
  it('runs callers on the same key one at a time', async () => {
    const order: string[] = [];
    let concurrent = 0;
    let peak = 0;

    const job = (label: string) =>
      withKeyedLock('same', async () => {
        concurrent += 1;
        peak = Math.max(peak, concurrent);
        order.push(`start:${label}`);
        await tick(5);
        order.push(`end:${label}`);
        concurrent -= 1;
      });

    await Promise.all([job('a'), job('b'), job('c')]);

    expect(peak).toBe(1);
    expect(order).toEqual([
      'start:a',
      'end:a',
      'start:b',
      'end:b',
      'start:c',
      'end:c',
    ]);
  });

  it('does not serialise across different keys', async () => {
    let concurrent = 0;
    let peak = 0;

    const job = (key: string) =>
      withKeyedLock(key, async () => {
        concurrent += 1;
        peak = Math.max(peak, concurrent);
        await tick(5);
        concurrent -= 1;
      });

    await Promise.all([job('one'), job('two'), job('three')]);
    expect(peak).toBe(3);
  });

  it('returns each callers own value', async () => {
    const results = await Promise.all([
      withKeyedLock('k', async () => 1),
      withKeyedLock('k', async () => 2),
      withKeyedLock('k', async () => 3),
    ]);
    expect(results).toEqual([1, 2, 3]);
  });

  it('lets the queue continue after one caller throws', async () => {
    const seen: string[] = [];

    const failing = withKeyedLock('k', async () => {
      seen.push('failing');
      throw new Error('boom');
    });
    const following = withKeyedLock('k', async () => {
      seen.push('following');
      return 'ok';
    });

    await expect(failing).rejects.toThrow('boom');
    await expect(following).resolves.toBe('ok');
    expect(seen).toEqual(['failing', 'following']);
  });

  it('releases the key once the queue drains', async () => {
    const pending = withKeyedLock('drain', async () => {
      expect(isLocked('drain')).toBe(true);
      await tick(1);
    });
    await pending;
    // Let the finally-block cleanup settle.
    await tick(0);
    expect(isLocked('drain')).toBe(false);
  });

  it('preserves ordering under a burst', async () => {
    const order: number[] = [];
    await Promise.all(
      Array.from({ length: 50 }, (_, i) =>
        withKeyedLock('burst', async () => {
          order.push(i);
          await tick(0);
        }),
      ),
    );
    expect(order).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });
});
