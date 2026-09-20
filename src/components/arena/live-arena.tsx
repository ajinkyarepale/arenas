'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ArenaShareModal } from '@/components/arena/arena-share-modal';
import { CrowdGraph, type CrowdTradeItem } from '@/components/arena/crowd-graph';
import { TradePanel } from '@/components/arena/trade-panel';
import { SiteSidebar } from '@/components/site-sidebar';
import { useArena } from '@/hooks/use-arena';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';
import { cx, formatPoints, formatPrice, formatTime } from '@/lib/format';
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

export function LiveArena({ initialArena }: { initialArena: ArenaPublicInfo }) {
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
  const [showShareModal, setShowShareModal] = useState(false);
  const [trades, setTrades] = useState<CrowdTradeItem[]>([]);

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

  useEffect(() => {
    void loadTrades();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void loadTrades();
    }, 4000);
    return () => clearInterval(interval);
  }, [loadTrades]);

  // When a new trade arrives over socket, update trades state
  useEffect(() => {
    if (lastTrade) {
      setTrades((prev) => [
        ...prev,
        {
          id: `sock-${Date.now()}-${Math.random()}`,
          side: lastTrade.side,
          shares: lastTrade.shares,
          cost: lastTrade.cost,
          at: lastTrade.at,
        },
      ]);
    }
  }, [lastTrade]);

  const info = snapshot?.arena ?? initialArena;
  const viewer = snapshot?.viewer ?? null;
  const status = arena?.status ?? info.status;

  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const tradingOpen = status === 'LIVE' && phase === 'trading';
  const priceYes = round?.priceYes ?? 0.5;

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

  // Calculate remaining seconds in current round
  const closesAt = round?.locksAt ? new Date(round.locksAt).getTime() : now;
  const remainingMs = Math.max(0, closesAt - now);
  const remainingSec = Math.floor(remainingMs / 1000);
  const timerMin = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const timerSec = String(remainingSec % 60).padStart(2, '0');

  const leaderboardEntries = leaderboard?.entries ?? [];
  const userRank = viewer?.rank ?? (leaderboardEntries.findIndex((p) => p.displayName === viewer?.participantId) + 1);
  const position = viewer?.position ?? null;

  // Question & subtitle construction
  const isCustomMarket = info.marketCategory !== 'CRYPTO_PRICE';
  const customQuestion = round?.question || info.question;
  const questionTitle = isCustomMarket
    ? (customQuestion || info.name)
    : `Will ${info.asset.replace('USDT', '')} close UP above the round's open price?`;
  const questionSubtitle = isCustomMarket
    ? (info.resolutionCriteria
        ? `Resolution Criteria: ${info.resolutionCriteria}. Winning outcome pays 100 points per share.`
        : `Buy YES if you predict this outcome will occur, or NO if not. Winning outcome pays 100 points per share.`)
    : `Polymarket binary market: Buy YES if you predict ${info.asset.replace('USDT', '')} will rise, or NO if it falls. Winning outcome pays 100 points ($1.00) per share at round settlement.`;

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-30">
          <div className="flex items-center gap-4">
            <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
            <div className="hidden sm:flex gap-2">
              <span className="px-2.5 py-1 rounded-full border border-[#27272A] bg-[#201f1f] font-['Epilogue'] text-xs text-[#c4c7c8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">vpn_key</span> {info.code}
              </span>
              <span className="px-2.5 py-1 rounded-full border border-[#27272A] bg-[#201f1f] font-['Epilogue'] text-xs text-[#c4c7c8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">cycle</span> Round {currentRoundNum} of {totalRounds}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">BALANCE</div>
                <div className="font-['Epilogue'] text-sm font-bold text-white">
                  {formatPoints(viewer?.balance ?? info.startingBalance, 0)} pts
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
        <div className="flex-1 p-3 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-4 sm:gap-6">
          {/* Mobile Status Strip */}
          <div className="md:hidden flex flex-wrap items-center justify-between bg-[#141414] border border-[#27272A] rounded-xl px-4 py-2.5 gap-2 font-['Epilogue'] text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#22C55E]">{info.code}</span>
              <span className="text-[#8e9192]">·</span>
              <span className="text-[#c4c7c8]">R{currentRoundNum}/{totalRounds}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-white font-bold">{formatPoints(viewer?.balance ?? info.startingBalance, 0)} pts</span>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="p-1 rounded bg-[#201f1f] border border-[#27272A] text-white flex items-center"
              >
                <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
              </button>
            </div>
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

            <div className="flex flex-wrap items-center gap-3">
              {/* Real-time Winning Price Indicator Beside Timer */}
              {price?.price != null && round?.openPrice != null ? (
                (() => {
                  const delta = price.price - round.openPrice;
                  const isYesWinning = delta >= 0;
                  return (
                    <div
                      className={cx(
                        'flex flex-col items-start justify-center px-3.5 py-2 rounded-xl border shadow-lg backdrop-blur-xl transition-all duration-150',
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

              <div className="flex items-center gap-4 bg-[#201f1f] px-4 py-2.5 rounded-xl border border-[#27272A]">
                <div className="text-right">
                  <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">ROUND ENDS IN</div>
                  <div className="font-['Epilogue'] text-lg font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    {timerMin}:{timerSec}
                  </div>
                </div>
                <div className="h-8 w-px bg-[#27272A]" />
                <div>
                  <div className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8]">STATUS</div>
                  <div className="font-['Epilogue'] text-xs font-bold text-[#22C55E]">
                    {tradingOpen ? 'TRADING' : status}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chart, Crowd Graph & Positions */}
            <div className="lg:col-span-8 flex flex-col gap-6">
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
                      <span className="text-[#22C55E]">YES CHANCE: {Math.round(priceYes * 100)}%</span>
                      <span className="text-[#EF4444]">NO CHANCE: {Math.round((1 - priceYes) * 100)}%</span>
                    </div>
                    <div className="h-3.5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                      <div
                        className="h-full bg-[#22C55E] transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
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

              {/* YES / NO Crowd Investment Graph (Switchable Line / Bar) */}
              <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl">
                <CrowdGraph
                  trades={trades}
                  priceYes={priceYes}
                  qYes={round?.qYes}
                  qNo={round?.qNo}
                  asset={info.asset}
                  openPrice={round?.openPrice}
                  livePrice={price?.price}
                />
              </div>

              {/* My Positions Table */}
              <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl">
                <h3 className="font-['Geist'] text-lg font-bold text-white mb-4">My Positions</h3>
                <div className="overflow-x-auto">
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
                                ¢{Math.round((position.yesAvgPrice ?? 0.5) * 100)}
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.yesCost.toFixed(0)} pts
                              </td>
                              <td className="py-3 text-right font-bold text-[#22C55E]">
                                {(position.yesShares * 100).toFixed(0)} pts
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
                                ¢{Math.round((position.noAvgPrice ?? 0.5) * 100)}
                              </td>
                              <td className="py-3 text-right font-bold text-white">
                                {position.noCost.toFixed(0)} pts
                              </td>
                              <td className="py-3 text-right font-bold text-[#EF4444]">
                                {(position.noShares * 100).toFixed(0)} pts
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
            </div>

            {/* Right Column: Order Entry & Feed/Leaderboard */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Order Entry Panel */}
              <TradePanel
                code={info.code}
                balance={viewer?.balance ?? info.startingBalance}
                maxStakePerTrade={info.maxStakePerTrade}
                liquidityParamB={info.liquidityParamB}
                qYes={round?.qYes ?? 0}
                qNo={round?.qNo ?? 0}
                priceYes={priceYes}
                position={position}
                tradingOpen={tradingOpen}
                disabledReason={disabledReason}
                tradesPerMinuteLimit={info.tradesPerMinuteLimit}
                onFilled={() => {
                  void refresh();
                  void loadTrades();
                }}
              />

              {/* Feed & Leaderboard Switcher */}
              <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setRightTab('tape')}
                      className={`font-['Epilogue'] text-xs font-bold transition-colors ${
                        rightTab === 'tape' ? 'text-white border-b-2 border-[#22C55E] pb-1' : 'text-[#c4c7c8]'
                      }`}
                    >
                      LIVE TAPE
                    </button>
                    <button
                      type="button"
                      onClick={() => setRightTab('leaderboard')}
                      className={`font-['Epilogue'] text-xs font-bold transition-colors ${
                        rightTab === 'leaderboard'
                          ? 'text-white border-b-2 border-[#22C55E] pb-1'
                          : 'text-[#c4c7c8]'
                      }`}
                    >
                      LEADERBOARD
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-[#22C55E] uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                  </span>
                </div>

                {rightTab === 'tape' ? (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {trades.length === 0 ? (
                      <p className="text-xs text-[#c4c7c8] py-8 text-center">No trades placed in this round yet.</p>
                    ) : (
                      [...trades]
                        .reverse()
                        .slice(0, 15)
                        .map((trade) => (
                          <div
                            key={trade.id}
                            className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#201f1f]/50 border border-[#27272A] font-['Epilogue'] text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  trade.side === 'YES'
                                    ? 'bg-[#22C55E]/15 text-[#22C55E]'
                                    : 'bg-[#EF4444]/15 text-[#EF4444]'
                                }`}
                              >
                                {trade.side}
                              </span>
                              <span className="text-[#c4c7c8]">{formatPoints(trade.cost, 0)} pts</span>
                            </div>
                            <span className="text-[10px] text-[#8e9192]">{formatTime(trade.at)}</span>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                    {leaderboardEntries.length === 0 ? (
                      <p className="text-xs text-[#c4c7c8] py-8 text-center">No participants ranked yet.</p>
                    ) : (
                      leaderboardEntries.map((p, idx) => (
                        <div
                          key={p.displayName}
                          className="flex justify-between items-center py-2 px-3 rounded-lg bg-[#201f1f]/50 border border-[#27272A] font-['Epilogue'] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#8e9192] w-4">{idx + 1}</span>
                            <span className="text-white truncate max-w-[120px]">{p.displayName}</span>
                          </div>
                          <span className="font-bold text-[#22C55E]">{formatPoints(p.balance, 0)} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
