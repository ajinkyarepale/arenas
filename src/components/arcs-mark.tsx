'use client';

import { cx, formatPoints } from '@/lib/format';

/**
 * Arcs (ARC) — the official virtual currency of Arenas.
 *
 * The mark is a true turned-A (Ɐ): two strokes meeting at a bottom apex with
 * a crossbar near the top — the inverse of a capital A. Drawn as strokes so it
 * stays sharp at any size and inherits `currentColor`. Always pair with
 * tabular numerals. Virtual credits only — no cash value, non-withdrawable.
 *
 * NOTE: never render the raw Ɐ character in UI strings (font support varies
 * and it degrades to a plain "A" or tofu). Use this SVG via <Arcs />; plain
 * text contexts (API errors, aria-labels) use the "ARC" prefix instead.
 */

export function ArcsMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cx('inline-block h-[1em] w-[1em] shrink-0', className)}
    >
      <path
        d="M2.6 3.4 8 13.2l5.4-9.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.9 6.6h6.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A currency value: mark + tabular number, e.g. Ɐ 12,450. */
export function Arcs({
  value,
  decimals = 2,
  className,
  markClassName,
}: {
  value: number;
  decimals?: number;
  className?: string;
  markClassName?: string;
}) {
  return (
    <span className={cx('tnum inline-flex items-baseline gap-[0.3em] whitespace-nowrap', className)}>
      <ArcsMark className={markClassName} />
      <span>{formatPoints(value, decimals)}</span>
    </span>
  );
}

/** Signed variant for P&L: +Ɐ 350 / −Ɐ 120. */
export function ArcsSigned({
  value,
  decimals = 2,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return (
    <span className={cx('tnum inline-flex items-baseline gap-[0.3em] whitespace-nowrap', className)}>
      <span aria-hidden>{sign}</span>
      <ArcsMark />
      <span>{formatPoints(Math.abs(value), decimals)}</span>
    </span>
  );
}
