import type { Metadata } from 'next';
import Link from 'next/link';

import { LiveArenasTicker } from '@/components/live-arenas-ticker';
import { SiteNavAuth } from '@/components/site-nav-auth';
import { BeamsBackground, CardStack, SlideTextButton, SwitchButton } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Arenas - Campus Prediction Market',
  description:
    'Experience the intensity of live 5-minute candle trading in a zero-risk campus environment.',
};

export default function LandingPage() {
  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex flex-col antialiased text-[#e5e2e1] font-['Geist']">
      {/* TopNavBar */}
      <nav className="bg-transparent backdrop-blur-sm border-b border-white/[0.08] sticky top-0 flex justify-between items-center h-16 px-6 z-50">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-['Geist'] text-2xl font-black text-white hover:text-white transition-colors">
            Arenas
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-[#c4c7c8]">
            <Link href="/markets" className="hover:text-white transition-colors">
              Explore Markets
            </Link>
            <Link href="/host" className="hover:text-white transition-colors">
              Host on Campus
            </Link>
          </div>
        </div>
        <SiteNavAuth />
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-6 flex flex-col items-center text-center overflow-hidden min-h-[600px] justify-center">
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#1c1b1b]/80 backdrop-blur-md text-[#22C55E] font-['Epilogue'] text-[11px] font-bold tracking-wider shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            LIVE ROOMS · NOT HOMEWORK
          </div>

          <h1 className="font-['Geist'] text-4xl sm:text-6xl text-white font-bold tracking-tight leading-tight max-w-4xl uppercase">
            A TRADING FLOOR IN AN AFTERNOON
          </h1>

          <p className="font-['Geist'] text-base sm:text-lg text-[#c4c7c8] max-w-2xl leading-relaxed mt-1">
            Experience the intensity of live 5-minute candle trading in a zero-risk campus environment. Compete, analyze, and predict real-time market movements.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-6 items-center w-full sm:w-auto">
            <SlideTextButton
              href="/signup"
              text="Get started"
              hoverText="Enter Arena →"
              variant="default"
            />
            <SlideTextButton
              href="/markets"
              text="Explore Markets"
              hoverText="See Live Events ↗"
              variant="ghost"
            />
          </div>

          <p className="font-['Epilogue'] text-[11px] font-bold text-[#8e9192] tracking-wider mt-4 uppercase">
            FREE · VIRTUAL POINTS ONLY · NO DEPOSITS
          </p>
        </div>
      </section>

      {/* Live Marquee Ticker */}
      <LiveArenasTicker />

      {/* Interactive Expandable Card Stack Section */}
      <section className="py-16 px-4 sm:px-6 w-full max-w-[1280px] mx-auto flex flex-col items-center gap-6">
        <div className="text-center max-w-xl mx-auto flex flex-col items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] text-[#c4c7c8] font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider">
            PLATFORM ARCHITECTURE
          </span>
          <h2 className="font-['Geist'] text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Engineered for Campus Tournaments
          </h2>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            Click the interactive card stack below to inspect the real-time LMSR mechanics, automated Binance TWAP settlement, and projector display feeds.
          </p>
        </div>

        <div className="w-full mt-4">
          <CardStack />
        </div>
      </section>

      {/* Main Content Canvas */}
      <main className="flex-grow w-full max-w-[1280px] mx-auto px-6 py-12 flex flex-col gap-16">
        {/* How a Round Works */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Geist'] text-2xl font-medium text-white">How a Round Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 01 */}
            <div className="glass-panel p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2 hover:border-[#444748] transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-['Epilogue'] text-xs text-[#c4c7c8] group-hover:text-white transition-colors">
                  Step 01
                </span>
                <span className="material-symbols-outlined text-[#8e9192]">notifications_active</span>
              </div>
              <h3 className="font-['Epilogue'] text-sm font-medium text-white">The bell</h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                The strike price is set and the 5-minute countdown begins.
              </p>
            </div>

            {/* Step 02 */}
            <div className="glass-panel p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2 hover:border-[#444748] transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-['Epilogue'] text-xs text-[#c4c7c8] group-hover:text-white transition-colors">
                  Step 02
                </span>
                <span className="material-symbols-outlined text-[#8e9192]">sync_alt</span>
              </div>
              <h3 className="font-['Epilogue'] text-sm font-medium text-white">The room trades</h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                Participants buy YES or NO shares based on market direction.
              </p>
            </div>

            {/* Step 03 */}
            <div className="glass-panel p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2 hover:border-[#444748] transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-['Epilogue'] text-xs text-[#c4c7c8] group-hover:text-white transition-colors">
                  Step 03
                </span>
                <span className="material-symbols-outlined text-[#8e9192]">lock</span>
              </div>
              <h3 className="font-['Epilogue'] text-sm font-medium text-white">Lock</h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                Trading freezes shortly before the candle closes. No more entries.
              </p>
            </div>

            {/* Step 04 */}
            <div className="glass-panel p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col gap-2 hover:border-[#444748] transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-['Epilogue'] text-xs text-[#c4c7c8] group-hover:text-white transition-colors">
                  Step 04
                </span>
                <span className="material-symbols-outlined text-[#8e9192]">account_balance</span>
              </div>
              <h3 className="font-['Epilogue'] text-sm font-medium text-white">Settle</h3>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                Payouts are distributed and the live leaderboard updates instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Audience Panels (Bento Grid) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* For Participants */}
          <div className="glass-panel p-8 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col justify-between min-h-[380px]">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 border border-[#27272A] rounded-full px-3 py-1 w-fit bg-[#1c1b1b]">
                <span className="material-symbols-outlined text-white text-[16px]">person</span>
                <span className="font-['Epilogue'] text-[11px] font-bold text-white tracking-wider">
                  FOR PARTICIPANTS
                </span>
              </div>
              <h3 className="font-['Geist'] text-2xl font-medium text-white mt-2">Built for Speed</h3>
              <ul className="flex flex-col gap-3 mt-2">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Mobile-first 2-button UI (YES / NO)</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Intuitive stake slider for fast execution</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Live probability engine &amp; tracking</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#22C55E] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Instant podium rankings</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/markets"
                className="inline-block px-6 py-2.5 rounded-full border border-[#27272A] bg-transparent text-white font-['Epilogue'] text-sm hover:bg-[#201f1f] transition-colors"
              >
                Join Live Arena
              </Link>
            </div>
          </div>

          {/* For Organizers */}
          <div className="glass-panel p-8 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] flex flex-col justify-between min-h-[380px]">
            <div className="flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 border border-[#27272A] rounded-full px-3 py-1 w-fit bg-[#1c1b1b]">
                <span className="material-symbols-outlined text-white text-[16px]">admin_panel_settings</span>
                <span className="font-['Epilogue'] text-[11px] font-bold text-white tracking-wider">
                  FOR ORGANIZERS
                </span>
              </div>
              <h3 className="font-['Geist'] text-2xl font-medium text-white mt-2">Absolute Control</h3>
              <ul className="flex flex-col gap-3 mt-2">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8e9192] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">1-minute event setup &amp; configuration</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8e9192] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Secure join code gating for campus rooms</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8e9192] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">Dedicated 4K projector view for auditoriums</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#8e9192] text-[18px]">check_circle</span>
                  <span className="font-['Geist'] text-sm text-[#c4c7c8]">1-Click CSV standings &amp; prize export</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/host"
                className="inline-block px-6 py-2.5 rounded-full bg-white text-[#2f3131] font-['Epilogue'] text-sm font-semibold hover:bg-[#c6c6c7] transition-colors"
              >
                Host Tournament
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Banner */}
      <div className="w-full border-t border-[#27272A] bg-[#1a1a1c]/80 backdrop-blur-xl py-10 px-6 mt-auto text-center flex flex-col items-center gap-4">
        <h2 className="font-['Geist'] text-2xl sm:text-3xl font-medium text-white max-w-xl">
          Anyone can host. Every arena is independent.
        </h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <SlideTextButton
            href="/admin/arenas/new"
            text="Launch Arena"
            hoverText="Create Tournament +"
            variant="default"
          />
          <SlideTextButton
            href="/host"
            text="Apply to Host"
            hoverText="Campus Access ↗"
            variant="ghost"
          />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#131313]/90 backdrop-blur-xl w-full border-t border-[#27272A] flex flex-col sm:flex-row justify-between items-center py-6 px-6 gap-4">
        <span className="font-['Epilogue'] text-xs text-[#c4c7c8]">
          © 2026 Arenas Platform. All rights reserved.
        </span>
        <div className="flex items-center gap-6 text-xs text-[#c4c7c8]">
          <Link href="/markets" className="hover:text-white transition-colors">Explore</Link>
          <Link href="/host" className="hover:text-white transition-colors">Host</Link>
          <SwitchButton size="sm" showLabel={false} />
        </div>
      </footer>
    </BeamsBackground>
  );
}
