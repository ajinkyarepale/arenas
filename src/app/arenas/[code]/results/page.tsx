import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteSidebar } from '@/components/site-sidebar';
import { auth } from '@/lib/auth';
import { formatPoints } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Results · Arenas' };
export const dynamic = 'force-dynamic';

export default async function ArenaResultsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const session = await auth();

  const arena = await prisma.event.findFirst({
    where: {
      OR: [
        { code: code.toUpperCase() },
        { code: `AR-${code.toUpperCase().replace(/^AR-/, '')}` },
        { code: code.toUpperCase().replace(/^AR-/, '') },
      ],
    },
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
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <Link
              href={`/arenas/${arena.code}`}
              className="text-[#c4c7c8] hover:text-white flex items-center gap-1 font-['Epilogue'] text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Arena</span>
            </Link>
            <div className="h-4 w-px bg-[#27272A]" />
            <span className="font-['Epilogue'] text-xs font-bold text-white tracking-wider uppercase">
              TOURNAMENT RESULTS · {arena.code}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/arenas/${arena.code}/screen`}
              target="_blank"
              className="px-3 py-1.5 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-white transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px] text-[#22C55E]">desktop_windows</span>
              <span>Big Screen</span>
            </Link>
          </div>
        </header>

        {/* Results Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#201f1f] text-[#22C55E] font-['Epilogue'] text-[11px] font-bold tracking-wider uppercase">
              OFFICIAL RESULTS
            </div>
            <h1 className="font-['Geist'] text-3xl md:text-5xl font-bold text-white tracking-tight">
              {arena.name} Wrap-Up
            </h1>
            <p className="font-['Geist'] text-sm text-[#c4c7c8] leading-relaxed">
              After {arena.totalRounds} rounds of live forecasting and automated LMSR pricing, the final tournament rankings are set.
            </p>
            <div className="mt-2">
              <a
                href={`/api/admin/arenas/${arena.id}/export`}
                download
                className="px-4 py-2 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px] text-[#22C55E]">download</span>
                <span>Export Standings (CSV)</span>
              </a>
            </div>
          </div>

          {/* Podium & Personal Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Winners Podium (Left 8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-end bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6">
              <h3 className="font-['Geist'] text-xl font-bold text-white mb-6">Top Forecasters</h3>
              <div className="grid grid-cols-3 gap-3 md:gap-4 items-end h-[280px]">
                {/* 2nd Place */}
                {top3[1] ? (
                  <div className="rounded-xl p-4 flex flex-col items-center justify-end h-[75%] border border-[#27272A] bg-[#141414] relative text-center">
                    <span className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase mb-1">
                      2nd · Silver
                    </span>
                    <span className="font-['Geist'] text-sm font-bold text-white truncate w-full mb-1">
                      {top3[1].user.name}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#c4c7c8]">
                      {formatPoints(top3[1].balance, 0)} pts
                    </span>
                  </div>
                ) : <div />}

                {/* 1st Place Champion */}
                {top3[0] ? (
                  <div className="rounded-t-2xl rounded-b-xl p-5 flex flex-col items-center justify-end h-[100%] border border-[#22C55E]/40 bg-[#22C55E]/10 backdrop-blur-xl relative shadow-lg text-center">
                    <span className="font-['Epilogue'] text-[11px] font-bold text-[#22C55E] uppercase tracking-widest mb-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">military_tech</span>
                      <span>Champion</span>
                    </span>
                    <span className="font-['Geist'] text-base font-bold text-white truncate w-full mb-1">
                      {top3[0].user.name}
                    </span>
                    <span className="font-mono text-xl font-bold text-[#22C55E]">
                      {formatPoints(top3[0].balance, 0)} pts
                    </span>
                  </div>
                ) : <div />}

                {/* 3rd Place */}
                {top3[2] ? (
                  <div className="rounded-xl p-4 flex flex-col items-center justify-end h-[60%] border border-[#27272A] bg-[#141414] relative text-center">
                    <span className="font-['Epilogue'] text-[10px] font-bold text-[#EAB308] uppercase mb-1">
                      3rd · Bronze
                    </span>
                    <span className="font-['Geist'] text-sm font-bold text-white truncate w-full mb-1">
                      {top3[2].user.name}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#c4c7c8]">
                      {formatPoints(top3[2].balance, 0)} pts
                    </span>
                  </div>
                ) : <div />}
              </div>
            </div>

            {/* Personal Summary Card (Right 4 cols) */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-['Epilogue'] text-xs uppercase font-bold text-[#c4c7c8]">Your Placement</span>
                  <span className="px-2.5 py-1 bg-[#201f1f] rounded-full font-mono text-[10px] font-bold text-white border border-[#27272A]">
                    {myRank ? `#${myRank} of ${participants.length}` : 'Spectator'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="font-['Geist'] text-4xl font-bold text-white">
                    {myRank ? `#${myRank}` : '—'}
                  </span>
                  <span className="text-sm text-[#c4c7c8]">Rank</span>
                </div>
              </div>

              <div className="space-y-3 text-xs font-['Epilogue'] border-t border-[#27272A] pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[#c4c7c8]">Final Balance</span>
                  <span className="font-mono font-bold text-[#22C55E]">
                    {myParticipant ? `${formatPoints(myParticipant.balance, 0)} pts` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#c4c7c8]">Starting Balance</span>
                  <span className="font-mono text-white">
                    {formatPoints(arena.startingBalance, 0)} pts
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#c4c7c8]">Total Rounds</span>
                  <span className="font-mono text-white">{arena.totalRounds}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Standings Table */}
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-['Geist'] text-xl font-bold text-white">Final Standings</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-['Epilogue'] text-xs">
                <thead>
                  <tr className="border-b border-[#27272A] text-[#c4c7c8]">
                    <th className="pb-3 font-bold uppercase w-16">RANK</th>
                    <th className="pb-3 font-bold uppercase">TRADER</th>
                    <th className="pb-3 font-bold uppercase text-right">FINAL BALANCE</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, idx) => (
                    <tr key={p.id} className="border-b border-[#27272A]/40 hover:bg-[#201f1f]/30 transition-colors">
                      <td className="py-3 font-mono font-bold text-[#c4c7c8]">
                        #{idx + 1}
                      </td>
                      <td className="py-3 font-medium text-white">
                        {p.user.name || p.user.email}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-[#22C55E]">
                        {formatPoints(p.balance, 0)} pts
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
