import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CreateArenaForm } from '@/components/admin/create-arena-form';
import { SiteShell } from '@/components/site-shell';
import { PageHeader } from '@/components/ui';
import { auth, isOrganizer } from '@/lib/auth';

export const metadata: Metadata = { title: 'New arena' };
export const dynamic = 'force-dynamic';

export default async function NewArenaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin/arenas/new');
  if (!isOrganizer(session.user.role)) redirect('/dashboard?error=organizer-only');

  return (
    <SiteShell>
      <div className="flex flex-col gap-6">
        <Link href="/admin" className="text-sm text-fg-muted hover:text-fg">
          &larr; Your arenas
        </Link>
        <PageHeader
          eyebrow="Organizer"
          title="Create an arena"
          subtitle="Set the format once. You start, pause and end the session from the control panel."
        />
        <CreateArenaForm />
      </div>
    </SiteShell>
  );
}
