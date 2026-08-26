'use client';

import { useCountdown } from '@/hooks/use-arena';
import { cx, formatCountdown } from '@/lib/format';
import type { RoundPayload } from '@/lib/realtime/events';

/**
 * The countdown.
 *
 * Along with the implied price this is one of the two things people stare at
 * for the entire round, so it gets tabular numerals (digits must not jitter),
 * the largest type on the screen, and a colour that changes meaning: neutral
 * while trading, amber in the final seconds before lock, red once locked.
 */

export type RoundPhase = 'waiting' | 'trading' | 'closing' | 'locked' | 'resolved';

export function roundPhase(round: RoundPayload | null, now: number): RoundPhase {
  if (!round) return 'waiting';
  if (round.status === 'RESOLVED') return 'resolved';
  if (round.status === 'LOCKED') return 'locked';
  if (round.status === 'PENDING') return 'waiting';

  const locksAt = round.locksAt ? new Date(round.locksAt).getTime() : null;
  if (locksAt && now >= locksAt) return 'locked';
  if (locksAt && locksAt - now <= 10_000) return 'closing';
  return 'trading';
}

const PHASE_LABEL: Record<RoundPhase, string> = {
  waiting: 'Next round',
  trading: 'Trading closes in',
  closing: 'Closing',
  locked: 'Locked — resolving in',
  resolved: 'Round settled',
};

export function RoundTimer({
  round,
  clockOffsetMs,
  variant = 'compact',
  className,
}: {
  round: RoundPayload | null;
  clockOffsetMs: number;
  variant?: 'compact' | 'display';
  className?: string;
}) {
  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);

  // Before lock we count down to lock; after lock, to resolution.
  const target =
    phase === 'locked' || phase === 'resolved'
      ? (round?.resolvesAt ?? null)
      : (round?.locksAt ?? null);

  const remaining = useCountdown(target, clockOffsetMs);
  const isDisplay = variant === 'display';

  const tone =
    phase === 'locked' || phase === 'closing'
      ? 'text-no'
      : phase === 'resolved'
        ? 'text-fg-muted'
        : remaining <= 30_000
          ? 'text-warn'
          : 'text-fg';

  return (
    <div className={cx('flex flex-col', isDisplay ? 'gap-2' : 'gap-1', className)}>
      <div
        className={cx(
          'label',
          isDisplay && '!text-base !tracking-[0.2em]',
          (phase === 'closing' || phase === 'locked') && 'text-no',
        )}
      >
        {PHASE_LABEL[phase]}
      </div>
      <div
        className={cx(
          'font-display tnum font-bold leading-none tracking-tight',
          isDisplay ? 'text-giga' : 'text-5xl sm:text-6xl',
          tone,
          phase === 'closing' && 'animate-pulse-slow',
        )}
        // Announced politely so a screen reader is not interrupted every second.
        aria-live="off"
      >
        {phase === 'resolved' ? '--:--' : formatCountdown(remaining)}
      </div>
    </div>
  );
}

export function RoundCounter({
  round,
  totalRounds,
  variant = 'compact',
}: {
  round: number;
  totalRounds: number;
  variant?: 'compact' | 'display';
}) {
  const isDisplay = variant === 'display';
  return (
    <div className="flex flex-col gap-1">
      <div className={cx('label', isDisplay && '!text-base !tracking-[0.2em]')}>Round</div>
      <div
        className={cx(
          'tnum font-bold leading-none tracking-tight',
          isDisplay ? 'text-6xl' : 'text-2xl',
        )}
      >
        {round > 0 ? round : '—'}
        <span className={cx('text-fg-faint', isDisplay ? 'text-4xl' : 'text-lg')}>
          {' '}
          / {totalRounds}
        </span>
      </div>
    </div>
  );
}
