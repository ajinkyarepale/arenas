import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { SiteSidebar } from '@/components/site-sidebar';
import { authOptions, isOrganizer } from '@/lib/auth';
import { getTraderAnalytics } from '@/lib/analytics';
import { formatDateTime, formatPercent, formatPoints, formatSignedPoints } from '@/lib/format';
import { getProfile, getUserPredictions } from '@/lib/profile';

export const metadata: Metadata = { title: 'Profile · Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const [{ stats, arenas }, analytics, predictions] = await Promise.all([
    getProfile(session.user.id),
    getTraderAnalytics(session.user.id),
    getUserPredictions(session.user.id),
  ]);

  const roleTitle = isOrganizer(session.user.role) ? 'ORGANIZER' : 'PRO TRADER';
  const netPnlText = analytics.settledTrades > 0 ? formatSignedPoints(analytics.netPnl, 0) : '0 pts';

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-30">
          <div>
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              USER PROFILE &amp; DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto font-['Epilogue'] text-xs">
            <span className="text-[#c4c7c8]">{session.user.email}</span>
            <Link
              href="/signout"
              className="text-white hover:underline font-bold transition-colors"
            >
              Sign out
            </Link>
          </div>
        </header>

        {/* Canvas Content */}
        <div className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6">
          {/* User Profile Masthead */}
          <section className="bg-[rgba(20,20,20,0.7)] backdrop-blur-xl border border-[#27272A] rounded-xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full border border-[#27272A] bg-[#201f1f] flex items-center justify-center text-3xl font-bold text-white uppercase">
                {session.user.name?.[0] ?? session.user.email?.[0] ?? 'U'}
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-['Geist'] text-2xl font-bold text-white">
                    {session.user.name ?? 'Trader'}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] bg-[#131313] uppercase">
                    {roleTitle}
                  </span>
                </div>
                <p className="font-['Geist'] text-xs text-[#c4c7c8]">{session.user.email}</p>
              </div>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1 w-full md:w-auto">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
                CAREER P/L
              </p>
              <div className="font-['Geist'] text-3xl md:text-4xl font-bold text-[#22C55E] drop-shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                {netPnlText}
              </div>
            </div>
          </section>

          {/* Key Figures Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">RETURN %</p>
              <p className="font-['Epilogue'] text-xl font-bold text-[#22C55E]">
                {analytics.roi !== null ? formatPercent(analytics.roi) : '0%'}
              </p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">PREDICTIONS SETTLED</p>
              <p className="font-['Epilogue'] text-xl font-bold text-white">
                {analytics.settledTrades}
              </p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">WIN RATE</p>
              <p className="font-['Epilogue'] text-xl font-bold text-white">
                {analytics.hitRate !== null ? formatPercent(analytics.hitRate) : '0%'}
              </p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">ARENAS PLAYED</p>
              <p className="font-['Epilogue'] text-xl font-bold text-white">
                {stats.arenasPlayed}
              </p>
            </div>
          </section>

          {/* Real Prediction History Section */}
          <section className="bg-[rgba(20,20,20,0.7)] backdrop-blur-xl border border-[#27272A] rounded-xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Geist'] text-lg font-bold text-white">My Prediction History</h3>
                <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                  Verified history of all predictions submitted by your account.
                </p>
              </div>
              <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
                {predictions.length} Total Predictions
              </span>
            </div>

            {predictions.length === 0 ? (
              <div className="text-center py-10 border border-[#27272A]/50 rounded-lg bg-[#201f1f]/30">
                <p className="text-sm text-[#c4c7c8]">No predictions submitted yet.</p>
                <p className="text-xs text-[#8e9192] mt-1">
                  Join any live or upcoming tournament to lock in your first prediction.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-['Epilogue'] text-xs">
                  <thead>
                    <tr className="border-b border-[#27272A] text-[#c4c7c8]">
                      <th className="pb-3 font-bold uppercase">ARENA</th>
                      <th className="pb-3 font-bold uppercase">PREDICTION</th>
                      <th className="pb-3 font-bold uppercase text-right">STAKE / SHARES</th>
                      <th className="pb-3 font-bold uppercase">DATE & TIME (IST)</th>
                      <th className="pb-3 font-bold uppercase">STATUS</th>
                      <th className="pb-3 font-bold uppercase text-right">RESULT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {predictions.map((p) => {
                      const isWon = p.isCorrect === true;
                      const isLost = p.isCorrect === false;

                      return (
                        <tr key={p.id} className="border-b border-[#27272A]/50 hover:bg-[#201f1f]/30 transition-colors">
                          <td className="py-3 font-['Geist']">
                            <Link href={`/arenas/${p.arenaCode}`} className="font-medium text-white hover:text-[#22C55E] transition-colors">
                              {p.arenaName}
                            </Link>
                            <div className="text-[11px] text-[#c4c7c8] font-mono">
                              Round {p.roundNumber} · {p.arenaCode}
                            </div>
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-2.5 py-0.5 rounded font-bold text-[11px] inline-flex items-center gap-1 ${
                                p.side === 'YES'
                                  ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                                  : 'bg-[#ef4444]/15 text-[#ef4444] border border-[#ef4444]/30'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[12px]">lock</span>
                              {p.side}
                            </span>
                          </td>
                          <td className="py-3 text-right font-medium text-white">
                            <div>{formatPoints(p.cost, 0)} pts</div>
                            <div className="text-[11px] text-[#8e9192]">{p.shares.toFixed(1)} shs</div>
                          </td>
                          <td className="py-3 text-[#c4c7c8]">
                            {formatDateTime(p.predictionTimestamp)}
                          </td>
                          <td className="py-3">
                            {p.resolvedOutcome ? (
                              <span className="px-2 py-0.5 rounded bg-[#201f1f] border border-[#27272A] text-[#c4c7c8] text-[10px] font-bold">
                                Resolved: {p.resolvedOutcome}
                              </span>
                            ) : p.arenaStatus === 'ENDED' ? (
                              <span className="px-2 py-0.5 rounded bg-[#201f1f] border border-[#27272A] text-[#8e9192] text-[10px]">
                                Finished (Awaiting)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold">
                                Active Round
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right font-bold">
                            {isWon ? (
                              <span className="text-[#22C55E]">
                                +{p.payout ? (p.payout - p.cost).toFixed(0) : '—'} pts (Won)
                              </span>
                            ) : isLost ? (
                              <span className="text-[#ef4444]">
                                -{p.cost.toFixed(0)} pts (Lost)
                              </span>
                            ) : (
                              <span className="text-[#c4c7c8] font-normal">Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link
              href="/markets"
              className="bg-white text-[#2f3131] px-6 py-3 rounded-full font-['Epilogue'] text-xs font-bold hover:bg-[#c6c6c7] transition-all shadow"
            >
              Browse Markets
            </Link>
            {isOrganizer(session.user.role) && (
              <Link
                href="/admin"
                className="bg-[#201f1f] text-white border border-[#27272A] px-6 py-3 rounded-full font-['Epilogue'] text-xs font-bold hover:bg-[#2a2a2a] transition-all"
              >
                Organizer Admin Panel
              </Link>
            )}
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
