'use client';

import { useEffect, useRef, useState } from 'react';

import { cx, formatProbability, formatTimeIST } from '@/lib/format';

/** The YES/NO split bar — the market's two-sided answer at a glance. */
export function ProbabilityBar({
  value,
  variant = 'compact',
  showLabels = true,
}: {
  value: number;
  variant?: 'compact' | 'display';
  showLabels?: boolean;
}) {
  const pct = Math.min(100, Math.max(0, value * 100));
  const isDisplay = variant === 'display';

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cx('flex w-full overflow-hidden rounded-full bg-ink-750', isDisplay ? 'h-5' : 'h-2.5')}
        role="img"
        aria-label={`Yes ${formatProbability(value)}, No ${formatProbability(1 - value)}`}
      >
        <div className="bg-yes transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        <div className="flex-1 bg-no/80" />
      </div>
      {showLabels ? (
        <div className={cx('tnum flex justify-between font-bold', isDisplay ? 'text-xl' : 'text-xs')}>
          <span className="text-yes">YES {formatProbability(value)}</span>
          <span className="text-no">NO {formatProbability(1 - value)}</span>
        </div>
      ) : null}
    </div>
  );
}

interface TracePoint {
  t: number;
  v: number;
}

/**
 * YES momentum — a clean single-series area chart of implied YES probability
 * across the round, sampled from real ticks as they arrive. Smooth
 * transitions, IST time axis, hover inspection. Empty state until the market
 * moves; never synthesised.
 */
export function ProbabilityTrace({
  value,
  roundId,
  height = 120,
  showLegend = true,
}: {
  value: number;
  roundId: string | null;
  height?: number;
  showLegend?: boolean;
}) {
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const currentRound = useRef<string | null>(roundId);
  const latest = useRef(value);

  useEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    if (currentRound.current !== roundId) {
      currentRound.current = roundId;
      setPoints([]);
      setHover(null);
    }
  }, [roundId]);

  useEffect(() => {
    const push = () =>
      setPoints((prev) => {
        const appended = [...prev, { t: Date.now(), v: latest.current }];
        return appended.length > 900 ? appended.slice(appended.length - 900) : appended;
      });
    push();
    const timer = setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      push();
    }, 1000);
    return () => clearInterval(timer);
  }, [roundId]);

  useEffect(() => {
    setPoints((prev) => {
      const appended = [...prev, { t: Date.now(), v: value }];
      return appended.length > 900 ? appended.slice(appended.length - 900) : appended;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (points.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line bg-ink-950 text-sm text-fg-faint"
        style={{ height }}
      >
        Waiting for the market to move…
      </div>
    );
  }

  const width = 1000;
  const pad = 16;
  const values = points.map((p) => p.v);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = Math.max(rawMax - rawMin, 0.02);
  const lo = Math.max(0, rawMin - spread * 0.25);
  const hi = Math.min(1, rawMax + spread * 0.25);
  const span = Math.max(hi - lo, 0.01);

  const t0 = points[0].t;
  const t1 = points[points.length - 1].t;
  const tSpan = Math.max(t1 - t0, 1000);
  const x = (t: number) => pad + ((t - t0) / tSpan) * (width - pad * 2);
  const y = (v: number) => height - 8 - ((v - lo) / span) * (height - 28);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.t).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const area = `${line} L ${x(t1).toFixed(1)} ${height} L ${x(t0).toFixed(1)} ${height} Z`;
  const last = points[points.length - 1];

  const hoverPoint = hover !== null ? points[Math.min(hover, points.length - 1)] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    points.forEach((p, i) => {
      const d = Math.abs(x(p.t) - fx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block w-full cursor-crosshair"
          style={{ height }}
          role="img"
          aria-label={`YES probability momentum, now ${formatProbability(last.v)}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="yes-momentum" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {[0.25, 0.5, 0.75].map((f) => (
            <line
              key={f}
              x1={pad}
              y1={height * f}
              x2={width - pad}
              y2={height * f}
              stroke="rgba(148,163,184,0.1)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          <path d={area} fill="url(#yes-momentum)" />
          <path
            d={line}
            fill="none"
            stroke="#34d399"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            style={{ transition: 'd 300ms linear' }}
          />

          {hoverPoint ? (
            <g>
              <line
                x1={x(hoverPoint.t)}
                y1="4"
                x2={x(hoverPoint.t)}
                y2={height - 16}
                stroke="rgba(233,235,241,0.35)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={x(hoverPoint.t)} cy={y(hoverPoint.v)} r="4" fill="#34d399" stroke="#05070c" strokeWidth="1.5" />
            </g>
          ) : (
            <circle cx={x(last.t)} cy={y(last.v)} r="3.5" fill="#34d399" />
          )}
        </svg>

        {hoverPoint ? (
          <div className="tnum pointer-events-none absolute top-1 rounded-md border border-line bg-ink-800 px-2 py-1 text-[11px] font-bold text-fg shadow-elevated"
            style={{
              left: `clamp(4px, ${(x(hoverPoint.t) / width) * 100}%, calc(100% - 120px))`,
            }}
          >
            {formatProbability(hoverPoint.v)} · {formatTimeIST(hoverPoint.t, false)}
          </div>
        ) : null}
      </div>

      {showLegend ? (
        <div className="tnum flex items-center justify-between font-mono text-[11px] text-fg-faint">
          <span>{formatTimeIST(t0, false)}</span>
          <span className="flex items-center gap-1.5 font-bold text-yes">
            YES {formatProbability(last.v)}
          </span>
          <span>{formatTimeIST(t1, false)}</span>
        </div>
      ) : null}
    </div>
  );
}
