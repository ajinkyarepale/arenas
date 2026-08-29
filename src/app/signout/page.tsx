'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { BeamsBackground, Spinner, SwitchButton } from '@/components/ui';

export default function SignOutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [pending, setPending] = useState(false);

  const handleSignOut = async () => {
    setPending(true);
    await signOut({ callbackUrl: '/' });
  };

  const handleCancel = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  const roleBadgeColor: Record<string, string> = {
    SUPERADMIN: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    ADMIN: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    ORGANIZER: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    PARTICIPANT: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex flex-col text-[#e5e2e1] font-['Geist'] text-sm">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between p-6 z-20">
        <Link
          href="/"
          className="font-['Geist'] text-xl font-black text-white hover:text-[#22C55E] transition-colors flex items-center gap-2"
        >
          <span>←</span>
          <span>Arenas</span>
        </Link>
        <SwitchButton size="default" />
      </header>

      {/* Centered Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="relative z-10 w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-block group">
              <h1 className="font-['Geist'] text-4xl text-white font-bold tracking-tight group-hover:opacity-90 transition-opacity">
                Arena
              </h1>
              <p className="font-['Geist'] text-xs uppercase tracking-widest text-[#c4c7c8] mt-1 font-semibold">
                Live Prediction Platform
              </p>
            </Link>
          </div>

        {/* Card Container */}
        <div className="bg-[rgba(20,20,20,0.85)] backdrop-blur-2xl border border-[#27272A] rounded-2xl p-7 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle Top Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          {status === 'loading' ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#a1a1aa]">
              <Spinner />
              <span className="text-xs font-['Epilogue']">Checking session…</span>
            </div>
          ) : session?.user ? (
            <div className="flex flex-col items-center text-center">
              {/* User Avatar Circle */}
              <div className="relative mb-5">
                <div className="w-20 h-20 rounded-full border-2 border-[#27272A] bg-[#18181B] flex items-center justify-center text-3xl font-bold text-white uppercase shadow-inner">
                  {session.user.name?.[0] ?? session.user.email?.[0] ?? 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center">
                  <svg
                    className="w-3.5 h-3.5 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                </div>
              </div>

              {/* User Details */}
              <h2 className="font-['Geist'] text-2xl font-bold text-white mb-1">
                {session.user.name || 'Signed In Account'}
              </h2>
              <p className="text-xs text-[#a1a1aa] font-['Epilogue'] mb-3">
                {session.user.email}
              </p>

              {session.user.role && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider border mb-6 ${
                    roleBadgeColor[session.user.role] ?? roleBadgeColor.PARTICIPANT
                  }`}
                >
                  {session.user.role}
                </span>
              )}

              {/* Confirmation Text */}
              <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-sm mb-8">
                Are you sure you want to sign out? You will need to sign back in to access active tournaments, submit predictions, or access your organizer dashboard.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={pending}
                  className="flex-1 py-3 px-4 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] hover:text-white transition-all disabled:opacity-50 order-2 sm:order-1"
                >
                  Stay Signed In
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={pending}
                  className="flex-1 py-3 px-4 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-['Epilogue'] text-xs font-bold shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 order-1 sm:order-2"
                >
                  {pending ? (
                    <Spinner className="border-white border-t-transparent w-4 h-4" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  )}
                  <span>{pending ? 'Signing out…' : 'Yes, Sign Out'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#18181B] border border-[#27272A] flex items-center justify-center mb-4 text-[#22C55E]">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h2 className="font-['Geist'] text-2xl font-bold text-white mb-2">
                Signed Out Securely
              </h2>
              <p className="text-xs text-[#a1a1aa] leading-relaxed max-w-sm mb-6 font-['Geist']">
                Your session has ended. We look forward to seeing your next market prediction!
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link
                  href="/"
                  className="flex-1 py-3 px-4 rounded-full border border-[#3f3f46] text-[#e4e4e7] font-['Epilogue'] text-xs font-bold hover:bg-[#27272A] hover:text-white transition-all text-center"
                >
                  Explore Markets
                </Link>
                <Link
                  href="/signin"
                  className="flex-1 py-3 px-4 rounded-full bg-white text-black font-['Epilogue'] text-xs font-bold hover:bg-[#e4e4e7] transition-all shadow-md text-center"
                >
                  Sign In Again →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </BeamsBackground>
  );
}
