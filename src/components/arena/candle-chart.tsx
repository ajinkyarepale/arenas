'use client';

import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { useCallback, useEffect, useRef, useState } from 'react';

import { cx, formatTimeIST } from '@/lib/format';
import type { Candle } from '@/lib/price/binance';

/**
 * Arena candle chart (lightweight-charts).
 *
 * History is proxied through the server so a room of phones never touches
 * Binance directly; the in-progress candle advances locally from socket ticks
 * and history refetches every 30s to correct drift. All displayed times are
 * IST (Asia/Kolkata), 12-hour — applied at the display layer only.
 *
 * Timeframes are limited to what the kline feed genuinely serves
 * (1m–1h). The vertical lock marker tracks round end via the time scale —
 * never a fixed pixel — and hides when out of range.
 */

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
};

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '30m', '1h'] as const;

export interface CandleChartProps {
  code: string;
  /** Round strike, drawn as a horizontal reference line. */
  openPrice?: number | null;
  /** Latest price tick, used to advance the in-progress candle. */
  livePrice?: number | null;
  height?: number;
  variant?: 'compact' | 'display';
  candleLimit?: number;
  /** Round lock timestamp (ms). Vertical "Lock" marker; null hides it. */
  lockTimeMs?: number | null;
  /** Show the timeframe + expand toolbar. */
  showToolbar?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  assetLabel?: string;
}

export function CandleChart({
  code,
  openPrice,
  livePrice,
  height = 220,
  variant = 'compact',
  candleLimit = 90,
  lockTimeMs = null,
  showToolbar = false,
  expanded = false,
  onToggleExpand,
  assetLabel,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const intervalSecRef = useRef(60);
  const lastBarRef = useRef<Candle | null>(null);
  const fittedRef = useRef(false);
  const lockKeyRef = useRef<string | null>(null);
  const [timeframe, setTimeframe] = useState<string | null>(null);
  const [lockX, setLockX] = useState<number | null>(null);
  const [feedError, setFeedError] = useState(false);

  const isDisplay = variant === 'display';

  const updateLockLine = useCallback(() => {
    const chart = chartRef.current;
    const container = containerRef.current;
    if (!chart || !container || lockTimeMs == null || !Number.isFinite(lockTimeMs)) {
      setLockX(null);
      return;
    }
    try {
      const x = chart
        .timeScale()
        .timeToCoordinate(Math.floor(lockTimeMs / 1000) as UTCTimestamp);
      const w = container.clientWidth;
      setLockX(x == null || x < 0 || x > w ? null : x);
    } catch {
      setLockX(null);
    }
  }, [lockTimeMs]);

  // Create the chart once per variant.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#626c7e',
        fontSize: isDisplay ? 15 : 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      localization: {
        locale: 'en-IN',
        // Crosshair + price-axis timestamps in IST, 12-hour.
        timeFormatter: (t: UTCTimestamp) => formatTimeIST(Number(t) * 1000),
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.07)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.07)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(148,163,184,0.16)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.16)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
        // X-axis ticks in IST, 12-hour.
        tickMarkFormatter: (t: UTCTimestamp) => formatTimeIST(Number(t) * 1000, false),
      },
      crosshair: {
        mode: isDisplay ? CrosshairMode.Hidden : CrosshairMode.Normal,
        vertLine: { color: '#5b8cff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2f5fd0' },
        horzLine: { color: '#5b8cff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#2f5fd0' },
      },
      handleScroll: isDisplay ? false : { vertTouchDrag: false },
      handleScale: !isDisplay,
      autoSize: false,
      width: container.clientWidth,
      height,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#34d399',
      downColor: '#fb7185',
      borderUpColor: '#34d399',
      borderDownColor: '#fb7185',
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    fittedRef.current = false;

    const resize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height,
      });
      updateLockLine();
    };

    const rangeSub = () => updateLockLine();
    chart.timeScale().subscribeVisibleTimeRangeChange(rangeSub);

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('orientationchange', resize);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(rangeSub);
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisplay]);

  // Apply height changes (expand/minimize) without rebuilding the chart.
  useEffect(() => {
    chartRef.current?.applyOptions({ height });
    updateLockLine();
  }, [height, updateLockLine]);

  // Load (and periodically reload) history.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: String(candleLimit) });
        if (timeframe) params.set('interval', timeframe);
        const res = await fetch(
          `/api/arenas/${encodeURIComponent(code)}/candles?${params.toString()}`,
          { cache: 'no-store' },
        );
        if (!res.ok) {
          if (!cancelled) setFeedError(true);
          return;
        }
        const data: { interval: string; candles: Candle[] } = await res.json();
        if (cancelled || !seriesRef.current) return;

        intervalSecRef.current = INTERVAL_SECONDS[data.interval] ?? 60;
        lastBarRef.current = data.candles[data.candles.length - 1] ?? null;

        // Keep the lock marker on screen: reserve empty space ahead for the
        // bars remaining until lock. Keyed per dataset+round so the 30s
        // refetch never yanks a user's zoom or scroll.
        const lockKey = `${data.interval}|${lockTimeMs ?? 'none'}`;
        if (lockKeyRef.current !== lockKey) {
          lockKeyRef.current = lockKey;
          const sec = intervalSecRef.current || 60;
          const offset =
            lockTimeMs != null && Number.isFinite(lockTimeMs)
              ? Math.min(Math.max(Math.ceil((lockTimeMs - Date.now()) / 1000 / sec) + 3, 4), 120)
              : 3;
          chartRef.current?.timeScale().applyOptions({ rightOffset: offset });
        }

        seriesRef.current.setData(
          data.candles.map((candle) => ({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          })),
        );
        if (!cancelled) setFeedError(false);
        // Fit once per dataset so zoom/scroll survive the 30s refetch.
        if (!fittedRef.current) {
          chartRef.current?.timeScale().fitContent();
          fittedRef.current = true;
        }
        updateLockLine();
      } catch {
        if (!cancelled) setFeedError(true);
      }
    };

    fittedRef.current = false;
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, candleLimit, timeframe, updateLockLine]);

  // Advance the in-progress candle from live ticks.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || livePrice == null || !Number.isFinite(livePrice)) return;

    const intervalSec = intervalSecRef.current;
    const bucket = Math.floor(Date.now() / 1000 / intervalSec) * intervalSec;
    const last = lastBarRef.current;

    if (!last || bucket > last.time) {
      const bar: Candle = {
        time: bucket,
        open: livePrice,
        high: livePrice,
        low: livePrice,
        close: livePrice,
      };
      lastBarRef.current = bar;
      series.update({ ...bar, time: bar.time as UTCTimestamp });
      updateLockLine();
      return;
    }

    if (bucket === last.time) {
      const bar: Candle = {
        ...last,
        high: Math.max(last.high, livePrice),
        low: Math.min(last.low, livePrice),
        close: livePrice,
      };
      lastBarRef.current = bar;
      series.update({ ...bar, time: bar.time as UTCTimestamp });
    }
  }, [livePrice, updateLockLine]);

  // Strike line: everything above it is YES, at or below is NO.
  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (priceLineRef.current) {
      series.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }

    if (openPrice != null && Number.isFinite(openPrice)) {
      priceLineRef.current = series.createPriceLine({
        price: openPrice,
        color: '#5b8cff',
        lineWidth: isDisplay ? 3 : 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN',
      });
    }
  }, [openPrice, isDisplay]);

  useEffect(() => {
    updateLockLine();
  }, [lockTimeMs, updateLockLine]);

  return (
    <div>
      {showToolbar ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-line bg-ink-950 p-0.5" role="group" aria-label="Chart timeframe">
            {TIMEFRAMES.map((tf) => {
              const active = timeframe === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeframe((cur) => (cur === tf ? null : tf))}
                  aria-pressed={active}
                  title={active ? 'Back to round-matched interval' : `Show ${tf} candles`}
                  className={cx(
                    'rounded-md px-2 py-1 font-mono text-[11px] font-bold transition-colors',
                    active ? 'bg-ink-750 text-fg' : 'text-fg-faint hover:text-fg-muted',
                  )}
                >
                  {tf}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-fg-faint" title="Times shown in IST (Asia/Kolkata)">
            IST
          </span>
          {lockTimeMs != null && Number.isFinite(lockTimeMs) ? (
            <span className="tnum ml-auto font-mono text-[11px] text-fg-faint" title="Round lock, shown in IST">
              Lock {formatTimeIST(lockTimeMs)} IST
            </span>
          ) : null}
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] font-bold text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
              aria-label={expanded ? 'Minimize chart' : 'Expand chart'}
              aria-expanded={expanded}
            >
              {expanded ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M4.5 2H2v2.5M2 2l2.8 2.8M7.5 10H10V7.5M10 10 7.2 7.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M7 2h3v3M10 2 6.2 5.8M5 10H2V7M2 10l3.8-3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {expanded ? 'Minimize' : 'Expand'}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">
            {assetLabel ?? 'Price'}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-fg-faint">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-accent" aria-hidden />
            strike
          </span>
        </div>
      )}

      <div className="relative">
        <div ref={containerRef} className="w-full" style={{ height }} />
        {/* Vertical lock marker — blue dotted, positioned from the time scale.
            Hidden only when the lock sits outside the visible range. */}
        {lockX !== null ? (
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: lockX }}
            aria-hidden
          >
            <div className="h-full w-px border-l-2 border-dotted border-accent" />
            <span className="tnum absolute left-1.5 top-1 whitespace-nowrap rounded border border-accent/40 bg-ink-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-light">
              Lock
            </span>
          </div>
        ) : null}
      </div>

      {feedError ? (
        <p className="mt-2 rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          Price history is unavailable right now — rounds still settle off the server feed.
        </p>
      ) : null}
    </div>
  );
}

export default CandleChart;
