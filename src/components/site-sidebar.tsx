'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

export function SiteSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const isOrganizer =
    session?.user?.role === 'ORGANIZER' || session?.user?.role === 'SUPERADMIN';

  const navItems = [
    { href: '/markets', label: 'Markets', icon: 'show_chart' },
    { href: '/arenas', label: 'Live', icon: 'sensors' },
    { href: '/guide', label: 'Guide', icon: 'menu_book' },
    { href: '/info', label: 'About', icon: 'info' },
    ...(session ? [{ href: '/dashboard', label: 'Profile', icon: 'account_circle' }] : []),
    ...(isOrganizer ? [{ href: '/admin', label: 'Organize', icon: 'admin_panel_settings' }] : []),
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[rgba(20,20,20,0.9)] border-b border-[#27272A] backdrop-blur-xl z-50 flex items-center justify-between px-4">
        <Link href="/" className="font-['Geist'] text-xl font-bold text-white">
          Arenas
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 text-[#c4c7c8] hover:text-white transition-colors"
          aria-label="Toggle Navigation"
        >
          <span className="material-symbols-outlined text-2xl">
            {collapsed ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* Main Sidebar (Desktop + Mobile Slide Overlay) */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-[rgba(20,20,20,0.85)] border-r border-[#27272A] backdrop-blur-xl flex flex-col py-6 px-4 z-50 transition-all duration-300 ease-in-out ${
          collapsed
            ? 'w-16 md:w-16'
            : 'w-64 md:w-64'
        }`}
      >
        <div className="flex items-center justify-between mb-6 px-2">
          <Link href="/" className={`flex flex-col gap-0.5 ${collapsed ? 'hidden' : 'flex'}`}>
            <h1 className="font-['Geist'] text-2xl font-bold text-white tracking-tight">Arenas</h1>
            <p className="font-['Geist'] text-xs text-[#c4c7c8]">Campus Prediction Market</p>
          </Link>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex items-center justify-center p-1.5 rounded-lg text-[#c4c7c8] hover:text-white hover:bg-[#2a2a2a] transition-colors ml-auto"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <span className="material-symbols-outlined text-[20px]">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(`${item.href}/`));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-['Epilogue'] text-sm transition-colors ${
                  active
                    ? 'text-white font-bold border-r-2 border-white bg-[#2a2a2a]'
                    : 'text-[#c4c7c8] hover:bg-[#2a2a2a] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[20px] shrink-0">{item.icon}</span>
                <span className={collapsed ? 'hidden' : 'block'}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#27272A] pt-4 space-y-1">
          {session ? (
            <Link
              href="/dashboard"
              title={collapsed ? 'Profile' : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#c4c7c8] font-['Epilogue'] text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">account_circle</span>
              <span className={collapsed ? 'hidden' : 'block'}>Profile</span>
            </Link>
          ) : (
            <Link
              href="/signin"
              title={collapsed ? 'Sign In' : undefined}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-[#c4c7c8] font-['Epilogue'] text-sm hover:bg-[#2a2a2a] hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0">login</span>
              <span className={collapsed ? 'hidden' : 'block'}>Sign In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
