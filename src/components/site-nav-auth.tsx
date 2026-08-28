'use client';

import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';

export function SiteNavAuth() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-8 rounded-full bg-[#201f1f] animate-pulse" />
      </div>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm font-semibold text-white hover:text-[#22C55E] transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-[#201f1f] border border-[#27272A] flex items-center justify-center text-xs font-bold uppercase text-white">
            {session.user.name?.[0] ?? session.user.email?.[0] ?? 'U'}
          </div>
          <span className="hidden sm:inline max-w-[120px] truncate">
            {session.user.name ?? 'Trader'}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: '/' })}
          className="text-xs font-['Epilogue'] font-semibold text-[#c4c7c8] hover:text-white transition-colors ml-1"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/signin"
        className="text-sm font-semibold text-[#c4c7c8] hover:text-white transition-colors"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="px-4 py-2 rounded-full bg-[#22C55E] text-[#131313] font-bold text-xs hover:bg-emerald-400 transition-colors shadow"
      >
        Sign up
      </Link>
    </div>
  );
}
