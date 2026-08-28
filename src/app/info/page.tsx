import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = {
  title: 'About — Arenas',
  description: 'Learn about Arenas, the campus prediction market engine.',
};

export default function InfoPage() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0 pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div>
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              ABOUT ARENAS
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/signin" className="text-sm font-semibold text-[#c4c7c8] hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-full bg-[#22C55E] text-[#131313] font-bold text-xs hover:bg-emerald-400 transition-colors shadow">
              Sign up
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1000px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          <section className="flex flex-col gap-3">
            <h1 className="font-['Geist'] text-4xl md:text-5xl font-bold text-white tracking-tight">
              About Arenas
            </h1>
            <p className="font-['Geist'] text-base text-[#c4c7c8] leading-relaxed max-w-2xl">
              Arenas is an open-source campus prediction market engine designed for student finance clubs, hackathons, and quantitative trading societies.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div className="p-6 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2">
              <h3 className="font-['Geist'] text-xl font-medium text-white mb-1">
                Automated Market Maker (LMSR)
              </h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8] leading-relaxed">
                Powered by Robin Hanson&apos;s Logarithmic Market Scoring Rule, guaranteeing continuous liquidity and instant order execution for binary prediction markets.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2">
              <h3 className="font-['Geist'] text-xl font-medium text-white mb-1">
                Auditorium Projector Mode
              </h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8] leading-relaxed">
                Dedicated 16:9 big-screen presentation interface built for auditorium projectors, featuring real-time odds gauges, countdown timers, and live leaderboard rankings.
              </p>
            </div>
          </div>
        </main>

        <footer className="bg-[#131313] w-full border-t border-[#27272A] flex flex-col sm:flex-row justify-between items-center py-6 px-12 gap-4 mt-auto">
          <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
            © 2024 Arenas Markets. All rights reserved.
          </span>
          <div className="flex gap-6 text-xs text-[#c4c7c8]">
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Legal</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Privacy</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Terms</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Docs</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
