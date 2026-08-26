import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';

import { SignInForm } from '@/components/auth-forms';
import { authOptions } from '@/lib/auth';

export const metadata: Metadata = { title: 'Sign in · Arena' };
export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(searchParams.callbackUrl || '/dashboard');
  }

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen flex items-center justify-center relative overflow-hidden font-['Geist'] text-sm">
      {/* Background Gradient Effect */}
      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.15) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md px-6 md:px-0">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-['Geist'] text-4xl text-white font-bold">Arena</h1>
          <p className="font-['Geist'] text-base text-[#c4c7c8] mt-2">Prediction Market</p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-[rgba(20,20,20,0.7)] backdrop-blur-xl border border-[#27272A] rounded-xl p-8 shadow-2xl relative">
          <Suspense fallback={<div className="h-64 animate-pulse rounded bg-[#201f1f]" />}>
            <SignInForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
