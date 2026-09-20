import { NextResponse } from 'next/server';
import { forbidden, requireSuperAdmin, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { EventStatus, RoleType } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, allowed } = await requireSuperAdmin();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Super Admin authorization required.');

  const [
    totalOrganizations,
    totalEvents,
    totalParticipants,
    liveEventsCount,
    completedEventsCount,
    demoEventsCount,
  ] = await Promise.all([
    prisma.user.count({ where: { role: RoleType.ORGANIZER } }),
    prisma.event.count(),
    prisma.user.count({ where: { role: RoleType.PARTICIPANT } }),
    prisma.event.count({ where: { status: EventStatus.LIVE } }),
    prisma.event.count({ where: { status: EventStatus.ENDED } }),
    prisma.event.count({ where: { mode: 'DEMO' } }),
  ]);

  return NextResponse.json({
    overview: {
      totalOrganizations,
      totalEvents,
      totalParticipants,
      liveEventsCount,
      completedEventsCount,
      demoEventsCount,
    },
  });
}
