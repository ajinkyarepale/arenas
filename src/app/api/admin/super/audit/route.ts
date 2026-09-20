import { NextResponse } from 'next/server';
import { forbidden, requireSuperAdmin, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { AuditAction } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { user, allowed } = await requireSuperAdmin();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Super Admin authorization required.');

  const { searchParams } = new URL(request.url);
  const actionParam = searchParams.get('action')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
  const skip = (page - 1) * pageSize;

  const where = actionParam && actionParam in AuditAction ? { action: actionParam as AuditAction } : {};

  const [total, rawLogs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  const logs = rawLogs.map((log) => ({
    ...log,
    admin: log.actor,
  }));

  return NextResponse.json({
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    logs,
  });
}
