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
import { useEffect, useRef, useState } from 'react';

import type { Candle } from '@/lib/price/binance';

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
  openPrice?: number | null;
  livePrice?: number | null;
  height?: number;
  variant?: 'compact' | 'display';
  candleLimit?: number;
  defaultMode?: 'area' | 'candles';
}

export function CandleChart({
  code,
  openPrice,
  livePrice,
  height,
  variant = 'compact',
  candleLimit = 90,
  defaultMode = 'area',
}: CandleChartProps) {
  const [chartMode, setChartMode] = useState<'area' | 'candles'>(defaultMode);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const intervalSecRef = useRef(60);
  const rawCandlesRef = useRef<Candle[]>([]);
  const lastBarRef = useRef<Candle | null>(null);

  const isDisplay = variant === 'display';
  const priceUp =
    livePrice != null && openPrice != null ? livePrice >= openPrice : true;

  // Build / Re-build Chart & Active Series
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialWidth = container.clientWidth || 500;
    const initialHeight = container.clientHeight || height || 220;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: isDisplay ? '#a1a1aa' : '#71717a',
        fontSize: isDisplay ? 11 : 10,
        fontFamily: "Geist, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.15, bottom: 0.15 },
        autoScale: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
      },
      crosshair: {
        mode: isDisplay ? CrosshairMode.Hidden : CrosshairMode.Normal,
        vertLine: { color: '#22C55E', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#22C55E' },
        horzLine: { color: '#22C55E', width: 1, style: LineStyle.Dashed, labelBackgroundColor: '#22C55E' },
      },
      handleScroll: isDisplay ? false : { vertTouchDrag: false },
      handleScale: !isDisplay,
    });

    chartRef.current = chart;

    // Create the appropriate series
    if (chartMode === 'area') {
      const area = chart.addAreaSeries({
        topColor: priceUp ? 'rgba(34, 197, 94, 0.28)' : 'rgba(239, 68, 68, 0.28)',
        bottomColor: 'rgba(0, 0, 0, 0.0)',
        lineColor: priceUp ? '#22C55E' : '#EF4444',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current = area;

      if (rawCandlesRef.current.length > 0) {
        area.setData(
          rawCandlesRef.current.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.close,
          })),
        );
        chart.timeScale().fitContent();
      }
    } else {
      const candle = chart.addCandlestickSeries({
        upColor: '#22C55E',
        downColor: '#EF4444',
        borderUpColor: '#22C55E',
        borderDownColor: '#EF4444',
        wickUpColor: '#16a34a',
        wickDownColor: '#dc2626',
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current = candle;

      if (rawCandlesRef.current.length > 0) {
        candle.setData(
          rawCandlesRef.current.map((c) => ({
            time: c.time as UTCTimestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          })),
        );
        chart.timeScale().fitContent();
      }
    }

    // Attach strike price line
    if (seriesRef.current && openPrice != null && Number.isFinite(openPrice)) {
      priceLineRef.current = seriesRef.current.createPriceLine({
        price: openPrice,
        color: '#71717a',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN · BEAT THIS',
      });
    }

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || height || 200;
      if (w > 0 && h > 0) {
        chartRef.current.applyOptions({ width: w, height: h });
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLineRef.current = null;
    };
  }, [chartMode, height, isDisplay]);

  // Load candle history
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
        if (cancelled) return;

        intervalSecRef.current = INTERVAL_SECONDS[data.interval] ?? 60;
        rawCandlesRef.current = data.candles;
        lastBarRef.current = data.candles[data.candles.length - 1] ?? null;

        const series = seriesRef.current;
        if (series) {
          if (chartMode === 'area') {
            (series as ISeriesApi<'Area'>).setData(
              data.candles.map((c) => ({
                time: c.time as UTCTimestamp,
                value: c.close,
              })),
            );
          } else {
            (series as ISeriesApi<'Candlestick'>).setData(
              data.candles.map((c) => ({
                time: c.time as UTCTimestamp,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
              })),
            );
          }
          chartRef.current?.timeScale().fitContent();
        }
      } catch {
        // Cosmetic history failover
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, candleLimit, chartMode]);

  // Advance live ticks
  useEffect(() => {
    if (livePrice == null || !Number.isFinite(livePrice)) return;
    const series = seriesRef.current;
    if (!series) return;

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
      rawCandlesRef.current = [...rawCandlesRef.current, bar];

      if (chartMode === 'area') {
        (series as ISeriesApi<'Area'>).update({ time: bucket as UTCTimestamp, value: livePrice });
      } else {
        (series as ISeriesApi<'Candlestick'>).update({ ...bar, time: bar.time as UTCTimestamp });
      }
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

      if (chartMode === 'area') {
        (series as ISeriesApi<'Area'>).update({ time: bucket as UTCTimestamp, value: livePrice });
      } else {
        (series as ISeriesApi<'Candlestick'>).update({ ...bar, time: bar.time as UTCTimestamp });
      }
    }
  }, [livePrice, chartMode]);

  // Strike line sync
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
        color: '#71717a',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN · BEAT THIS',
      });
    }
  }, [openPrice]);

  return (
    <div className="relative w-full h-full flex flex-col min-h-0">
      {/* Mode Controls Bar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-md border border-[#27272A] rounded-lg p-0.5">
        <button
          type="button"
          onClick={() => setChartMode('area')}
          className={`px-2 py-0.5 text-[10px] font-['Epilogue'] font-bold rounded transition-all ${
            chartMode === 'area'
              ? 'bg-[#27272A] text-white shadow-sm'
              : 'text-[#8e9192] hover:text-white'
          }`}
        >
          Line
        </button>
        <button
          type="button"
          onClick={() => setChartMode('candles')}
          className={`px-2 py-0.5 text-[10px] font-['Epilogue'] font-bold rounded transition-all ${
            chartMode === 'candles'
              ? 'bg-[#27272A] text-white shadow-sm'
              : 'text-[#8e9192] hover:text-white'
          }`}
        >
          Candles
        </button>
      </div>

      <div ref={containerRef} className="w-full flex-1 min-h-[160px]" />
    </div>
  );
}

export default CandleChart;
