'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';

import { ArenaShareModal } from '@/components/arena/arena-share-modal';
import { BigScreen } from '@/components/arena/big-screen';
import { Leaderboard } from '@/components/arena/leaderboard';
import { CrowdGraph, type CrowdTradeItem } from '@/components/arena/crowd-graph';
import { TournamentAnalysis } from '@/components/arena/tournament-analysis';
import { TradePanel } from '@/components/arena/trade-panel';
import { AppShell } from '@/components/app-shell';
import { SiteSidebar } from '@/components/site-sidebar';
import { useArena, useCountdown } from '@/hooks/use-arena';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';
import type { PositionSummary } from '@/lib/engine/trading';
import { cx, formatCountdown, formatPoints, formatPrice, formatTime } from '@/lib/format';
import { roundPhase } from '@/components/arena/round-timer';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((mod) => mod.CandleChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 w-full animate-pulse rounded-xl bg-[#201f1f] flex items-center justify-center font-['Epilogue'] text-xs text-[#c4c7c8]">
        Loading price action...
      </div>
    ),
  },
);

export function LiveArena({
  initialArena,
  isOrganizer = false,
}: {
  initialArena: ArenaPublicInfo;
  isOrganizer?: boolean;
}) {
  const code = initialArena.code;
  const {
    snapshot,
    round,
    leaderboard,
    arena,
    price,
    clockOffsetMs,
    lastTrade,
    refresh,
  } = useArena(code);

  const [rightTab, setRightTab] = useState<'tape' | 'leaderboard'>('tape');
  const [mobileTab, setMobileTab] = useState<'chart' | 'positions' | 'tape' | 'leaderboard'>('chart');
  const [mobileTradeSheetOpen, setMobileTradeSheetOpen] = useState(false);
  const [mobileTradeSide, setMobileTradeSide] = useState<'YES' | 'NO'>('YES');
  const [activeView, setActiveView] = useState<'live' | 'screen' | 'analysis'>('live');
  const [showShareModal, setShowShareModal] = useState(false);
  const [trades, setTrades] = useState<CrowdTradeItem[]>([]);
  const [optimisticPriceYes, setOptimisticPriceYes] = useState<number | null>(null);
  const [tradeFilledBalance, setTradeFilledBalance] = useState<number | null>(null);
  const [tradeFilledPosition, setTradeFilledPosition] = useState<PositionSummary | null>(null);

  // Sync initial view from URL query param ?view=screen|analysis|live (only for organizers)
  useEffect(() => {
    if (typeof window !== 'undefined' && isOrganizer) {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'screen' || viewParam === 'analysis' || viewParam === 'live') {
        setActiveView(viewParam);
      }
    }
  }, [isOrganizer]);

  const handleViewChange = (view: 'live' | 'screen' | 'analysis') => {
    if (!isOrganizer) {
      setActiveView('live');
      return;
    }
    setActiveView(view);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (view === 'live') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', view);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const loadTrades = useCallback(async () => {
    try {
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/trades`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.trades)) {
          setTrades(data.trades);
        }
      }
    } catch {}
  }, [code]);

  // Load initial recent trades snapshot once on mount
  useEffect(() => {
    void loadTrades();
  }, [loadTrades]);

  // When a new trade arrives over socket, smoothly append to bounded sliding buffer (max 50)
  useEffect(() => {
    if (lastTrade) {
      setTrades((prev) => {
        const next = [
          ...prev.slice(-49),
          {
            id: `sock-${Date.now()}-${Math.random()}`,
            side: lastTrade.side,
            shares: lastTrade.shares,
            cost: lastTrade.cost,
            at: lastTrade.at,
          },
        ];
        return next;
      });
    }
  }, [lastTrade]);

  // Reconcile optimistic price when authoritative server price changes
  useEffect(() => {
    setOptimisticPriceYes(null);
  }, [round?.priceYes]);

  // Reset trade-filled overrides when the server snapshot confirms a new balance
  // (this happens on socket reconnect -> refresh() -> new snapshot)
  useEffect(() => {
    setTradeFilledBalance(null);
    setTradeFilledPosition(null);
  }, [snapshot?.viewer?.balance]);

  const info = snapshot?.arena ?? initialArena;
  const viewer = snapshot?.viewer ?? null;
  // 1-second interval heartbeat to keep now, phase, and tradingOpen real-time synchronized with the clock
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const now = currentTime + clockOffsetMs;
  const status = arena?.status ?? initialArena.status;
  const phase = roundPhase(round, now);
  const tradingOpen = status === 'LIVE' && phase === 'trading';
  const effectivePriceYes = optimisticPriceYes ?? (round?.priceYes ?? 0.5);

  const disabledReason =
    status === 'LOBBY'
      ? 'Waiting for organizer to start Round 1'
      : status === 'ENDED'
        ? 'This Arena has finished'
        : phase === 'closing'
          ? 'Round is locking — calculating settlement'
          : phase === 'waiting'
            ? 'Waiting for round to open'
            : 'Trading is currently closed.';

  const currentRoundNum = arena?.currentRound ?? info.currentRound;
  const totalRounds = info.totalRounds;


  const leaderboardEntries = leaderboard?.entries ?? [];
  const userRank = viewer?.rank ?? (leaderboardEntries.findIndex((p) => p.displayName === viewer?.participantId) + 1);
  const effectiveBalance = tradeFilledBalance ?? viewer?.balance ?? info.startingBalance;
  const position = tradeFilledPosition ?? viewer?.position ?? null;
  const effectivePosition = position;

  // Question & subtitle construction
  const isCustomMarket = info.marketCategory !== 'CRYPTO_PRICE';
  const customQuestion = round?.question || info.question;
  const questionTitle = isCustomMarket
    ? (customQuestion || info.name)
    : `Will ${info.asset.replace('USDT', '')} close UP above the round's open price?`;
  const questionSubtitle = isCustomMarket
    ? (info.resolutionCriteria
        ? `Resolution Criteria: ${info.resolutionCriteria}. Winning outcome pays 1 point per share.`
        : `Buy YES if you predict this outcome will occur, or NO if not. Winning outcome pays 1 point per share.`)
    : `Polymarket binary market: Buy YES if you predict ${info.asset.replace('USDT', '')} will rise, or NO if it falls. Winning outcome pays 1 point per share at round settlement.`;

  // Direct inline view delegation (only available to organizers):
  if (isOrganizer && activeView === 'screen') {
    return <BigScreen initialArena={initialArena} onSelectView={handleViewChange} />;
  }

  if (isOrganizer && activeView === 'analysis') {
    return (
      <TournamentAnalysis
        initialArena={initialArena}
        onSelectView={handleViewChange}
        onBack={() => handleViewChange('live')}
      />
    );
  }

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased w-full max-w-full">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <AppShell className="relative">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-30">
          <div className="flex items-center gap-4">
            <Link
              href="/arenas"
              className="flex items-center gap-1.5 group text-[#c4c7c8] hover:text-white transition-colors"
              title="Return to Arenas Catalog"
            >
              <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-0.5">arrow_back</span>
              <span className="font-['Geist'] text-lg font-bold text-white">Arenas</span>
            </Link>
            <div className="hidden sm:flex gap-2">
              <span className="px-2.5 py-1 rounded-full border border-[#27272A] bg-[#201f1f] font-['Epilogue'] text-xs text-[#c4c7c8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">vpn_key</span> {info.code}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-[#27272A] bg-[#201f1f] font-['Epilogue'] text-xs text-[#c4c7c8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">cycle</span> Round {currentRoundNum} of {totalRounds}
              </span>
            </div>
          </div>

          {/* 3 Main Views Switcher - Only visible to Organizers */}
          {isOrganizer && (
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141418] border border-[#27272A]">
              <button
                type="button"
                onClick={() => handleViewChange('live')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-bold transition-all cursor-pointer bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
              >
                <span className="material-symbols-outlined text-[14px]">bolt</span>
                <span>Live Arena</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewChange('screen')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium transition-all cursor-pointer text-[#a1a1aa] hover:text-white hover:bg-[#201f1f]"
              >
                <span className="material-symbols-outlined text-[14px]">tv</span>
                <span>Big Screen</span>
              </button>

              <button
                type="button"
                onClick={() => handleViewChange('analysis')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium transition-all cursor-pointer text-[#a1a1aa] hover:text-white hover:bg-[#201f1f]"
              >
                <span className="material-symbols-outlined text-[14px]">analytics</span>
                <span>Analysis</span>
              </button>
            </div>
          )}

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">BALANCE</div>
                <div className="font-['Epilogue'] text-sm font-bold text-white">
                  {formatPoints(effectiveBalance, 0)} arcs
                </div>
              </div>
              <div className="h-6 w-px bg-[#27272A]" />
              <div className="text-right">
                <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">RANK</div>
                <div className="font-['Epilogue'] text-sm font-bold text-white">
                  {userRank > 0 ? `#${userRank}` : '—'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#27272A] bg-[#201f1f] text-xs font-['Epilogue'] font-bold text-white hover:bg-[#2a2a2a] transition-colors"
                title="Share & QR Code"
              >
                <span className="material-symbols-outlined text-[16px] text-[#22C55E]">qr_code_2</span>
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
        </header>

        {showShareModal && (
          <ArenaShareModal
            code={info.code}
            name={info.name}
            isOpen={true}
            onClose={() => setShowShareModal(false)}
          />
        )}

        {/* Page Content Canvas */}
        <div className="flex-1 p-3 sm:p-6 md:p-12 pb-24 lg:pb-12 max-w-[1280px] mx-auto w-full min-w-0 max-w-full flex flex-col gap-4 sm:gap-6">
          {/* Mobile Status Strip */}
          <div className="md:hidden flex flex-col gap-2.5 bg-[#141414] border border-[#27272A] rounded-xl p-3 font-['Epilogue'] text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Link href="/arenas" className="flex items-center text-[#c4c7c8] hover:text-white mr-1" title="Back to Arenas">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                </Link>
                <span className="font-mono font-bold text-[#22C55E]">{info.code}</span>
                <span className="text-[#8e9192]">·</span>
                <span className="text-[#c4c7c8]">R{currentRoundNum}/{totalRounds}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-bold">{formatPoints(viewer?.balance ?? info.startingBalance, 0)} arcs</span>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="p-1 rounded bg-[#201f1f] border border-[#27272A] text-white flex items-center"
                >
                  <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                </button>
              </div>
            </div>

            {/* Mobile View Switcher Buttons - Only visible to Organizers */}
            {isOrganizer && (
              <div className="flex items-center gap-1 pt-1.5 border-t border-[#27272A]/70">
                <button
                  type="button"
                  onClick={() => handleViewChange('live')}
                  className="flex-1 py-1 rounded-md text-center font-bold text-[10px] transition-colors bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('screen')}
                  className="flex-1 py-1 rounded-md text-center font-medium text-[10px] transition-colors bg-[#18181c] text-[#a1a1aa] border border-[#27272A]"
                >
                  Big Screen
                </button>
                <button
                  type="button"
                  onClick={() => handleViewChange('analysis')}
                  className="flex-1 py-1 rounded-md text-center font-medium text-[10px] transition-colors bg-[#18181c] text-[#a1a1aa] border border-[#27272A]"
                >
                  Analysis
                </button>
              </div>
            )}
          </div>
          {/* Header Title & Timer Bar */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] uppercase tracking-wider">
                  {isCustomMarket ? 'CAMPUS PREDICTION MARKET' : 'POLYMARKET BINARY OUTCOME'}
                </div>
                {info.collegeName && (
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[13px]">school</span>
                    <span>{info.collegeName}</span>
                  </div>
                )}
              </div>
              <h1 className="font-['Geist'] text-2xl md:text-3xl font-bold text-white mb-1">
                {questionTitle}
              </h1>
              <p className="font-['Geist'] text-xs text-[#c4c7c8] max-w-2xl leading-relaxed">
                {questionSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
              {/* Real-time Winning Price Indicator Beside Timer */}
              {price?.price != null && round?.openPrice != null ? (
                (() => {
                  const delta = price.price - round.openPrice;
                  const isYesWinning = delta >= 0;
                  return (
                    <div
                      className={cx(
                        'flex flex-col items-start justify-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border shadow-lg backdrop-blur-xl transition-all duration-150 flex-1 sm:flex-initial h-[52px]',
                        isYesWinning
                          ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                          : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]',
                      )}
                    >
                      <div className="flex items-center gap-1.5 font-['Epilogue'] text-[10px] font-black uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
                        <span>{isYesWinning ? 'YES WINNING' : 'NO WINNING'}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="font-mono text-base font-black text-white">
                          {formatPrice(price.price)}
                        </span>
                        <span className="font-mono text-[11px] font-bold">
                          {isYesWinning ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  );
                })()
              ) : null}

              <ParticipantTimer round={round} clockOffsetMs={clockOffsetMs} status={status} />
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chart, Crowd Graph & Positions */}
            <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
              {/* Spotlight Question & Probability Meter (Custom) or Candlestick Chart (Crypto) */}
              {isCustomMarket ? (
                <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.85)] backdrop-blur-xl rounded-xl flex flex-col gap-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-[#201f1f] text-[#c4c7c8] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider">
                      Prediction Question
                    </span>
                    <span className="font-['Epilogue'] text-xs text-[#a1a1aa]">
                      Round {currentRoundNum} of {totalRounds}
                    </span>
                  </div>

                  <h2 className="font-['Geist'] text-xl sm:text-2xl font-bold text-white leading-snug">
                    {customQuestion || info.name}
                  </h2>

                  {info.resolutionCriteria && (
                    <div className="p-3 bg-[#18181b] rounded-lg border border-[#27272a] text-xs text-[#a1a1aa]">
                      <strong className="text-[#e4e4e7]">Resolution Criteria:</strong> {info.resolutionCriteria}
                    </div>
                  )}

                  {/* Probability Bar */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-[#27272a]">
                    <div className="flex justify-between items-center text-xs font-['Epilogue'] font-bold">
                      <span className="text-[#22C55E]">YES CHANCE: {(effectivePriceYes * 100).toFixed(1)}%</span>
                      <span className="text-[#EF4444]">NO CHANCE: {((1 - effectivePriceYes) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-3.5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                      <div
                        className="h-full bg-[#22C55E] transition-all duration-150 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, effectivePriceYes * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col min-h-[380px]">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-['Epilogue'] text-xs font-bold text-white bg-[#201f1f] px-2.5 py-1 rounded border border-[#27272A]">
                        {info.asset}
                      </span>
                      <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
                        {info.roundDurationSec / 60}m candle
                      </span>
                    </div>
                    <div className="font-['Epilogue'] text-sm font-bold text-white">
                      Live Spot: ${price?.price?.toLocaleString() ?? '—'}
                    </div>
                  </div>

                  <div className="flex-1 w-full rounded-xl overflow-hidden bg-[#1c1b1b] border border-[#27272A]">
                    <CandleChart code={info.code} openPrice={round?.openPrice} livePrice={price?.price} />
                  </div>
                </div>
              )}

              {/* Mobile Segmented Workspace Tabs (Switch between Odds, Positions, Live Tape, Rankings) */}
              <div className="lg:hidden flex p-1 rounded-xl bg-[#121215] border border-[#27272A] gap-1 text-xs font-['Epilogue'] font-bold">
                <button
                  type="button"
                  onClick={() => setMobileTab('chart')}
                  className={cx(
                    "flex-1 py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1",
                    mobileTab === 'chart'
                      ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm"
                      : "text-[#a1a1aa] hover:text-white border border-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">monitoring</span>
                  <span>Odds</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('positions')}
                  className={cx(
                    "flex-1 py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1",
                    mobileTab === 'positions'
                      ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm"
                      : "text-[#a1a1aa] hover:text-white border border-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">work</span>
                  <span>Positions</span>
                  {Boolean(position && (position.yesShares > 0 || position.noShares > 0)) && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('tape')}
                  className={cx(
                    "flex-1 py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1",
                    mobileTab === 'tape'
                      ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm"
                      : "text-[#a1a1aa] hover:text-white border border-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">dynamic_feed</span>
                  <span>Tape</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab('leaderboard')}
                  className={cx(
                    "flex-1 py-2 px-1 rounded-lg text-center transition-all flex items-center justify-center gap-1",
                    mobileTab === 'leaderboard'
                      ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm"
                      : "text-[#a1a1aa] hover:text-white border border-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-[15px]">military_tech</span>
                  <span>Ranks</span>
                </button>
              </div>

              {/* YES / NO Crowd Investment Graph (Always visible on desktop; visible on mobile when Odds tab active) */}
              <div className={cx(
                "glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl",
                mobileTab === 'chart' ? "block" : "hidden lg:block"
              )}>
                <CrowdGraph
                  trades={trades}
                  priceYes={effectivePriceYes}
                  qYes={round?.qYes}
                  qNo={round?.qNo}
                  asset={info.asset}
                  openPrice={round?.openPrice}
                  livePrice={price?.price}
                />
              </div>

              {/* My Positions (Always visible on desktop; visible on mobile when Positions tab active) */}
              <div className={cx(
                "glass-panel p-4 sm:p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl min-w-0 overflow-hidden",
                mobileTab === 'positions' ? "block" : "hidden lg:block"
              )}>
                <h3 className="font-['Geist'] text-lg font-bold text-white mb-4">My Positions</h3>

                {/* Mobile Card Layout (< sm) */}
                <div className="sm:hidden flex flex-col gap-3">
                  {position && (position.yesShares > 0 || position.noShares > 0) ? (
                    <>
                      {position.yesShares > 0 && (
                        <div className="bg-[#18181b] border border-[#22C55E]/30 rounded-xl p-3.5 flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 rounded font-bold text-xs bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 font-['Epilogue']">
                              YES SHARES
                            </span>
                            <span className="font-mono text-sm font-bold text-white">
                              {position.yesShares.toFixed(1)} sh
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-[11px] font-['Epilogue']">
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">AVG COST</span>
                              <span className="text-white font-mono font-semibold">{(position.yesAvgPrice ?? 0.5).toFixed(2)} arcs</span>
                            </div>
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">TOTAL INVESTED</span>
                              <span className="text-white font-mono font-semibold">{position.yesCost.toFixed(0)} arcs</span>
                            </div>
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">PAYOUT IF WIN</span>
                              <span className="text-[#22C55E] font-mono font-bold">+{position.yesShares.toFixed(0)} arcs</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {position.noShares > 0 && (
                        <div className="bg-[#18181b] border border-[#EF4444]/30 rounded-xl p-3.5 flex flex-col gap-2.5">
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-0.5 rounded font-bold text-xs bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 font-['Epilogue']">
                              NO SHARES
                            </span>
                            <span className="font-mono text-sm font-bold text-white">
                              {position.noShares.toFixed(1)} sh
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-[11px] font-['Epilogue']">
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">AVG COST</span>
                              <span className="text-white font-mono font-semibold">{(position.noAvgPrice ?? 0.5).toFixed(2)} arcs</span>
                            </div>
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">TOTAL INVESTED</span>
                              <span className="text-white font-mono font-semibold">{position.noCost.toFixed(0)} arcs</span>
                            </div>
                            <div>
                              <span className="text-[#8e9192] block text-[10px]">PAYOUT IF WIN</span>
                              <span className="text-[#EF4444] font-mono font-bold">+{position.noShares.toFixed(0)} arcs</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-6 text-center text-[#c4c7c8] text-xs">
                      No active YES or NO share positions in this round.
                    </div>
                  )}
                </div>

                {/* Desktop Table Layout (>= sm) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left font-['Epilogue'] text-xs">
                    <thead>
                      <tr className="border-b border-[#27272A] text-[#c4c7c8]">
                        <th className="pb-2 font-bold uppercase">OUTCOME SHARES</th>
                        <th className="pb-2 font-bold uppercase text-right">SHARES HELD</th>
                        <th className="pb-2 font-bold uppercase text-right">AVG COST</th>
                        <th className="pb-2 font-bold uppercase text-right">TOTAL INVESTED</th>
                        <th className="pb-2 font-bold uppercase text-right">PAYOUT IF WIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {position && (position.yesShares > 0 || position.noShares > 0) ? (
                        <>
                          {position.yesShares > 0 && (
                            <tr className="border-b border-[#27272A]">
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                                  YES SHARES
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.yesShares.toFixed(1)}
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {(position.yesAvgPrice ?? 0.5).toFixed(2)} arcs
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.yesCost.toFixed(0)} arcs
                              </td>
                              <td className="py-3 text-right font-bold text-[#22C55E]">
                                {position.yesShares.toFixed(0)} arcs
                              </td>
                            </tr>
                          )}
                          {position.noShares > 0 && (
                            <tr className="border-b border-[#27272A]">
                              <td className="py-3">
                                <span className="px-2 py-0.5 rounded font-bold bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
                                  NO SHARES
                                </span>
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.noShares.toFixed(1)}
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {(position.noAvgPrice ?? 0.5).toFixed(2)} arcs
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.noCost.toFixed(0)} arcs
                              </td>
                              <td className="py-3 text-right font-bold text-[#EF4444]">
                                {position.noShares.toFixed(0)} arcs
                              </td>
                            </tr>
                          )}
                        </>
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#c4c7c8]">
                            No active YES or NO share positions in this round.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Feed & Leaderboard Switcher Container (shown on mobile when Tape or Ranks tab is selected) */}
              <div className={cx(
                "lg:hidden glass-panel p-5 border border-[#27272A] bg-[rgba(20,20,20,0.75)] backdrop-blur-xl rounded-2xl flex flex-col gap-4 shadow-xl",
                (mobileTab === 'tape' || mobileTab === 'leaderboard') ? "block" : "hidden"
              )}>
                <div className="flex items-center justify-between border-b border-[#27272A]/80 pb-3">
                  <div className="flex p-1 rounded-xl bg-[#121215] border border-[#27272A] gap-1">
                    <button
                      type="button"
                      onClick={() => setMobileTab('tape')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold transition-all duration-150 flex items-center gap-1.5 ${
                        mobileTab === 'tape'
                          ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] shadow-sm'
                          : 'text-[#a1a1aa] hover:text-white border border-transparent'
                      }`}
                    >
                      <span>LIVE TAPE</span>
                      {trades.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#22C55E]/20 text-[#22C55E] font-mono">
                          {trades.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileTab('leaderboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold transition-all duration-150 flex items-center gap-1.5 ${
                        mobileTab === 'leaderboard'
                          ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] shadow-sm'
                          : 'text-[#a1a1aa] hover:text-white border border-transparent'
                      }`}
                    >
                      <span>LEADERBOARD</span>
                      {leaderboard?.entries?.length ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAB308]/20 text-[#EAB308] font-mono">
                          {leaderboard.entries.length}
                        </span>
                      ) : null}
                    </button>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-[#22C55E] tracking-wider uppercase flex items-center gap-1.5 bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                  </span>
                </div>

                {mobileTab === 'tape' ? (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {trades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#18181b] border border-[#27272A]">
                          <span className="w-3 h-3 rounded-full bg-[#22C55E] animate-ping absolute opacity-75" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-['Geist'] text-xs font-bold text-white">Awaiting First Prediction</p>
                          <p className="font-['Geist'] text-[11px] text-[#71717a] max-w-[210px] leading-relaxed">
                            No trades filled in this round yet. Take a YES or NO position to lead the market tape!
                          </p>
                        </div>
                      </div>
                    ) : (
                      [...trades]
                        .reverse()
                        .slice(0, 20)
                        .map((trade) => {
                          const isYes = trade.side === 'YES';
                          return (
                            <div
                              key={trade.id}
                              className="group flex justify-between items-center py-2 px-3 rounded-xl bg-[#141417]/80 hover:bg-[#18181c] border border-[#27272A]/80 hover:border-[#3f3f46] font-['Geist'] text-xs transition-all duration-150"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black shrink-0 ${
                                    isYes
                                      ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
                                      : 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                                  }`}
                                >
                                  {isYes ? 'YES ▲' : 'NO ▼'}
                                </span>
                                <span className="font-bold text-white font-mono shrink-0">
                                  {formatPoints(trade.cost, 0)} arcs
                                </span>
                                {trade.shares && (
                                  <span className="text-[11px] text-[#71717a] font-mono truncate hidden sm:inline">
                                    ({trade.shares.toFixed(1)} sh)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">
                                {formatTime(trade.at)}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1">
                    <Leaderboard
                      data={leaderboard}
                      limit={15}
                      variant="compact"
                      highlightParticipantId={snapshot?.viewer?.participantId}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Entry & Feed/Leaderboard (Desktop >= lg) */}
            <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 min-w-0">
              {/* Order Entry Panel */}
              <TradePanel
                code={info.code}
                balance={effectiveBalance}
                maxStakePerTrade={info.maxStakePerTrade}
                liquidityParamB={info.liquidityParamB}
                qYes={round?.qYes ?? 0}
                qNo={round?.qNo ?? 0}
                priceYes={effectivePriceYes}
                position={effectivePosition}
                tradingOpen={tradingOpen}
                disabledReason={disabledReason}
                tradesPerMinuteLimit={info.tradesPerMinuteLimit}
                onOptimisticPrice={(p) => setOptimisticPriceYes(p)}
                onFilled={(result) => {
                  setTradeFilledBalance(result.balance);
                  setTradeFilledPosition(result.position);
                }}
              />

              {/* Feed & Leaderboard Switcher */}
              <div className="glass-panel p-5 border border-[#27272A] bg-[rgba(20,20,20,0.75)] backdrop-blur-xl rounded-2xl flex flex-col gap-4 shadow-xl">
                <div className="flex items-center justify-between border-b border-[#27272A]/80 pb-3">
                  {/* Segmented Pill Switcher */}
                  <div className="flex p-1 rounded-xl bg-[#121215] border border-[#27272A] gap-1">
                    <button
                      type="button"
                      onClick={() => setRightTab('tape')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
                        rightTab === 'tape'
                          ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] shadow-sm'
                          : 'text-[#a1a1aa] hover:text-white border border-transparent'
                      }`}
                    >
                      <span>LIVE TAPE</span>
                      {trades.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#22C55E]/20 text-[#22C55E] font-mono">
                          {trades.length}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightTab('leaderboard')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold transition-all duration-150 flex items-center gap-1.5 active:scale-95 ${
                        rightTab === 'leaderboard'
                          ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] shadow-sm'
                          : 'text-[#a1a1aa] hover:text-white border border-transparent'
                      }`}
                    >
                      <span>LEADERBOARD</span>
                      {leaderboard?.entries?.length ? (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#EAB308]/20 text-[#EAB308] font-mono">
                          {leaderboard.entries.length}
                        </span>
                      ) : null}
                    </button>
                  </div>

                  <span className="font-mono text-[10px] font-bold text-[#22C55E] tracking-wider uppercase flex items-center gap-1.5 bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE FEED
                  </span>
                </div>

                {rightTab === 'tape' ? (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {trades.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3">
                        <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#18181b] border border-[#27272A]">
                          <span className="w-3 h-3 rounded-full bg-[#22C55E] animate-ping absolute opacity-75" />
                          <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="font-['Geist'] text-xs font-bold text-white">Awaiting First Prediction</p>
                          <p className="font-['Geist'] text-[11px] text-[#71717a] max-w-[210px] leading-relaxed">
                            No trades filled in this round yet. Take a YES or NO position to lead the market tape!
                          </p>
                        </div>
                      </div>
                    ) : (
                      [...trades]
                        .reverse()
                        .slice(0, 20)
                        .map((trade) => {
                          const isYes = trade.side === 'YES';
                          return (
                            <div
                              key={trade.id}
                              className="group flex justify-between items-center py-2 px-3 rounded-xl bg-[#141417]/80 hover:bg-[#18181c] border border-[#27272A]/80 hover:border-[#3f3f46] font-['Geist'] text-xs transition-all duration-150"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black shrink-0 ${
                                    isYes
                                      ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
                                      : 'bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444]'
                                  }`}
                                >
                                  {isYes ? 'YES ▲' : 'NO ▼'}
                                </span>
                                <span className="font-bold text-white font-mono shrink-0">
                                  {formatPoints(trade.cost, 0)} arcs
                                </span>
                                {trade.shares && (
                                  <span className="text-[11px] text-[#71717a] font-mono truncate hidden sm:inline">
                                    ({trade.shares.toFixed(1)} sh)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-[#a1a1aa] shrink-0">
                                {formatTime(trade.at)}
                              </span>
                            </div>
                          );
                        })
                    )}
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto pr-1">
                    <Leaderboard
                      data={leaderboard}
                      limit={15}
                      variant="compact"
                      highlightParticipantId={snapshot?.viewer?.participantId}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>

      {/* Mobile Sticky Bottom Trade Action Dock (< lg) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#141414]/95 border-t border-[#27272A] backdrop-blur-xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl">
        {!tradingOpen || effectiveBalance <= 0 ? (
          <div className="w-full py-3 px-4 rounded-xl bg-[#201f1f] border border-[#27272A] text-[#8e9192] text-xs font-['Epilogue'] font-bold text-center">
            {effectiveBalance <= 0 ? '0 Arcs Remaining' : disabledReason}
          </div>
        ) : (
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => {
                setMobileTradeSide('YES');
                setMobileTradeSheetOpen(true);
              }}
              className="flex-1 py-3 px-3 rounded-xl bg-[#22C55E] text-black font-['Epilogue'] font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all shadow-[#22C55E]/10"
            >
              <span className="text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                <span>BUY YES</span>
                <span className="text-[10px]">▲</span>
              </span>
              <span className="text-[10px] font-mono opacity-90">{effectivePriceYes.toFixed(2)} arcs/sh</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileTradeSide('NO');
                setMobileTradeSheetOpen(true);
              }}
              className="flex-1 py-3 px-3 rounded-xl bg-[#EF4444] text-white font-['Epilogue'] font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all shadow-[#EF4444]/10"
            >
              <span className="text-[11px] uppercase tracking-wider font-extrabold flex items-center gap-1">
                <span>BUY NO</span>
                <span className="text-[10px]">▼</span>
              </span>
              <span className="text-[10px] font-mono opacity-90">{(1 - effectivePriceYes).toFixed(2)} arcs/sh</span>
            </button>
          </div>
        )}
      </div>

      {/* Mobile Slide-up Order Sheet Modal (< lg) */}
      {mobileTradeSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex flex-col justify-end transition-opacity duration-200"
          onClick={() => setMobileTradeSheetOpen(false)}
        >
          <div
            className="bg-[#141418] border-t border-[#27272A] rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <TradePanel
              code={info.code}
              balance={effectiveBalance}
              maxStakePerTrade={info.maxStakePerTrade}
              liquidityParamB={info.liquidityParamB}
              qYes={round?.qYes ?? 0}
              qNo={round?.qNo ?? 0}
              priceYes={effectivePriceYes}
              position={effectivePosition}
              tradingOpen={tradingOpen}
              disabledReason={disabledReason}
              tradesPerMinuteLimit={info.tradesPerMinuteLimit}
              initialSide={mobileTradeSide}
              isSheet={true}
              onCloseSheet={() => setMobileTradeSheetOpen(false)}
              onOptimisticPrice={(p) => setOptimisticPriceYes(p)}
              onFilled={(result) => {
                setTradeFilledBalance(result.balance);
                setTradeFilledPosition(result.position);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const ParticipantTimer = memo(function ParticipantTimer({
  round,
  clockOffsetMs,
  status,
}: {
  round: any;
  clockOffsetMs: number;
  status: string;
}) {
  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const target =
    phase === 'resolved'
      ? (round?.settledAt
          ? new Date(new Date(round.settledAt).getTime() + 30_000).toISOString()
          : null)
      : phase === 'locked'
        ? (round?.resolvesAt ?? null)
        : (round?.locksAt ?? null);

  const remaining = useCountdown(target, clockOffsetMs);
  const timerLabel =
    phase === 'resolved'
      ? 'NEXT ROUND IN'
      : phase === 'locked' || phase === 'closing'
        ? 'RESOLVING IN'
        : 'TRADING LOCKS IN';

  return (
    <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 bg-[#201f1f] px-3 sm:px-4 py-2 rounded-xl border border-[#27272A] flex-1 sm:flex-initial h-[52px]">
      <div className="text-right">
        <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">
          {timerLabel}
        </div>
        <div className="font-mono text-lg font-bold text-white flex items-center gap-2 leading-none mt-0.5 tabular-nums">
          <span
            className={cx(
              'w-2 h-2 rounded-full',
              phase === 'resolved'
                ? 'bg-[#38bdf8]'
                : phase === 'locked' || phase === 'closing'
                  ? 'bg-[#EF4444]'
                  : 'bg-[#22C55E]',
              'animate-pulse',
            )}
          />
          {phase === 'resolved' && remaining <= 0
            ? '--:--'
            : (phase === 'locked' || phase === 'closing') && remaining <= 0
              ? 'SETTLING...'
              : formatCountdown(remaining)}
        </div>
      </div>
      <div className="h-6 w-px bg-[#27272A]" />
      <div>
        <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">STATUS</div>
        <div
          className={cx(
            'font-["Epilogue"] text-xs font-bold leading-none mt-1',
            phase === 'resolved'
              ? 'text-[#38bdf8]'
              : phase === 'locked' || phase === 'closing'
                ? 'text-[#EF4444]'
                : 'text-[#22C55E]',
          )}
        >
          {phase === 'resolved' ? 'RESOLVED' : phase === 'locked' ? 'LOCKED' : (status === 'LIVE' && phase === 'trading') ? 'TRADING' : status}
        </div>
      </div>
    </div>
  );
});
