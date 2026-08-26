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
import { useEffect, useRef } from 'react';

import type { Candle } from '@/lib/price/binance';

/**
 * Live candle chart.
 *
 * History comes from the server (which proxies Binance so 200 phones do not all
 * hit the public API), and the in-progress candle is then advanced locally from
 * the price ticks arriving over the socket. History is re-fetched periodically
 * so any drift in the locally-built candle is corrected rather than compounding
 * across a twelve-round event.
 */

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
};

export interface CandleChartProps {
  code: string;
  /** Round strike, drawn as a horizontal reference line. */
  openPrice?: number | null;
  /** Latest price tick, used to advance the in-progress candle. */
  livePrice?: number | null;
  height?: number;
  /** Big-screen mode: larger type, thicker lines, readable across a room. */
  variant?: 'compact' | 'display';
  candleLimit?: number;
}

export function CandleChart({
  code,
  openPrice,
  livePrice,
  height = 220,
  variant = 'compact',
  candleLimit = 90,
}: CandleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const intervalSecRef = useRef(60);
  const lastBarRef = useRef<Candle | null>(null);

  const isDisplay = variant === 'display';

  // Create the chart once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDisplay ? '#c0c7d5' : '#8a919e',
        fontSize: isDisplay ? 15 : 11,
        fontFamily: 'var(--font-sans), system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(61, 155, 255, 0.07)' },
        horzLines: { color: 'rgba(61, 155, 255, 0.07)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(61,155,255,0.14)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
      },
      timeScale: {
        borderColor: 'rgba(61,155,255,0.14)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
      },
      crosshair: {
        // No crosshair on the projector — nobody is pointing at it, and a
        // stray touch should not leave a line across the display.
        mode: isDisplay ? CrosshairMode.Hidden : CrosshairMode.Normal,
        vertLine: { color: '#3d9bff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#3d9bff' },
        horzLine: { color: '#3d9bff', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#3d9bff' },
      },
      // Touch devices: let the page scroll rather than trapping the gesture in
      // the chart. Participants need to scroll past this to reach the buttons.
      handleScroll: isDisplay ? false : { vertTouchDrag: false },
      handleScale: !isDisplay,
      autoSize: false,
      width: container.clientWidth,
      height,
    });

    const series = chart.addCandlestickSeries({
      upColor: '#00e896',
      downColor: '#ff3d64',
      borderUpColor: '#00e896',
      borderDownColor: '#ff3d64',
      wickUpColor: '#00b877',
      wickDownColor: '#d92a4d',
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({
        width: containerRef.current.clientWidth,
        height,
      });
    };

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('orientationchange', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    };
  }, [height, isDisplay]);

  // Load (and periodically reload) history.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/arenas/${encodeURIComponent(code)}/candles?limit=${candleLimit}`,
          { cache: 'no-store' },
        );
        if (!res.ok) return;
        const data: { interval: string; candles: Candle[] } = await res.json();
        if (cancelled || !seriesRef.current) return;

        intervalSecRef.current = INTERVAL_SECONDS[data.interval] ?? 60;
        lastBarRef.current = data.candles[data.candles.length - 1] ?? null;

        seriesRef.current.setData(
          data.candles.map((candle) => ({
            time: candle.time as UTCTimestamp,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          })),
        );
        chartRef.current?.timeScale().fitContent();
      } catch {
        // Chart history is cosmetic — the round still resolves off the server's
        // own price sampling, so a failed fetch just leaves the chart sparse.
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, candleLimit]);

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
  }, [livePrice]);

  // The strike line: everything above it is a YES, everything at or below a NO.
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
        color: '#3d9bff',
        lineWidth: isDisplay ? 3 : 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN',
      });
    }
  }, [openPrice, isDisplay]);

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}

export default CandleChart;
