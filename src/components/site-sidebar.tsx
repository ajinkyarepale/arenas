'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { SwitchButton } from '@/components/ui';

import { useSidebar } from '@/context/sidebar-context';
import { cx } from '@/lib/format';

export function SiteSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const isOrganizer =
    session?.user?.role === 'ORGANIZER' || session?.user?.role === 'SUPERADMIN';
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  const navItems = [
    { href: '/markets', label: 'Markets', icon: 'show_chart' },
    { href: '/arenas', label: 'Live', icon: 'sensors' },
    { href: '/analytics', label: 'Analytics', icon: 'analytics' },
    { href: '/guide', label: 'Guide', icon: 'menu_book' },
    { href: '/info', label: 'About', icon: 'info' },
    { href: '/admin', label: 'Admin Panel', icon: 'admin_panel_settings' },
    ...(isSuperAdmin ? [{ href: '/admin/organizers', label: 'Approvals', icon: 'verified_user' }] : []),
  ];

  return (
    <>
      {/* Mobile Top Navigation Header Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#000000]/95 border-b border-[#27272A] backdrop-blur-xl z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-['Geist'] text-xl font-bold text-white tracking-tight">Arenas</span>
          <span className="text-[10px] font-['Epilogue'] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full uppercase">
            Market
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <SwitchButton size="sm" showLabel={false} />
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] border border-transparent hover:border-[#27272A] transition-colors flex items-center justify-center"
            aria-label={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          >
            <span className="material-symbols-outlined text-2xl">
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Drawer (Responsive for Mobile & Desktop) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 h-full bg-[#000000] md:bg-[#000000]/95 border-r border-[#27272A] backdrop-blur-xl flex flex-col py-6 z-50 transition-all duration-300 ease-in-out ${
          mobileOpen
            ? 'translate-x-0 w-72 shadow-2xl px-4'
            : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16 md:px-2' : 'md:w-64 md:px-4'}`}
      >
        {/* Brand Header */}
        <div className={cx("flex items-center mb-6", collapsed ? "justify-center px-0" : "justify-between px-2")}>
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`flex flex-col gap-0.5 ${collapsed ? 'md:hidden' : 'flex'}`}
          >
            <div className="flex items-center gap-2">
              <h1 className="font-['Geist'] text-2xl font-bold text-white tracking-tight">Arenas</h1>
              <span className="text-[10px] font-['Epilogue'] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-1.5 py-0.5 rounded uppercase">
                v1.0
              </span>
            </div>
            <p className="font-['Geist'] text-xs text-[#c4c7c8]">Campus Prediction Market</p>
          </Link>

          {/* Close button on mobile, Collapse button on desktop */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-[#c4c7c8] hover:text-white"
            aria-label="Close Sidebar"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden md:flex p-1.5 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] border border-transparent hover:border-[#27272A] transition-colors items-center justify-center"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <span className="material-symbols-outlined text-sm">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={cx(
                  'flex items-center rounded-xl font-["Epilogue"] text-sm transition-all',
                  collapsed
                    ? 'w-10 h-10 p-0 justify-center mx-auto'
                    : 'gap-3 px-3 py-2.5',
                  active
                    ? 'text-[#22C55E] font-bold bg-[#22C55E]/15 border border-[#22C55E]/30'
                    : 'text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white border border-transparent',
                )}
              >
                <span className={`material-symbols-outlined text-[20px] shrink-0 ${active ? 'text-[#22C55E]' : ''}`}>
                  {item.icon}
                </span>
                <span className={collapsed ? 'md:hidden' : 'block'}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Profile & Auth at Bottom */}
        <div className="mt-auto border-t border-[#27272A] pt-3 space-y-2">
          {session ? (
            <div className="flex flex-col gap-1.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                title={collapsed ? 'Profile' : undefined}
                className={cx(
                  'flex items-center rounded-xl font-["Epilogue"] text-sm transition-all',
                  collapsed
                    ? 'w-10 h-10 p-0 justify-center mx-auto'
                    : 'gap-3 px-3 py-2.5',
                  pathname === '/dashboard'
                    ? 'text-[#22C55E] font-bold bg-[#22C55E]/15 border border-[#22C55E]/30'
                    : 'text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white border border-transparent',
                )}
              >
                <div className="w-7 h-7 rounded-full bg-[#201f1f] border border-[#27272A] flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
                  {session.user?.name?.[0] ?? session.user?.email?.[0] ?? 'U'}
                </div>
                <div className={`flex flex-col min-w-0 flex-1 ${collapsed ? 'md:hidden' : 'flex'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-xs font-bold truncate">
                      {session.user?.name ?? 'My Profile'}
                    </span>
                    {session.user?.role && session.user.role !== 'PARTICIPANT' && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30">
                        {session.user.role === 'SUPERADMIN' ? 'SUPER' : 'ORG'}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#8e9192] truncate">{session.user?.email}</span>
                </div>
              </Link>

              {/* Sign Out Button (Visible on Mobile Drawer & Desktop) */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  void signOut({ callbackUrl: '/' });
                }}
                className={cx(
                  'flex items-center rounded-xl text-[#c4c7c8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 border border-transparent hover:border-[#EF4444]/20 font-["Epilogue"] text-xs font-semibold transition-all',
                  collapsed
                    ? 'w-10 h-10 p-0 justify-center mx-auto'
                    : 'gap-2 px-3 py-2 w-full',
                )}
                title="Sign Out"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0 text-[#8e9192] group-hover:text-[#EF4444]">
                  logout
                </span>
                <span className={collapsed ? 'md:hidden' : 'inline'}>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className={cx('flex flex-col gap-2', collapsed ? 'md:items-center' : '')}>
              {/* Logged-out buttons (Mobile drawer & Desktop expanded) */}
              <div className={cx('flex gap-2 w-full', collapsed ? 'md:hidden' : 'flex')}>
                <Link
                  href="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 px-3 rounded-xl text-xs font-['Epilogue'] font-bold text-[#c4c7c8] bg-[#201f1f] hover:text-white hover:bg-[#27272A] border border-[#27272A] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 px-3 rounded-xl text-xs font-['Epilogue'] font-bold text-[#131313] bg-[#22C55E] hover:bg-emerald-400 transition-colors shadow"
                >
                  Sign Up
                </Link>
              </div>

              {/* Collapsed desktop icon only */}
              <Link
                href="/signin"
                title="Sign In"
                className={cx(
                  'items-center justify-center rounded-xl text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white transition-colors w-10 h-10',
                  collapsed ? 'hidden md:flex' : 'hidden',
                )}
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
              </Link>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
