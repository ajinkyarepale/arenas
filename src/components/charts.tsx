import { cx, formatPoints, formatProbability } from '@/lib/format';
import type { CalibrationBucket, EquityPoint, RoundHistoryEntry } from '@/lib/analytics';

/**
 * Chart primitives, hand-built in SVG.
 *
 * The trading screen already pays for lightweight-charts because it needs real
 * candles; nothing here justifies a second charting dependency. These are
 * static, server-renderable, and take their colours from the theme tokens so
 * they cannot drift from the rest of the app.
 */

/** Cumulative P/L across settled trades, with a zero baseline. */
export function EquityCurve({
  points,
  height = 160,
  className,
}: {
  points: EquityPoint[];
  height?: number;
  className?: string;
}) {
  if (points.length < 2) {
    return (
      <div
        className={cx(
          'flex items-center justify-center rounded-md border border-dashed border-line text-sm text-fg-faint',
          className,
        )}
        style={{ height }}
      >
        Not enough settled trades yet
      </div>
    );
  }

  const width = 1000;
  const values = points.map((p) => p.balance);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  // Leave a little headroom so the line never touches the frame.
  const pad = span * 0.08;
  const top = max + pad;
  const bottom = min - pad;
  const range = top - bottom;

  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => ((top - v) / range) * height;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(2)} ${y(p.balance).toFixed(2)}`).join(' ');
  const zeroY = y(0);
  const area = `${line} L ${width} ${zeroY.toFixed(2)} L 0 ${zeroY.toFixed(2)} Z`;

  const final = values[values.length - 1];
  const up = final >= 0;
  const stroke = up ? '#16a34a' : '#dc2626';

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cx('w-full', className)}
      style={{ height }}
      role="img"
      aria-label={`Cumulative profit and loss across ${points.length} settled trades, ending at ${formatPoints(final, 0)} points`}
    >
      <defs>
        <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.26" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <line x1="0" y1={zeroY} x2={width} y2={zeroY} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="5 5" vectorEffect="non-scaling-stroke" />
      <path d={area} fill="url(#equity-fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(points.length - 1)} cy={y(final)} r="3.5" fill={stroke} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Calibration: price paid on the x axis, how often those trades actually won
 * on the y. A perfectly calibrated trader sits on the diagonal — when they pay
 * 70 cents, it resolves YES 70% of the time.
 */
export function CalibrationChart({
  buckets,
  height = 200,
}: {
  buckets: CalibrationBucket[];
  height?: number;
}) {
  const populated = buckets.filter((b) => b.count > 0);

  if (populated.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-line text-sm text-fg-faint"
        style={{ height }}
      >
        No settled trades to score yet
      </div>
    );
  }

  const width = 320;
  const inset = 28;
  const plot = width - inset * 2;
  const plotH = height - inset * 2;

  const px = (p: number) => inset + p * plot;
  const py = (p: number) => inset + (1 - p) * plotH;

  const maxCount = Math.max(...populated.map((b) => b.count));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ maxHeight: height }}
      role="img"
      aria-label="Calibration: price paid versus how often those trades actually won"
    >
      <rect x={inset} y={inset} width={plot} height={plotH} fill="none" stroke="#e2e8f0" strokeWidth="1" />

      <line x1={px(0)} y1={py(0)} x2={px(1)} y2={py(1)} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />

      {populated.map((b) => {
        const mid = (b.predicted ?? (b.from + b.to) / 2);
        const actual = b.actual ?? 0;
        const r = 3 + (b.count / maxCount) * 7;
        const above = actual >= mid;
        return (
          <g key={b.from}>
            <line x1={px(mid)} y1={py(mid)} x2={px(mid)} y2={py(actual)} stroke={above ? '#16a34a' : '#dc2626'} strokeWidth="1" opacity="0.5" />
            <circle cx={px(mid)} cy={py(actual)} r={r} fill={above ? '#16a34a' : '#dc2626'} fillOpacity="0.75" />
          </g>
        );
      })}

      <text x={inset} y={height - 8} fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)">
        0%
      </text>
      <text x={width - inset} y={height - 8} fill="#94a3b8" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">
        100%
      </text>
      <text x={width / 2} y={height - 8} fill="#94a3b8" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">
        price paid
      </text>
      <text x={8} y={inset + 8} fill="#94a3b8" fontSize="9" fontFamily="var(--font-mono)">
        won
      </text>
    </svg>
  );
}

/** Per-round profit and loss as a diverging bar column. */
export function PnlBars({
  points,
  height = 120,
}: {
  points: Array<{ label: string | number; pnl: number }>;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-md border border-dashed border-line text-sm text-fg-faint"
        style={{ height }}
      >
        Nothing settled yet
      </div>
    );
  }

  const peak = Math.max(...points.map((p) => Math.abs(p.pnl)), 1);

  return (
    <div className="flex items-stretch gap-1" style={{ height }}>
      {points.map((p, i) => {
        const share = Math.abs(p.pnl) / peak;
        const up = p.pnl >= 0;
        return (
          <div
            key={`${p.label}-${i}`}
            className="flex min-w-0 flex-1 flex-col items-center justify-center"
            title={`Round ${p.label}: ${p.pnl >= 0 ? '+' : ''}${formatPoints(p.pnl, 0)} pts`}
          >
            <div className="flex w-full flex-1 items-end justify-center">
              {up ? (
                <div
                  className="w-full rounded-t-sm bg-yes/70"
                  style={{ height: `${Math.max(share * 100, 2)}%` }}
                />
              ) : null}
            </div>
            <div className="h-px w-full bg-line-strong" />
            <div className="flex w-full flex-1 items-start justify-center">
              {!up ? (
                <div
                  className="w-full rounded-b-sm bg-no/70"
                  style={{ height: `${Math.max(share * 100, 2)}%` }}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The round timeline: one column per resolved round, showing what the market
 * believed against what actually happened. A green marker means the crowd's
 * favourite won.
 */
export function RoundTimeline({ rounds }: { rounds: RoundHistoryEntry[] }) {
  if (rounds.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-line text-sm text-fg-faint">
        No rounds have settled yet
      </div>
    );
  }

  return (
    <div className="no-scrollbar overflow-x-auto">
      <div className="flex min-w-full gap-1.5">
        {rounds.map((r) => {
          const implied = r.impliedYes ?? 0.5;
          const isVoid = r.outcome === 'VOID';
          const isYes = r.outcome === 'YES';
          return (
            <div key={r.roundNumber} className="flex min-w-[2.5rem] flex-1 flex-col gap-1">
              <div
                className="relative h-20 overflow-hidden rounded border border-line bg-ink-950"
                title={`Round ${r.roundNumber}: market said ${formatProbability(implied)} YES, resolved ${r.outcome ?? '—'}`}
              >
                <div className="absolute inset-x-0 bottom-0 bg-yes/20" style={{ height: `${implied * 100}%` }} />
                <div className="absolute inset-x-0 top-1/2 h-px bg-line-strong" />
              </div>

              <div
                className={cx(
                  'rounded py-0.5 text-center font-mono text-[10px] font-bold',
                  isVoid ? 'bg-amber-100 text-amber-700' : isYes ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600',
                )}
              >
                {isVoid ? 'V' : isYes ? 'Y' : 'N'}
              </div>

              <div
                className={cx(
                  'text-center font-mono text-[10px]',
                  r.marketCorrect === true ? 'text-green-600' : r.marketCorrect === false ? 'text-red-600' : 'text-slate-400',
                )}
                title={
                  r.marketCorrect === null
                    ? 'Void — not scored'
                    : r.marketCorrect
                      ? 'The crowd called it'
                      : 'The crowd got it wrong'
                }
              >
                {r.marketCorrect === null ? '·' : r.marketCorrect ? '✓' : '✗'}
              </div>

              <div className="tnum text-center text-[10px] text-fg-faint">{r.roundNumber}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** A labelled horizontal proportion bar — used for YES/NO side splits. */
export function SplitBar({
  left,
  right,
  leftLabel,
  rightLabel,
}: {
  left: number;
  right: number;
  leftLabel: React.ReactNode;
  rightLabel: React.ReactNode;
}) {
  const total = left + right;
  const pct = total > 0 ? (left / total) * 100 : 50;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-750">
        <div className="bg-yes" style={{ width: `${pct}%` }} />
        <div className="flex-1 bg-no/80" />
      </div>
      <div className="flex justify-between font-mono text-[11px] font-bold">
        <span className="text-yes">{leftLabel}</span>
        <span className="text-no">{rightLabel}</span>
      </div>
    </div>
  );
}
