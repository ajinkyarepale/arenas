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
import { useEffect, useRef, useState, useCallback } from 'react';
import { Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

import type { Candle } from '@/lib/price/binance';
import { formatPrice } from '@/lib/format';

const INTERVAL_SECONDS: Record<string, number> = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
};

const TIMEFRAMES = ['1m', '3m', '5m', '15m', '1h'];

export interface CandleChartProps {
  code: string;
  openPrice?: number | null;
  livePrice?: number | null;
  height?: number;
  variant?: 'compact' | 'display';
  candleLimit?: number;
  defaultMode?: 'area' | 'candles' | 'line';
}

interface HoverOHLC {
  open: number;
  high: number;
  low: number;
  close: number;
  changePercent: number;
}

export function CandleChart({
  code,
  openPrice,
  livePrice,
  height,
  variant = 'compact',
  candleLimit = 120,
  defaultMode = 'candles',
}: CandleChartProps) {
  const [chartMode, setChartMode] = useState<'area' | 'candles' | 'line'>(defaultMode);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [hoverData, setHoverData] = useState<HoverOHLC | null>(null);
  const [isPanned, setIsPanned] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Area'> | ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const intervalSecRef = useRef(INTERVAL_SECONDS[timeframe] ?? 60);
  const rawCandlesRef = useRef<Candle[]>([]);
  const lastBarRef = useRef<Candle | null>(null);

  const isDisplay = variant === 'display';
  const priceUp =
    livePrice != null && openPrice != null ? livePrice >= openPrice : true;

  // Zoom helpers
  const handleZoomIn = useCallback(() => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const delta = span * 0.18;
    ts.setVisibleLogicalRange({ from: range.from + delta, to: range.to - delta });
  }, []);

  const handleZoomOut = useCallback(() => {
    const ts = chartRef.current?.timeScale();
    if (!ts) return;
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const span = range.to - range.from;
    const delta = span * 0.22;
    ts.setVisibleLogicalRange({ from: range.from - delta, to: range.to + delta });
  }, []);

  const handleReset = useCallback(() => {
    chartRef.current?.timeScale().fitContent();
    seriesRef.current?.priceScale().applyOptions({ autoScale: true });
    setIsPanned(false);
  }, []);

  // Initialize and recreate chart when layout or chartMode changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initialWidth = container.clientWidth || 500;
    const initialHeight = container.clientHeight || height || 240;

    const chart = createChart(container, {
      width: initialWidth,
      height: initialHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa',
        fontSize: isDisplay ? 11 : 10,
        fontFamily: "'Geist', system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)', style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: { top: 0.12, bottom: 0.12 },
        autoScale: true,
        alignLabels: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#18181b',
        },
        horzLine: {
          color: 'rgba(255, 255, 255, 0.3)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#18181b',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: {
          time: true,
          price: true,
        },
        mouseWheel: true,
        pinch: true,
      },
    });

    chartRef.current = chart;

    // Build series based on mode
    if (chartMode === 'area') {
      const area = chart.addAreaSeries({
        topColor: priceUp ? 'rgba(34, 197, 94, 0.32)' : 'rgba(239, 68, 68, 0.32)',
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
    } else if (chartMode === 'line') {
      const line = chart.addLineSeries({
        color: priceUp ? '#22C55E' : '#EF4444',
        lineWidth: 2,
        priceLineVisible: true,
        lastValueVisible: true,
      });
      seriesRef.current = line;

      if (rawCandlesRef.current.length > 0) {
        line.setData(
          rawCandlesRef.current.map((c) => ({
            time: c.time as UTCTimestamp,
            value: c.close,
          })),
        );
        chart.timeScale().fitContent();
      }
    } else {
      const candle = chart.addCandlestickSeries({
        upColor: '#089981',
        downColor: '#F23645',
        borderUpColor: '#089981',
        borderDownColor: '#F23645',
        wickUpColor: '#089981',
        wickDownColor: '#F23645',
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
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN STRIKE',
      });
    }

    // Subscribe to crosshair movement for TradingView-grade OHLC readout
    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData || !seriesRef.current) {
        setHoverData(null);
        return;
      }
      const data = param.seriesData.get(seriesRef.current) as any;
      if (!data) {
        setHoverData(null);
        return;
      }

      if ('open' in data) {
        const changePercent = data.open > 0 ? ((data.close - data.open) / data.open) * 100 : 0;
        setHoverData({
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          changePercent,
        });
      } else if ('value' in data) {
        setHoverData({
          open: data.value,
          high: data.value,
          low: data.value,
          close: data.value,
          changePercent: 0,
        });
      }
    });

    // Detect pan away from live edge
    const ts = chart.timeScale();
    const handleRangeChange = () => {
      const logical = ts.getVisibleLogicalRange();
      if (!logical || rawCandlesRef.current.length === 0) return;
      const lastIndex = rawCandlesRef.current.length - 1;
      setIsPanned(logical.to < lastIndex - 2);
    };
    ts.subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || height || 240;
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

  // Load candle history whenever code, candleLimit, or timeframe changes
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(
          `/api/arenas/${encodeURIComponent(code)}/candles?interval=${timeframe}&limit=${candleLimit}`,
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
          if (chartMode === 'area' || chartMode === 'line') {
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
          setIsPanned(false);
        }
      } catch {
        // Fallback gracefully
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 15_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code, candleLimit, timeframe, chartMode]);

  // Advance live ticks smoothly
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

      if (chartMode === 'area' || chartMode === 'line') {
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

      if (chartMode === 'area' || chartMode === 'line') {
        (series as ISeriesApi<'Area'>).update({ time: bucket as UTCTimestamp, value: livePrice });
      } else {
        (series as ISeriesApi<'Candlestick'>).update({ ...bar, time: bar.time as UTCTimestamp });
      }
    }
  }, [livePrice, chartMode]);

  // Update line and area colors when price moves above/below open strike
  useEffect(() => {
    const series = seriesRef.current;
    if (!series || livePrice == null || openPrice == null) return;
    const isUp = livePrice >= openPrice;
    if (chartMode === 'area') {
      (series as ISeriesApi<'Area'>).applyOptions({
        lineColor: isUp ? '#22C55E' : '#EF4444',
        topColor: isUp ? 'rgba(34, 197, 94, 0.32)' : 'rgba(239, 68, 68, 0.32)',
      });
    } else if (chartMode === 'line') {
      (series as ISeriesApi<'Line'>).applyOptions({
        color: isUp ? '#22C55E' : '#EF4444',
      });
    }
  }, [livePrice, openPrice, chartMode]);

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
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'OPEN STRIKE',
      });
    }
  }, [openPrice]);

  const activeBar = hoverData ?? (lastBarRef.current ? {
    open: lastBarRef.current.open,
    high: lastBarRef.current.high,
    low: lastBarRef.current.low,
    close: lastBarRef.current.close,
    changePercent: lastBarRef.current.open > 0 ? ((lastBarRef.current.close - lastBarRef.current.open) / lastBarRef.current.open) * 100 : 0,
  } : null);

  const barUp = activeBar ? activeBar.close >= activeBar.open : true;

  return (
    <div className="relative w-full h-full flex flex-col min-h-0 select-none">
      {/* TradingView Action Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#0f0f12]/90 border-b border-[#27272A]/70 text-xs font-mono shrink-0">
        {/* Left: Dynamic TradingView OHLC Readout */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {activeBar ? (
            <div className="flex items-center gap-2 text-[11px] font-medium text-[#a1a1aa] whitespace-nowrap">
              <span>O <strong className="text-white font-mono">{formatPrice(activeBar.open)}</strong></span>
              <span>H <strong className="text-white font-mono">{formatPrice(activeBar.high)}</strong></span>
              <span>L <strong className="text-white font-mono">{formatPrice(activeBar.low)}</strong></span>
              <span>C <strong className={barUp ? 'text-[#089981] font-mono font-bold' : 'text-[#f23645] font-mono font-bold'}>{formatPrice(activeBar.close)}</strong></span>
              <span className={`px-1 rounded text-[10px] font-bold ${barUp ? 'text-[#089981] bg-[#089981]/10' : 'text-[#f23645] bg-[#f23645]/10'}`}>
                {barUp ? '+' : ''}{activeBar.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span className="text-[#71717a] text-[11px]">Streaming live ticks...</span>
          )}
        </div>

        {/* Right: Timeframe, Chart Style & Zoom Controls */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {/* Timeframe Pills */}
          <div className="flex items-center bg-[#18181b] rounded-md p-0.5 border border-[#27272A]">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-1.5 py-0.5 text-[10px] font-['Epilogue'] font-semibold rounded transition-colors ${
                  timeframe === tf
                    ? 'bg-[#27272A] text-white'
                    : 'text-[#8e9192] hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Style Selector */}
          <div className="flex items-center bg-[#18181b] rounded-md p-0.5 border border-[#27272A]">
            <button
              type="button"
              onClick={() => setChartMode('candles')}
              className={`px-2 py-0.5 text-[10px] font-['Epilogue'] font-semibold rounded transition-colors ${
                chartMode === 'candles'
                  ? 'bg-[#27272A] text-white'
                  : 'text-[#8e9192] hover:text-white'
              }`}
            >
              Candles
            </button>
            <button
              type="button"
              onClick={() => setChartMode('area')}
              className={`px-2 py-0.5 text-[10px] font-['Epilogue'] font-semibold rounded transition-colors ${
                chartMode === 'area'
                  ? 'bg-[#27272A] text-white'
                  : 'text-[#8e9192] hover:text-white'
              }`}
            >
              Area
            </button>
            <button
              type="button"
              onClick={() => setChartMode('line')}
              className={`px-2 py-0.5 text-[10px] font-['Epilogue'] font-semibold rounded transition-colors ${
                chartMode === 'line'
                  ? 'bg-[#27272A] text-white'
                  : 'text-[#8e9192] hover:text-white'
              }`}
            >
              Line
            </button>
          </div>

          {/* Zoom Buttons */}
          <div className="flex items-center gap-1 bg-[#18181b] rounded-md p-0.5 border border-[#27272A]">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1 text-[#a1a1aa] hover:text-white hover:bg-[#27272A] rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1 text-[#a1a1aa] hover:text-white hover:bg-[#27272A] rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Fit to Screen / Reset View"
              className="p-1 text-[#a1a1aa] hover:text-white hover:bg-[#27272A] rounded transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 min-h-[160px] relative" />

      {/* Floating Snap to Live Indicator */}
      {isPanned && (
        <button
          type="button"
          onClick={handleReset}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#18181b]/95 border border-[#27272A] text-[11px] font-['Epilogue'] font-bold text-[#22C55E] shadow-xl hover:bg-[#27272A] transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          Snap to Live
        </button>
      )}
    </div>
  );
}

export default CandleChart;
