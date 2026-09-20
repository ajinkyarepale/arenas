import { NextResponse } from 'next/server';
import { forbidden, requireSuperAdmin, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { EventStatus, type Prisma } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user, allowed } = await requireSuperAdmin();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Super Admin authorization required.');

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const status = searchParams.get('status')?.trim();
  const mode = searchParams.get('mode')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '15', 10)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.EventWhereInput = {};
  if (query) {
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { code: { contains: query, mode: 'insensitive' } },
      { asset: { contains: query, mode: 'insensitive' } },
    ];
  }
  if (status && status in EventStatus) {
    where.status = status as EventStatus;
  }
  if (mode) {
    where.mode = mode;
  }

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        name: true,
        asset: true,
        status: true,
        mode: true,
        totalRounds: true,
        currentRound: true,
        createdAt: true,
        organizer: { select: { id: true, name: true, email: true } },
        _count: { select: { participants: true, trades: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    events,
  });
}
