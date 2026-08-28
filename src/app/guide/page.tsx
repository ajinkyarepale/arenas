import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = {
  title: 'Guide & Technical Docs — Arenas',
  description: 'Technical overview of LMSR pricing, live 5-minute candle resolution, and market rules.',
};

export default function GuidePage() {
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
              DOCUMENTATION &amp; MATH OVERVIEW
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

        {/* Documentation Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1000px] mx-auto w-full flex flex-col gap-8 md:gap-12">
          {/* Header */}
          <section className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#1c1b1b] text-[#22C55E] font-['Epilogue'] text-[11px] font-bold tracking-wider w-fit">
              TECHNICAL GUIDE
            </div>
            <h1 className="font-['Geist'] text-4xl md:text-5xl font-bold text-white tracking-tight">
              Arenas Architecture &amp; LMSR Math
            </h1>
            <p className="font-['Geist'] text-base text-[#c4c7c8] leading-relaxed max-w-2xl">
              Learn how automated market makers compute real-time probabilities, strike price lock-ins, and automated settlement rules for campus trading events.
            </p>
          </section>

          {/* Section 1: LMSR Pricing */}
          <section className="flex flex-col gap-4 border-t border-[#27272A] pt-8">
            <h2 className="font-['Geist'] text-2xl font-bold text-white">1. Logarithmic Market Scoring Rule (LMSR)</h2>
            <p className="text-sm text-[#c4c7c8] leading-relaxed">
              Arenas uses Robin Hanson&apos;s LMSR automated market maker. The cost function C(q) calculates total cost given share quantities q_YES and q_NO with liquidity parameter b:
            </p>

            <div className="p-6 rounded-xl border border-[#27272A] bg-[#201f1f] font-mono text-sm text-[#22C55E] overflow-x-auto">
              C(q) = b * ln( e^(q_YES / b) + e^(q_NO / b) )
            </div>

            <p className="text-sm text-[#c4c7c8] leading-relaxed">
              Instantaneous YES probability p_YES is the partial derivative of cost with respect to YES shares:
            </p>

            <div className="p-6 rounded-xl border border-[#27272A] bg-[#201f1f] font-mono text-sm text-white overflow-x-auto">
              p_YES = e^(q_YES / b) / ( e^(q_YES / b) + e^(q_NO / b) )
            </div>
          </section>

          {/* Section 2: 5-Minute Candle Resolution */}
          <section className="flex flex-col gap-4 border-t border-[#27272A] pt-8">
            <h2 className="font-['Geist'] text-2xl font-bold text-white">2. Candle Strike &amp; Settlement Rules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2">
                <span className="font-['Epilogue'] text-xs font-bold text-[#22C55E]">STRIKE PRICE LOCK</span>
                <h3 className="font-['Geist'] text-lg font-semibold text-white">Bell Strike Price</h3>
                <p className="text-xs text-[#c4c7c8] leading-relaxed">
                  At second 00:00 of each round, spot price is locked as strike price S_0. All trades run relative to S_0.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2">
                <span className="font-['Epilogue'] text-xs font-bold text-[#EF4444]">SETTLEMENT</span>
                <h3 className="font-['Geist'] text-lg font-semibold text-white">Green vs Red Candle</h3>
                <p className="text-xs text-[#c4c7c8] leading-relaxed">
                  If closing spot price S_final &ge; S_0, YES resolves to 100 points per share. If S_final &lt; S_0, NO resolves to 100 points.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Host Control */}
          <section className="flex flex-col gap-4 border-t border-[#27272A] pt-8 mb-12">
            <h2 className="font-['Geist'] text-2xl font-bold text-white">3. Organizer Safety &amp; Control</h2>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                <span className="text-sm text-[#c4c7c8]">Manual round pause &amp; safety lock controls</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                <span className="text-sm text-[#c4c7c8]">Configurable starting points per participant</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                <span className="text-sm text-[#c4c7c8]">Dedicated live projector leaderboards for event halls</span>
              </li>
            </ul>
          </section>
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
