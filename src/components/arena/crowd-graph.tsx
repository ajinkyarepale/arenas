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
import { useEffect, useMemo, useRef, useState } from 'react';
import { formatPoints, formatPrice } from '@/lib/format';

export interface CrowdTradeItem {
  id: string;
  side: 'YES' | 'NO';
  shares: number;
  cost: number;
  at: string;
}

interface CrowdGraphProps {
  trades: CrowdTradeItem[];
  qYes?: number;
  qNo?: number;
  priceYes?: number;
  asset?: string;
  openPrice?: number | null;
  livePrice?: number | null;
  height?: number;
  className?: string;
}

export function CrowdGraph({
  trades = [],
  qYes = 0,
  qNo = 0,
  priceYes = 0.5,
  asset = 'ETHUSDT',
  openPrice = null,
  livePrice = null,
  height = 240,
  className = '',
}: CrowdGraphProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const openLineRef = useRef<IPriceLine | null>(null);

  // Compute trade statistics
  const stats = useMemo(() => {
    let yesVolume = 0;
    let noVolume = 0;
    let yesCount = 0;
    let noCount = 0;

    for (const t of trades) {
      if (t.side === 'YES') {
        yesVolume += t.cost;
        yesCount += 1;
      } else {
        noVolume += t.cost;
        noCount += 1;
      }
    }

    const totalVolume = yesVolume + noVolume;
    const totalCount = yesCount + noCount;
    const yesPercent = totalVolume > 0 ? (yesVolume / totalVolume) * 100 : priceYes * 100;
    const noPercent = totalVolume > 0 ? (noVolume / totalVolume) * 100 : (1 - priceYes) * 100;

    return {
      yesVolume,
      noVolume,
      totalVolume,
      yesCount,
      noCount,
      totalCount,
      yesPercent,
      noPercent,
    };
  }, [trades, priceYes]);

  // Compute candle data for lightweight-charts
  const candleData = useMemo(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );

    if (sorted.length === 0) {
      // Create baseline bars from 50% probability
      const baseProb = priceYes * 100;
      const nowSec = Math.floor(Date.now() / 1000);
      const data = [];
      for (let i = 12; i >= 0; i--) {
        const time = (nowSec - i * 60) as UTCTimestamp;
        const wave = Math.sin(i) * 1.5;
        data.push({
          time,
          open: baseProb - 0.5 + wave,
          high: baseProb + 2 + wave,
          low: baseProb - 2 + wave,
          close: baseProb + 0.5 + wave,
        });
      }
      return data;
    }

    // Bucket trades by minute
    const minuteMap = new Map<number, CrowdTradeItem[]>();
    for (const t of sorted) {
      const timeMs = new Date(t.at).getTime();
      const minKey = Math.floor(timeMs / 60000) * 60;
      if (!minuteMap.has(minKey)) {
        minuteMap.set(minKey, []);
      }
      minuteMap.get(minKey)!.push(t);
    }

    let runningYes = 0;
    let runningNo = 0;
    let currentProb = 50;
    const result = [];

    const sortedMinutes = Array.from(minuteMap.keys()).sort((a, b) => a - b);
    for (const minKey of sortedMinutes) {
      const items = minuteMap.get(minKey)!;
      const open = currentProb;
      let high = open;
      let low = open;

      for (const item of items) {
        if (item.side === 'YES') runningYes += item.cost;
        else runningNo += item.cost;

        const total = runningYes + runningNo;
        const p = total > 0 ? (runningYes / total) * 100 : 50;
        if (p > high) high = p;
        if (p < low) low = p;
        currentProb = p;
      }

      const close = currentProb;
      result.push({
        time: minKey as UTCTimestamp,
        open,
        high: Math.max(high, open, close) + 0.2,
        low: Math.min(low, open, close) - 0.2,
        close,
      });
    }

    return result;
  }, [trades, priceYes]);

  const areaData = useMemo(() => {
    return candleData.map((c) => ({
      time: c.time,
      value: c.close,
    }));
  }, [candleData]);

  // Initialize and update lightweight-charts instance
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#141414' },
        textColor: '#8e9192',
        fontSize: 11,
        fontFamily: "'Geist', sans-serif",
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)', style: LineStyle.Dotted },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)', style: LineStyle.Dotted },
      },
      rightPriceScale: {
        borderColor: '#27272A',
        scaleMargins: { top: 0.15, bottom: 0.15 },
      },
      timeScale: {
        borderColor: '#27272A',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
        horzLine: {
          color: '#38bdf8',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0284c7',
        },
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: true,
      autoSize: false,
      width: container.clientWidth,
      height,
    });

    chartRef.current = chart;

    // Add Candlestick Series (Bar Graph Mode)
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
    });
    candleSeries.setData(candleData);
    candleSeriesRef.current = candleSeries;

    // Add Area Series (Line Graph Mode)
    const areaSeries = chart.addAreaSeries({
      lineColor: '#22c55e',
      topColor: 'rgba(34, 197, 94, 0.35)',
      bottomColor: 'rgba(34, 197, 94, 0.0)',
      lineWidth: 2,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => `${price.toFixed(1)}%`,
      },
    });
    areaSeries.setData(areaData);
    areaSeriesRef.current = areaSeries;

    // Set initial visibility according to chartType
    candleSeries.applyOptions({ visible: chartType === 'bar' });
    areaSeries.applyOptions({ visible: chartType === 'line' });

    // Add OPEN Reference Line
    const activeSeries = chartType === 'bar' ? candleSeries : areaSeries;
    const openLine = activeSeries.createPriceLine({
      price: 50,
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'OPEN',
    });
    openLineRef.current = openLine;

    // Fit content
    chart.timeScale().fitContent();

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height,
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      openLineRef.current = null;
    };
  }, [height]); // recreate only if height changes

  // Update data & series visibility dynamically when trades or chartType changes
  useEffect(() => {
    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(candleData);
      candleSeriesRef.current.applyOptions({ visible: chartType === 'bar' });
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.setData(areaData);
      areaSeriesRef.current.applyOptions({ visible: chartType === 'line' });
    }
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [candleData, areaData, chartType]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Top Bar matching screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-3">
          {/* Asset Badge & Interval */}
          <div className="flex items-center gap-2 bg-[#1c1b1b] border border-[#27272A] px-3 py-1.5 rounded-lg">
            <span className="font-['Geist'] font-bold text-white text-xs tracking-wider">
              {asset}
            </span>
            <span className="text-[#8e9192] text-xs">·</span>
            <span className="text-[#c4c7c8] text-xs font-mono">YES / NO Candle</span>
          </div>

          {/* Switcher Toggle */}
          <div className="flex items-center bg-[#141414] border border-[#27272A] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-['Epilogue'] font-semibold transition-all ${
                chartType === 'bar'
                  ? 'bg-[#22C55E] text-[#131313] shadow font-bold'
                  : 'text-[#c4c7c8] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">candlestick_chart</span>
              <span>Bar Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-['Epilogue'] font-semibold transition-all ${
                chartType === 'line'
                  ? 'bg-[#22C55E] text-[#131313] shadow font-bold'
                  : 'text-[#c4c7c8] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">show_chart</span>
              <span>Line Graph</span>
            </button>
          </div>
        </div>

        {/* Live Probability & Price Indicator */}
        <div className="flex items-center gap-4 font-['Epilogue'] text-xs">
          <div className="text-right">
            <span className="text-[#8e9192] mr-1.5">Live Implied YES:</span>
            <span className={`font-mono text-sm font-bold ${stats.yesPercent >= 50 ? 'text-[#22C55E]' : 'text-[#ef4444]'}`}>
              {stats.yesPercent.toFixed(1)}%
            </span>
          </div>
          {livePrice !== null && (
            <div className="hidden sm:block text-right border-l border-[#27272A] pl-3">
              <span className="text-[#8e9192] mr-1.5">Spot Price:</span>
              <span className="font-mono text-sm font-bold text-white">{formatPrice(livePrice)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Lightweight Charts TradingView Canvas */}
      <div className="relative w-full rounded-2xl bg-[#141414] border border-[#27272A] p-2 overflow-hidden shadow-2xl">
        <div ref={containerRef} className="w-full" style={{ height }} />

        {/* TradingView Watermark Overlay */}
        <div className="pointer-events-none absolute bottom-3 left-4 flex items-center gap-1 opacity-30">
          <div className="w-6 h-4 border border-white rounded flex items-center justify-center text-[9px] font-bold text-white">
            TV
          </div>
        </div>
      </div>

      {/* Real Trade Volume Distribution Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-['Epilogue'] text-xs">
        <div className="bg-[#1c1b1b] border border-[#27272A] rounded-lg p-2.5 flex flex-col gap-0.5">
          <span className="text-[#8e9192] text-[10px] uppercase font-bold">YES Volume</span>
          <span className="font-mono text-sm font-bold text-[#22C55E]">
            {formatPoints(stats.yesVolume, 0)} pts ({stats.yesPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="bg-[#1c1b1b] border border-[#27272A] rounded-lg p-2.5 flex flex-col gap-0.5">
          <span className="text-[#8e9192] text-[10px] uppercase font-bold">NO Volume</span>
          <span className="font-mono text-sm font-bold text-[#ef4444]">
            {formatPoints(stats.noVolume, 0)} pts ({stats.noPercent.toFixed(1)}%)
          </span>
        </div>
        <div className="bg-[#1c1b1b] border border-[#27272A] rounded-lg p-2.5 flex flex-col gap-0.5">
          <span className="text-[#8e9192] text-[10px] uppercase font-bold">Total Stake</span>
          <span className="font-mono text-sm font-bold text-white">
            {formatPoints(stats.totalVolume, 0)} pts
          </span>
        </div>
        <div className="bg-[#1c1b1b] border border-[#27272A] rounded-lg p-2.5 flex flex-col gap-0.5">
          <span className="text-[#8e9192] text-[10px] uppercase font-bold">Total Trades</span>
          <span className="font-mono text-sm font-bold text-white">
            {stats.totalCount} orders ({stats.yesCount} YES / {stats.noCount} NO)
          </span>
        </div>
      </div>
    </div>
  );
}
