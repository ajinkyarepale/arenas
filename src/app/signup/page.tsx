import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Suspense } from 'react';

import { SignUpForm } from '@/components/auth-forms';
import { authOptions } from '@/lib/auth';
import { BeamsBackground } from '@/components/ui';

export const metadata: Metadata = { title: 'Create an account · Arena' };
export const dynamic = 'force-dynamic';

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(searchParams.callbackUrl || '/dashboard');
  }

  return (
    <BeamsBackground intensity="medium" className="min-h-screen flex items-center justify-center text-[#e5e2e1] font-['Geist'] text-sm py-12">
      <div className="relative z-10 w-full max-w-md px-6 md:px-0">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="font-['Geist'] text-4xl text-white font-bold tracking-tight">Arena</h1>
          <p className="font-['Geist'] text-base text-[#c4c7c8] mt-2">Prediction Market</p>
        </div>

        {/* Auth Card Container */}
        <div className="bg-[rgba(20,20,20,0.8)] backdrop-blur-xl border border-[#27272A] rounded-2xl p-8 shadow-2xl relative">
          <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-[#201f1f]" />}>
            <SignUpForm />
          </Suspense>
        </div>
      </div>
    </BeamsBackground>
  );
}
