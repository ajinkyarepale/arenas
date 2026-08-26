import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { SiteShell } from '@/components/site-shell';
import { auth } from '@/lib/auth';
import { formatPoints } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Results' };
export const dynamic = 'force-dynamic';

export default async function ArenaResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  const arena = await prisma.event.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { balance: 'desc' },
      },
      rounds: {
        orderBy: { roundNumber: 'asc' },
      },
    },
  });

  if (!arena) notFound();

  const participants = arena.participants;
  const top3 = participants.slice(0, 3);
  const userId = session?.user?.id;
  const myParticipant = userId
    ? participants.find((p) => p.userId === userId)
    : null;
  const myRank = userId && myParticipant
    ? participants.findIndex((p) => p.userId === userId) + 1
    : null;

  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-12 w-full max-w-6xl">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="font-mono text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3 block">
            Official Results · {arena.code}
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-zinc-100 mb-4">
            {arena.name} Wrap-Up
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The dust has settled. After {arena.totalRounds} rounds of intense forecasting and market making, the final hierarchy is established.
          </p>
        </div>

        {/* Podium & Personal Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Winners Podium (Left 8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-end">
            <h3 className="font-display text-xl font-bold text-zinc-100 mb-6">Top Forecasters</h3>
            <div className="grid grid-cols-3 gap-3 md:gap-4 items-end h-[320px]">
              {/* 2nd Place */}
              {top3[1] ? (
                <div className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-end h-[75%] border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative">
                  <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase mb-1">Silver</span>
                  <span className="font-display text-sm font-bold text-zinc-100 truncate w-full text-center mb-2">
                    {top3[1].user.name}
                  </span>
                  <span className="font-mono text-base font-bold text-zinc-200">
                    {formatPoints(top3[1].balance, 0)} pts
                  </span>
                </div>
              ) : <div />}

              {/* 1st Place Champion */}
              {top3[0] ? (
                <div className="glass-panel rounded-t-3xl rounded-b-2xl p-6 flex flex-col items-center justify-end h-[100%] border border-zinc-700 bg-zinc-900/90 backdrop-blur-xl relative shadow-[0_0_40px_rgba(255,255,255,0.08)]">
                  <span className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                    🏆 Champion
                  </span>
                  <span className="font-display text-lg font-bold text-zinc-100 truncate w-full text-center mb-2">
                    {top3[0].user.name}
                  </span>
                  <span className="font-mono text-xl font-bold text-emerald-400">
                    {formatPoints(top3[0].balance, 0)} pts
                  </span>
                </div>
              ) : <div />}

              {/* 3rd Place */}
              {top3[2] ? (
                <div className="glass-panel rounded-2xl p-5 flex flex-col items-center justify-end h-[60%] border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl relative">
                  <span className="font-mono text-[10px] font-bold text-amber-600 uppercase mb-1">Bronze</span>
                  <span className="font-display text-sm font-bold text-zinc-100 truncate w-full text-center mb-2">
                    {top3[2].user.name}
                  </span>
                  <span className="font-mono text-base font-bold text-zinc-200">
                    {formatPoints(top3[2].balance, 0)} pts
                  </span>
                </div>
              ) : <div />}
            </div>
          </div>

          {/* Personal Summary Card (Right 4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-end">
            <div className="glass-panel border border-zinc-800 rounded-2xl p-6 flex-1 flex flex-col justify-between bg-zinc-900/60 backdrop-blur-xl">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-mono text-xs uppercase font-bold text-zinc-400">Final Placement</span>
                  <span className="px-2.5 py-1 bg-zinc-800 rounded-full font-mono text-[10px] font-bold text-zinc-200 border border-zinc-700">
                    {myRank ? `#${myRank} of ${participants.length}` : 'Participant'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="font-display text-4xl font-bold text-zinc-100">
                    {myRank ? `#${myRank}` : '—'}
                  </span>
                  <span className="text-sm text-zinc-400">Rank</span>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Final Balance</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {myParticipant ? `${formatPoints(myParticipant.balance, 0)} pts` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Starting Balance</span>
                  <span className="font-mono text-zinc-200">
                    {formatPoints(arena.startingBalance, 0)} pts
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                  <span className="text-zinc-400">Total Rounds</span>
                  <span className="font-mono text-zinc-200">{arena.totalRounds}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Standings Table */}
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-2xl font-bold text-zinc-100">Final Standings</h3>
          <div className="glass-panel border border-zinc-800 rounded-2xl overflow-x-auto bg-zinc-900/60">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-mono text-xs uppercase">
                  <th className="py-4 px-6 w-16">Rank</th>
                  <th className="py-4 px-6">Trader</th>
                  <th className="py-4 px-6 text-right">Final Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-zinc-800/60">
                {participants.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="py-4 px-6 font-mono text-xs font-bold text-zinc-400">
                      {String(idx + 1).padStart(2, '0')}
                    </td>
                    <td className="py-4 px-6 font-semibold text-zinc-100">
                      {p.user.name}
                    </td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                      {formatPoints(p.balance, 0)} pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
