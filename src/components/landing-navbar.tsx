'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SiteNavAuth } from '@/components/site-nav-auth';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-transparent backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-50 px-4 sm:px-6">
      <div className="flex justify-between items-center h-16">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-['Geist'] text-2xl font-black text-white hover:text-white transition-colors">
            Arenas
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#c4c7c8]">
            <Link href="/markets" className="hover:text-white transition-colors">
              Explore Markets
            </Link>
            <Link href="/host" className="hover:text-white transition-colors">
              Host on Campus
            </Link>
            <Link href="/guide" className="hover:text-white transition-colors">
              Guide
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SiteNavAuth />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] border border-transparent hover:border-[#27272A] transition-colors flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden py-4 border-t border-[#27272A] flex flex-col gap-2 font-['Epilogue'] text-sm bg-[#131313]/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-150 rounded-b-xl px-2">
          <Link
            href="/markets"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg hover:bg-[#201f1f] text-[#e5e2e1] font-semibold flex items-center justify-between"
          >
            <span>Explore Markets</span>
            <span className="material-symbols-outlined text-sm text-[#8e9192]">chevron_right</span>
          </Link>
          <Link
            href="/host"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg hover:bg-[#201f1f] text-[#e5e2e1] font-semibold flex items-center justify-between"
          >
            <span>Host on Campus</span>
            <span className="material-symbols-outlined text-sm text-[#8e9192]">chevron_right</span>
          </Link>
          <Link
            href="/guide"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg hover:bg-[#201f1f] text-[#e5e2e1] font-semibold flex items-center justify-between"
          >
            <span>Platform Guide</span>
            <span className="material-symbols-outlined text-sm text-[#8e9192]">chevron_right</span>
          </Link>
          <Link
            href="/info"
            onClick={() => setMobileMenuOpen(false)}
            className="px-3 py-2.5 rounded-lg hover:bg-[#201f1f] text-[#e5e2e1] font-semibold flex items-center justify-between"
          >
            <span>About Arenas</span>
            <span className="material-symbols-outlined text-sm text-[#8e9192]">chevron_right</span>
          </Link>
        </div>
      )}
    </nav>
  );
}
