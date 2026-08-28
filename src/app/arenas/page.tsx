import type { Metadata } from 'next';
import Link from 'next/link';

import { ArenaDirectory } from '@/components/arena-directory';
import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = { title: 'Arenas' };
export const dynamic = 'force-dynamic';

export default function ArenasPage() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div className="flex items-center gap-2">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              LIVE ARENAS
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

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          <section className="flex flex-col gap-2">
            <h1 className="font-['Geist'] text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Arena Catalog
            </h1>
          </section>

          {/* Directory Grid */}
          <ArenaDirectory showJoinActions />
        </main>
      </div>
    </div>
  );
}
