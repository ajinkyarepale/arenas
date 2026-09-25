'use client';

import { useCountdown } from '@/hooks/use-arena';
import { cx, formatCountdown, formatTimeIST } from '@/lib/format';
import type { RoundPayload } from '@/lib/realtime/events';

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
  trading: 'Locks in',
  closing: 'Locking',
  locked: 'Resolving in',
  resolved: 'Settled',
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
        ? 'text-fg-faint'
        : remaining <= 30_000
          ? 'text-warn'
          : 'text-fg';

  const targetMs = target ? new Date(target).getTime() : null;

  return (
    <div className={cx('flex flex-col items-end gap-1 text-right', className)}>
      <div
        className={cx(
          'text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint',
          (phase === 'closing' || phase === 'locked') && '!text-no',
        )}
      >
        {PHASE_LABEL[phase]}
      </div>
      <div
        className={cx(
          'tnum font-mono font-bold leading-none tracking-tight',
          isDisplay ? 'text-giga' : 'text-4xl sm:text-5xl',
          tone,
          phase === 'closing' && 'animate-pulse',
        )}
        aria-live="off"
      >
        {phase === 'resolved' ? '--:--' : formatCountdown(remaining)}
      </div>
      {targetMs && phase !== 'resolved' ? (
        <div className="tnum font-mono text-[11px] text-fg-faint" title="Shown in IST (Asia/Kolkata)">
          {formatTimeIST(targetMs)} IST
        </div>
      ) : null}
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
    <div className="flex flex-col gap-0.5">
      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">Round</div>
      <div className={cx('tnum font-extrabold leading-none tracking-tight text-fg', isDisplay ? 'text-6xl' : 'text-xl')}>
        {round > 0 ? round : '—'}
        <span className={cx('font-semibold text-fg-faint', isDisplay ? 'text-4xl' : 'text-sm')}> / {totalRounds}</span>
      </div>
    </div>
  );
}
