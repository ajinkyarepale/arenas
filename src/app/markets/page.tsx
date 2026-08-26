import type { Metadata } from 'next';
import Link from 'next/link';

import { ArenaDirectory } from '@/components/arena-directory';
import { SiteSidebar } from '@/components/site-sidebar';

export const metadata: Metadata = {
  title: 'Arena Catalog — Arenas',
  description: 'Explore live, upcoming, and finished prediction market arenas across colleges.',
};

export default function MarketsPage() {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar (Shared Component matching screen.png) */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="docked full-width top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl flex justify-between items-center h-16 px-6 z-40">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
          </div>
          <div className="hidden md:block" />
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
        <main className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h1 className="font-['Geist'] text-3xl md:text-4xl font-semibold text-white tracking-tight">
              Arena Catalog
            </h1>
          </section>

          {/* Directory Grid Component */}
          <ArenaDirectory />
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
