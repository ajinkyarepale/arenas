import { describe, expect, it } from 'vitest';

import {
  formatArcs,
  formatCountdown,
  formatDateTimeIST,
  formatPoints,
  formatProbability,
  formatSignedArcs,
  formatTimeIST,
  ordinal,
} from './format';

describe('formatPoints', () => {
  it('groups thousands and honours decimals', () => {
    expect(formatPoints(12450)).toBe('12,450.00');
    expect(formatPoints(12450, 0)).toBe('12,450');
  });
});

describe('formatProbability', () => {
  it('renders 0..1 as a percentage', () => {
    expect(formatProbability(0.5234, 1)).toBe('52.3%');
    expect(formatProbability(0.5, 0)).toBe('50%');
  });
});

describe('Arcs formatting', () => {
  it('prefixes ARC in plain-text contexts', () => {
    expect(formatArcs(12450, 0)).toBe('ARC 12,450');
    expect(formatSignedArcs(350, 0)).toBe('+ARC 350');
    expect(formatSignedArcs(-120, 0)).toBe('−ARC 120');
    expect(formatSignedArcs(0, 0)).toBe('ARC 0');
  });
});

describe('formatCountdown', () => {
  it('renders mm:ss and h:mm:ss', () => {
    expect(formatCountdown(90_000)).toBe('01:30');
    expect(formatCountdown(3_723_000)).toBe('1:02:03');
    expect(formatCountdown(-500)).toBe('00:00');
  });
});

describe('ordinal', () => {
  it('uses English suffixes including teens', () => {
    expect([ordinal(1), ordinal(2), ordinal(3), ordinal(4), ordinal(11), ordinal(23)]).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '23rd',
    ]);
  });
});

describe('IST formatters', () => {
  // 2026-09-25T10:00:00Z == 15:30 IST.
  const ms = Date.UTC(2026, 8, 25, 10, 0, 0);

  it('formats 12-hour IST time regardless of host timezone', () => {
    expect(formatTimeIST(ms)).toContain('3:30');
    expect(formatTimeIST(ms)).toMatch(/PM/i);
    expect(formatTimeIST(ms)).toMatch(/:\d\d:\d\d/); // with seconds
    expect(formatTimeIST(ms, false)).not.toMatch(/:\d\d:\d\d/); // without
  });

  it('formats IST date-time with month and meridiem', () => {
    const out = formatDateTimeIST(ms);
    expect(out).toMatch(/25/);
    expect(out).toMatch(/Sep/i);
    expect(out).toMatch(/PM/i);
  });
});
