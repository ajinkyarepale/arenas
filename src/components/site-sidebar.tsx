'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function SiteSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile drawer whenever route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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

  const navItems = [
    { href: '/markets', label: 'Markets', icon: 'show_chart' },
    { href: '/arenas', label: 'Live', icon: 'sensors' },
    { href: '/guide', label: 'Guide', icon: 'menu_book' },
    { href: '/info', label: 'About', icon: 'info' },
    ...(isOrganizer ? [{ href: '/admin', label: 'Admin Panel', icon: 'admin_panel_settings' }] : []),
  ];

  return (
    <>
      {/* Mobile Top Navigation Header Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[rgba(19,19,19,0.95)] border-b border-[#27272A] backdrop-blur-xl z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-['Geist'] text-xl font-bold text-white tracking-tight">Arenas</span>
          <span className="text-[10px] font-['Epilogue'] font-bold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full uppercase">
            Market
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="p-2 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] border border-transparent hover:border-[#27272A] transition-colors flex items-center justify-center"
          aria-label={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          <span className="material-symbols-outlined text-2xl">
            {mobileOpen ? 'close' : 'menu'}
          </span>
        </button>
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
        className={`fixed top-0 bottom-0 left-0 h-full bg-[#141414] md:bg-[rgba(20,20,20,0.85)] border-r border-[#27272A] backdrop-blur-xl flex flex-col py-6 px-4 z-50 transition-all duration-300 ease-in-out ${
          mobileOpen
            ? 'translate-x-0 w-72 shadow-2xl'
            : '-translate-x-full md:translate-x-0'
        } ${collapsed ? 'md:w-16' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between mb-6 px-2">
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
            className="md:hidden p-1.5 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-colors"
            title="Close navigation"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#2a2a2a] transition-colors ml-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-['Epilogue'] text-sm transition-all ${
                  active
                    ? 'text-white font-bold bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
                    : 'text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white border border-transparent'
                }`}
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
        <div className="mt-auto border-t border-[#27272A] pt-4 space-y-1.5">
          {session ? (
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              title={collapsed ? 'Profile' : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-['Epilogue'] text-sm transition-all ${
                pathname === '/dashboard'
                  ? 'text-white font-bold bg-[#22C55E]/15 border border-[#22C55E]/30'
                  : 'text-[#c4c7c8] hover:bg-[#201f1f] hover:text-white border border-transparent'
              }`}
            >
              <div className="w-6 h-6 rounded-full bg-[#201f1f] border border-[#27272A] flex items-center justify-center text-xs font-bold text-white shrink-0 uppercase">
                {session.user?.name?.[0] ?? session.user?.email?.[0] ?? 'U'}
              </div>
              <div className={`flex flex-col min-w-0 ${collapsed ? 'md:hidden' : 'flex'}`}>
                <span className="text-white text-xs font-bold truncate">
                  {session.user?.name ?? 'My Profile'}
                </span>
                <span className="text-[10px] text-[#8e9192] truncate">{session.user?.email}</span>
              </div>
            </Link>
          ) : (
            <Link
              href="/signin"
              onClick={() => setMobileOpen(false)}
              title={collapsed ? 'Sign In' : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#c4c7c8] font-['Epilogue'] text-sm hover:bg-[#201f1f] hover:text-white border border-transparent transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">login</span>
              <span className={collapsed ? 'md:hidden' : 'block'}>Sign In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
