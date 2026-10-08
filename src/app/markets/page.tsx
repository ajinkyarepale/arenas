import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell, AppContent } from '@/components/app-shell';
import { ArenaDirectory } from '@/components/arena-directory';
import { SiteNavAuth } from '@/components/site-nav-auth';
import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = {
  title: 'Markets',
  description: 'Explore live, upcoming, and finished prediction market arenas across colleges.',
};

export default function MarketsPage() {
  return (
    <div className="bg-[#000000] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar (Responsive Drawer) */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <AppShell>
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex top-0 sticky bg-[#000000]/80 border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div className="flex items-center gap-2">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              MARKETS DIRECTORY
            </span>
          </div>
          <div className="ml-auto">
            <SiteNavAuth />
          </div>
        </header>

        {/* Page Content */}
        <AppContent>
          <section className="flex flex-col gap-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-wider uppercase w-fit">
              LIVE MARKETS
            </div>
            <h1 className="font-['Geist'] text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Arena Catalog
            </h1>
            <p className="font-['Geist'] text-xs sm:text-sm text-[#c4c7c8]">
              Browse live active rounds, join upcoming tournaments, or view completed match resolutions.
            </p>
          </section>

          {/* Directory Grid Component */}
          <ArenaDirectory />
        </AppContent>

        <footer className="bg-[#000000] w-full border-t border-[#27272A] flex flex-col sm:flex-row justify-between items-center py-6 px-6 md:px-12 gap-4 mt-auto">
          <span className="font-['Epilogue'] text-xs text-[#c4c7c8] text-center sm:text-left">
            © 2024 Arenas Markets. All rights reserved.
          </span>
          <div className="flex flex-wrap justify-center gap-6 text-xs text-[#c4c7c8]">
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Legal</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Privacy</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Terms</Link>
            <Link href="/guide" className="hover:text-white hover:underline transition-colors">Docs</Link>
          </div>
        </footer>
      </AppShell>
    </div>
  );
}
