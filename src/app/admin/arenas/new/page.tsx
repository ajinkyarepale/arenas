import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CreateArenaForm } from '@/components/admin/create-arena-form';
import { AppShell } from '@/components/app-shell';
import { SiteSidebar } from '@/components/site-sidebar';
import { authOptions, isOrganizer } from '@/lib/auth';

export const metadata: Metadata = { title: 'Create Arena — Arenas' };
export const dynamic = 'force-dynamic';

export default async function NewArenaPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/arenas/new');
  if (!isOrganizer(session.user.role)) redirect('/dashboard?error=organizer-only');

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <AppShell>
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 text-[#c4c7c8] hover:text-white font-['Epilogue'] text-xs font-bold transition-colors">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-[#27272A]" />
            <span className="font-['Epilogue'] text-xs font-bold text-white tracking-wider uppercase">
              CREATE NEW ARENA
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/admin" className="text-xs font-semibold text-[#c4c7c8] hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
        </header>

        {/* Mobile Back Bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl">
          <Link href="/admin" className="flex items-center gap-1.5 text-[#c4c7c8] hover:text-white font-['Epilogue'] text-xs font-bold transition-colors">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Back to Dashboard</span>
          </Link>
          <span className="text-[11px] font-mono text-[#8e9192]">New Arena</span>
        </div>

        {/* Form Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[800px] mx-auto w-full flex flex-col gap-6">
          <CreateArenaForm />
        </main>
      </AppShell>
    </div>
  );
}
