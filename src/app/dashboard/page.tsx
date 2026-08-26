import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { SiteSidebar } from '@/components/site-sidebar';
import { authOptions, isOrganizer } from '@/lib/auth';
import { getTraderAnalytics } from '@/lib/analytics';
import { formatPercent, formatSignedPoints } from '@/lib/format';
import { getProfile } from '@/lib/profile';

export const metadata: Metadata = { title: 'Profile · Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const [{ stats, arenas }, analytics] = await Promise.all([
    getProfile(session.user.id),
    getTraderAnalytics(session.user.id),
  ]);

  const roleTitle = isOrganizer(session.user.role) ? 'ORGANIZER' : 'PRO TRADER';
  const netPnlText = analytics.settledTrades > 0 ? formatSignedPoints(analytics.netPnl, 0) : '0 pts';

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-40">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
          </div>
          <div className="hidden md:block">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              USER PROFILE & DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto font-['Epilogue'] text-xs">
            <span className="text-[#c4c7c8]">{session.user.email}</span>
            <Link
              href="/api/auth/signout"
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
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">TRADES SETTLED</p>
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

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link
              href="/markets"
              className="bg-white text-[#2f3131] px-6 py-3 rounded-full font-['Epilogue'] text-xs font-bold hover:bg-[#c6c6c7] transition-all"
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
