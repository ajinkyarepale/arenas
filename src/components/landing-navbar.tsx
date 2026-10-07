'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { SiteNavAuth } from '@/components/site-nav-auth';

export function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session } = useSession();
  const isLoggedIn = Boolean(session?.user);

  // Close mobile menu if user logs out
  useEffect(() => {
    if (!isLoggedIn) {
      setMobileMenuOpen(false);
    }
  }, [isLoggedIn]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen && isLoggedIn) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, isLoggedIn]);

  return (
    <>
      <nav className="bg-transparent backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-40 px-4 sm:px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-['Geist'] text-2xl font-black text-white hover:text-white transition-colors">
              Arenas
            </Link>

            {/* Desktop Navigation Links — Only visible AFTER signing in */}
            {isLoggedIn && (
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
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SiteNavAuth />

            {/* Mobile Hamburger Menu — Only visible AFTER signing in */}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] border border-transparent hover:border-[#27272A] transition-colors flex items-center justify-center"
                aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              >
                <span className="material-symbols-outlined text-2xl">
                  {mobileMenuOpen ? 'close' : 'menu'}
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (Only for logged-in users) */}
      {isLoggedIn && mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity duration-300"
            aria-hidden="true"
          />

          <aside
            className={`md:hidden fixed top-0 bottom-0 left-0 h-full w-72 bg-[#141414] border-r border-[#27272A] backdrop-blur-xl flex flex-col py-6 px-5 z-50 transition-transform duration-300 ease-in-out shadow-2xl ${
              mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {/* Drawer Brand Header */}
            <div className="flex items-center justify-between pb-5 border-b border-[#27272A]">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2"
              >
                <span className="font-['Geist'] text-2xl font-bold text-white tracking-tight">Arenas</span>
                <span className="text-[10px] font-['Epilogue'] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-1.5 py-0.5 rounded uppercase">
                  Market
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-colors"
                aria-label="Close Sidebar"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Navigation Links with Icons */}
            <nav className="flex flex-col gap-2 mt-6 flex-1 font-['Epilogue'] text-sm">
              <Link
                href="/markets"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">show_chart</span>
                <span>Explore Markets</span>
              </Link>
              <Link
                href="/arenas"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">sensors</span>
                <span>Live Tournaments</span>
              </Link>
              <Link
                href="/host"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">campaign</span>
                <span>Host on Campus</span>
              </Link>
              <Link
                href="/guide"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">menu_book</span>
                <span>Platform Guide</span>
              </Link>
              <Link
                href="/info"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">info</span>
                <span>About Arenas</span>
              </Link>
            </nav>

            {/* Profile & Sign out at Bottom */}
            <div className="pt-4 border-t border-[#27272A] flex flex-col gap-2.5 font-['Epilogue']">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 p-2 rounded-xl bg-[#201f1f] border border-[#27272A] text-white hover:border-[#3f3f46] transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-[#2a2a2a] border border-[#3f3f46] flex items-center justify-center text-xs font-bold uppercase text-white">
                  {session?.user?.name?.[0] ?? session?.user?.email?.[0] ?? 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold truncate">{session?.user?.name ?? 'Trader'}</span>
                  <span className="text-[10px] text-[#8e9192] truncate">{session?.user?.email}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  void signOut({ callbackUrl: '/' });
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-[#27272A] text-xs font-bold text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Sign out</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
