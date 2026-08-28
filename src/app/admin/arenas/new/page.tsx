import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { CreateArenaForm } from '@/components/admin/create-arena-form';
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
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div>
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              CREATE NEW ARENA
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link href="/admin" className="text-sm font-semibold text-[#c4c7c8] hover:text-white transition-colors">
              Cancel
            </Link>
          </div>
        </header>

        {/* Form Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[800px] mx-auto w-full flex flex-col gap-6">
          <CreateArenaForm />
        </main>
      </div>
    </div>
  );
}
