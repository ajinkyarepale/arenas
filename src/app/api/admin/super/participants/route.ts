import { NextResponse } from 'next/server';
import { forbidden, requireSuperAdmin, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { RoleType, type Prisma } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user, allowed } = await requireSuperAdmin();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Super Admin authorization required.');

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '15', 10)));
  const skip = (page - 1) * pageSize;

  const where: Prisma.UserWhereInput = query
    ? {
        role: RoleType.PARTICIPANT,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      }
    : { role: RoleType.PARTICIPANT };

  const [total, participants] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        isBot: true,
        botPersona: true,
        createdAt: true,
        _count: { select: { trades: true, participations: true } },
      },
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    participants,
  });
}
