'use client';

import { useEffect, useRef, useState } from 'react';

import { cx, formatProbability } from '@/lib/format';

/**
 * The live implied probability of YES — the market's answer to "does this
 * candle close green?".
 *
 * Flashes green or red on every change. If no predictions have been placed in the
 * round yet, renders a clear empty state rather than a misleading default percentage.
 */
export function ProbabilityReadout({
  value,
  tradeCount,
  hasPredictions,
  variant = 'compact',
  label = 'Chance the candle closes UP',
  className,
}: {
  value: number | null;
  tradeCount?: number;
  hasPredictions?: boolean;
  variant?: 'compact' | 'display';
  label?: string;
  className?: string;
}) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const previous = useRef(value);

  const isEmpty =
    hasPredictions === false ||
    tradeCount === 0 ||
    value === null ||
    !Number.isFinite(value);

  useEffect(() => {
    if (value === null || previous.current === null) {
      previous.current = value;
      return;
    }
    const delta = value - previous.current;
    if (Math.abs(delta) > 0.0005) {
      setFlash(delta > 0 ? 'up' : 'down');
      const timer = setTimeout(() => setFlash(null), 600);
      previous.current = value;
      return () => clearTimeout(timer);
    }
    previous.current = value;
  }, [value]);

  const isDisplay = variant === 'display';

  if (isEmpty) {
    return (
      <div className={cx('flex flex-col gap-2', className)}>
        <div className={cx('label', isDisplay && '!text-base !tracking-[0.2em]')}>{label}</div>
        <div
          className={cx(
            'font-display tnum rounded font-bold leading-none tracking-tight text-fg-muted',
            isDisplay ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl',
          )}
        >
          No predictions yet
        </div>
        <ProbabilityBar value={null} tradeCount={0} variant={variant} />
      </div>
    );
  }

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div className={cx('label', isDisplay && '!text-base !tracking-[0.2em]')}>{label}</div>
      <div
        className={cx(
          'font-display tnum rounded font-bold leading-none tracking-tight transition-colors',
          isDisplay ? 'text-giga' : 'text-6xl sm:text-7xl',
          flash === 'up' && 'text-yes',
          flash === 'down' && 'text-no',
          !flash && 'text-fg',
        )}
        aria-live="off"
      >
        {formatProbability(value, 1)}
      </div>
      <ProbabilityBar value={value} variant={variant} />
    </div>
  );
}

/** The YES/NO split bar. Reads at a glance from the back of a room. */
export function ProbabilityBar({
  value,
  tradeCount,
  hasPredictions,
  variant = 'compact',
  showLabels = true,
}: {
  value: number | null;
  tradeCount?: number;
  hasPredictions?: boolean;
  variant?: 'compact' | 'display';
  showLabels?: boolean;
}) {
  const isEmpty =
    hasPredictions === false ||
    tradeCount === 0 ||
    value === null ||
    !Number.isFinite(value);

  const isDisplay = variant === 'display';

  if (isEmpty) {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          className={cx(
            'flex w-full overflow-hidden rounded-full bg-[#201f1f] border border-[#27272A]',
            isDisplay ? 'h-6' : 'h-3',
          )}
          role="img"
          aria-label="No predictions placed yet"
        >
          <div className="w-full bg-[#27272A]/60" />
        </div>
        {showLabels ? (
          <div
            className={cx(
              'tnum flex justify-between font-medium text-[#8e9192]',
              isDisplay ? 'text-lg' : 'text-xs',
            )}
          >
            <span>YES — —%</span>
            <span className="italic text-[11px]">No predictions yet</span>
            <span>NO — —%</span>
          </div>
        ) : null}
      </div>
    );
  }

  const pct = Math.min(100, Math.max(0, value * 100));

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cx(
          'flex w-full overflow-hidden rounded-full bg-ink-800',
          isDisplay ? 'h-6' : 'h-3',
        )}
        role="img"
        aria-label={`Yes ${formatProbability(value)}, No ${formatProbability(1 - value)}`}
      >
        <div
          className="bg-yes transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
        <div className="flex-1 bg-no/70" />
      </div>
      {showLabels ? (
        <div
          className={cx(
            'tnum flex justify-between font-semibold font-mono',
            isDisplay ? 'text-2xl' : 'text-xs',
          )}
        >
          <span className="text-yes">YES — {formatProbability(value, 0)}</span>
          <span className="text-no">NO — {formatProbability(1 - value, 0)}</span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Live YES and NO probability traces across the round, built from samples the
 * client collects as ticks arrive. Not persisted — a reconnect starts a fresh
 * trace rather than backfilling.
 *
 * The two series are exact complements (NO = 1 − YES), so they mirror around
 * the 50% line and cross whenever the market flips its favourite. Drawing both
 * is the point: the crossing is the moment the room changed its mind, and it
 * reads instantly from the back of a lecture hall.
 */
export function ProbabilityTrace({
  value,
  roundId,
  height = 96,
  showLegend = true,
}: {
  value: number;
  roundId: string | null;
  height?: number;
  showLegend?: boolean;
}) {
  const [points, setPoints] = useState<number[]>([]);
  const currentRound = useRef<string | null>(roundId);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    if (currentRound.current !== roundId) {
      currentRound.current = roundId;
      setPoints([]);
    }
  }, [roundId]);

  const push = (next: number) =>
    setPoints((prev) => {
      const appended = [...prev, next];
      // Cap the trace so a long round cannot grow this unboundedly.
      return appended.length > 600 ? appended.slice(appended.length - 600) : appended;
    });

  /**
   * Sample on a clock, not only on change.
   *
   * Implied probability moves only when someone trades, so a change-driven
   * trace sits at a single point — and therefore renders as "waiting" — through
   * every quiet stretch of a round. Sampling once a second makes the x axis
   * real time, so a flat market draws a flat line instead of nothing.
   */
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      push(latest.current);
    }, 1000);
    return () => clearInterval(timer);
  }, [roundId]);

  // Also sample immediately on a move, so a fill shows up without waiting for
  // the next tick.
  useEffect(() => {
    push(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-fg-faint"
        style={{ height }}
      >
        Waiting for the market to move…
      </div>
    );
  }

  const width = 1000;
  const step = width / (points.length - 1);
  const toY = (p: number) => height - p * height;

  const build = (series: number[]) =>
    series
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(2)} ${toY(p).toFixed(2)}`)
      .join(' ');

  const yesPath = build(points);
  const noPath = build(points.map((p) => 1 - p));

  // Each series is filled toward its own baseline, so the shaded areas read as
  // "how much of the market believes this" rather than as one stacked region.
  const yesArea = `${yesPath} L ${width} ${height} L 0 ${height} Z`;
  const noArea = `${noPath} L ${width} 0 L 0 0 Z`;

  const yesNow = points[points.length - 1];

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`Yes ${formatProbability(yesNow)}, No ${formatProbability(1 - yesNow)}`}
      >
        <defs>
          <linearGradient id="trace-yes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e896" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#00e896" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trace-no" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#ff3d64" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff3d64" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* 50% reference — where the two series cross. */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="#1c2926"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          vectorEffect="non-scaling-stroke"
        />

        <path d={noArea} fill="url(#trace-no)" />
        <path d={yesArea} fill="url(#trace-yes)" />

        {/* Data lines are neon light pipes: a soft outer glow in the series
            colour, so they read as emitted rather than drawn. */}
        <path
          d={noPath}
          fill="none"
          stroke="#ff3d64"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
          style={{ filter: 'drop-shadow(0 0 6px rgba(255, 61, 100, 0.55))' }}
        />
        <path
          d={yesPath}
          fill="none"
          stroke="#00e896"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ filter: 'drop-shadow(0 0 7px rgba(0, 232, 150, 0.6))' }}
        />
      </svg>

      {showLegend ? (
        <div className="tnum flex items-center justify-between font-mono text-[11px]">
          <span className="flex items-center gap-1.5 text-yes">
            <span className="inline-block h-0.5 w-4 bg-yes" aria-hidden />
            YES {formatProbability(yesNow)}
          </span>
          <span className="flex items-center gap-1.5 text-no">
            <span
              className="inline-block h-0.5 w-4 bg-no"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg,currentColor 0 4px,transparent 4px 7px)',
              }}
              aria-hidden
            />
            NO {formatProbability(1 - yesNow)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
