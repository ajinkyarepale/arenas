import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BigScreen } from '@/components/arena/big-screen';
import { findArenaByCode, toPublicInfo } from '@/lib/engine/snapshot';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return { title: 'Display' };
  const arena = await findArenaByCode(parsed.data);
  return {
    title: arena ? `${arena.name} — display` : 'Display',
    robots: { index: false, follow: false },
  };
}

/**
 * The projector route. Deliberately public and read-only: an organizer opens
 * this on the room's display without signing anything in, and it exposes only
 * data every participant can already see.
 */
export default async function ScreenPage({ params }: { params: { code: string } }) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) notFound();

  const arena = await findArenaByCode(parsed.data);
  if (!arena) notFound();

  return <BigScreen initialArena={toPublicInfo(arena)} />;
}
