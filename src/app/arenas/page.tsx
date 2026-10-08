import type { Metadata } from 'next';

import { AppShell, AppContent } from '@/components/app-shell';
import { ArenaDirectory } from '@/components/arena-directory';
import { SiteNavAuth } from '@/components/site-nav-auth';
import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = { title: 'Arenas' };
export const dynamic = 'force-dynamic';

export default function ArenasPage() {
  return (
    <div className="bg-[#000000] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <AppShell>
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex top-0 sticky bg-[#000000]/80 border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div className="flex items-center gap-2">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              LIVE ARENAS
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <SiteNavAuth />
          </div>
        </header>

        {/* Page Content */}
        <AppContent>
          <section className="flex flex-col gap-2">
            <h1 className="font-['Geist'] text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Arena Catalog
            </h1>
          </section>

          {/* Directory Grid */}
          <ArenaDirectory showJoinActions />
        </AppContent>
      </AppShell>
    </div>
  );
}
