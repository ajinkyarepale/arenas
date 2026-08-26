'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';

import { SiteSidebar } from '@/components/site-sidebar';
import { roundPhase } from '@/components/arena/round-timer';
import { TradePanel } from '@/components/arena/trade-panel';
import { useArena } from '@/hooks/use-arena';
import { formatPoints } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  {
    ssr: false,
    loading: () => <div className="h-[320px] animate-pulse rounded-xl bg-[#201f1f]" />,
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
    refresh,
  } = useArena(code);

  const [rightTab, setRightTab] = useState<'tape' | 'leaderboard'>('tape');

  const info = snapshot?.arena ?? initialArena;
  const viewer = snapshot?.viewer ?? null;
  const status = arena?.status ?? info.status;

  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const tradingOpen = status === 'LIVE' && phase === 'trading';
  const priceYes = round?.priceYes ?? 0.5;

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

  // Polymarket question title construction
  const questionTitle = `Will ${info.asset.replace('USDT', '')} close UP above the round's open price?`;
  const questionSubtitle = `Polymarket binary market: Buy YES if you predict ${info.asset.replace('USDT', '')} will rise, or NO if it falls. Winning outcome pays 100 points ($1.00) per share at round settlement.`;

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-40">
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
              <Link
                href="/markets"
                className="w-9 h-9 rounded-full border border-[#27272A] flex items-center justify-center text-[#c4c7c8] hover:text-white transition-colors"
                title="Back to Markets"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Page Content Canvas */}
        <div className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6">
          {/* Header Title & Timer Bar (Polymarket Question Style) */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] uppercase tracking-wider mb-2">
                POLYMARKET BINARY OUTCOME
              </div>
              <h1 className="font-['Geist'] text-2xl md:text-3xl font-bold text-white mb-1">
                {info.name}: {questionTitle}
              </h1>
              <p className="font-['Geist'] text-xs text-[#c4c7c8] max-w-2xl leading-relaxed">
                {questionSubtitle}
              </p>
            </div>

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

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Chart & My Positions */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* Candlestick Chart Panel */}
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
                qYes={round?.qYes ?? 100}
                qNo={round?.qNo ?? 100}
                priceYes={priceYes}
                position={position}
                tradingOpen={tradingOpen}
                onFilled={refresh}
              />

              {/* Feed / Leaderboard Tabs */}
              <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col gap-4 font-['Geist'] text-xs">
                <div className="flex border-b border-[#27272A] pb-2 gap-4">
                  <button
                    onClick={() => setRightTab('tape')}
                    className={`font-['Epilogue'] text-xs font-bold transition-colors pb-1 ${
                      rightTab === 'tape'
                        ? 'text-white border-b-2 border-white'
                        : 'text-[#c4c7c8] hover:text-white'
                    }`}
                  >
                    Live Feed
                  </button>
                  <button
                    onClick={() => setRightTab('leaderboard')}
                    className={`font-['Epilogue'] text-xs font-bold transition-colors pb-1 ${
                      rightTab === 'leaderboard'
                        ? 'text-white border-b-2 border-white'
                        : 'text-[#c4c7c8] hover:text-white'
                    }`}
                  >
                    Leaderboard
                  </button>
                </div>

                {rightTab === 'tape' ? (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto font-['Epilogue']">
                    <p className="text-[#c4c7c8] text-center py-4">Waiting for first fill...</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto font-['Epilogue']">
                    {leaderboardEntries.map((p, idx) => (
                      <div
                        key={p.participantId}
                        className="flex justify-between items-center py-2 border-b border-[#27272A]/50 text-xs"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-[#201f1f] text-center text-[#c4c7c8] font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-white font-medium">{p.displayName}</span>
                        </div>
                        <span className="text-white font-bold">{formatPoints(p.balance, 0)} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full mt-auto flex justify-between items-center py-6 px-12 border-t border-[#27272A] bg-[#131313] text-[#c4c7c8] text-xs">
          <p>© 2024 Arenas Markets. All rights reserved.</p>
          <div className="flex gap-6 font-['Epilogue'] text-[11px]">
            <Link href="/guide" className="hover:text-white underline">Legal</Link>
            <Link href="/guide" className="hover:text-white underline">Privacy</Link>
            <Link href="/guide" className="hover:text-white underline">Terms</Link>
            <Link href="/guide" className="hover:text-white underline">Docs</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
