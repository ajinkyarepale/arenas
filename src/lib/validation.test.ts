import { describe, expect, it } from 'vitest';

import {
  createArenaSchema,
  emailSchema,
  joinCodeSchema,
  passwordSchema,
  placeTradeSchema,
  signUpSchema,
} from './validation';

describe('emailSchema', () => {
  it('lowercases and trims', () => {
    expect(emailSchema.parse('  Ada@College.EDU ')).toBe('ada@college.edu');
  });

  it('rejects non-emails', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('requires at least 8 characters', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('long-enough-1').success).toBe(true);
  });
});

describe('signUpSchema', () => {
  it('accepts a complete signup', () => {
    const parsed = signUpSchema.safeParse({
      name: 'Ada Chen',
      email: 'ada@college.edu',
      password: 'correct-horse-1',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.wantsOrganizer).toBe(false);
  });

  it('rejects short names and bad emails with field errors', () => {
    const parsed = signUpSchema.safeParse({ name: 'A', email: 'bad', password: 'long-enough-1' });
    expect(parsed.success).toBe(false);
  });
});

describe('joinCodeSchema', () => {
  it('uppercases and strips spaces/dashes', () => {
    expect(joinCodeSchema.parse('demo 24')).toBe('DEMO24');
    expect(joinCodeSchema.parse('demo-24')).toBe('DEMO24');
  });

  it('rejects short codes and symbols', () => {
    expect(joinCodeSchema.safeParse('AB').success).toBe(false);
    expect(joinCodeSchema.safeParse('AB!CD').success).toBe(false);
    expect(joinCodeSchema.safeParse('TOOLONGCODE123').success).toBe(false);
  });
});

describe('placeTradeSchema', () => {
  it('accepts stake-only and shares-only orders', () => {
    expect(placeTradeSchema.safeParse({ side: 'YES', stake: 25 }).success).toBe(true);
    expect(placeTradeSchema.safeParse({ side: 'NO', shares: 50 }).success).toBe(true);
  });

  it('rejects both, neither, negatives, and bad sides', () => {
    expect(placeTradeSchema.safeParse({ side: 'YES', stake: 25, shares: 10 }).success).toBe(false);
    expect(placeTradeSchema.safeParse({ side: 'YES' }).success).toBe(false);
    expect(placeTradeSchema.safeParse({ side: 'YES', stake: -5 }).success).toBe(false);
    expect(placeTradeSchema.safeParse({ side: 'MAYBE', stake: 5 }).success).toBe(false);
  });
});

describe('createArenaSchema', () => {
  const valid = {
    name: 'FinTech Night',
    asset: 'btcusdt',
    roundDurationSec: 300,
    lockBufferSec: 30,
    totalRounds: 12,
    startingBalance: 1000,
    liquidityParamB: 40,
    maxStakePerTrade: 250,
  };

  it('accepts a sane arena and normalises the asset', () => {
    const parsed = createArenaSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.asset).toBe('BTCUSDT');
  });

  it('rejects a lock buffer longer than the round', () => {
    const parsed = createArenaSchema.safeParse({ ...valid, lockBufferSec: 300, roundDurationSec: 300 });
    expect(parsed.success).toBe(false);
  });

  it('rejects a max stake above the starting balance', () => {
    const parsed = createArenaSchema.safeParse({ ...valid, maxStakePerTrade: 5000 });
    expect(parsed.success).toBe(false);
  });

  it('rejects absurd durations and counts', () => {
    expect(createArenaSchema.safeParse({ ...valid, roundDurationSec: 30 }).success).toBe(false);
    expect(createArenaSchema.safeParse({ ...valid, totalRounds: 500 }).success).toBe(false);
  });
});
