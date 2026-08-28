import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/auth/rbac';
import { PermissionKey } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const hasAccess = await can(user, PermissionKey.ADMIN_MANAGE);
    if (!hasAccess && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'SuperAdmin permission required' }, { status: 403 });
    }

    const requests = await prisma.organizerRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            createdAt: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const counts = {
      pending: requests.filter((r) => r.status === 'PENDING').length,
      approved: requests.filter((r) => r.status === 'APPROVED').length,
      rejected: requests.filter((r) => r.status === 'REJECTED').length,
      total: requests.length,
    };

    return NextResponse.json({
      requests,
      counts,
    });
  } catch (error) {
    console.error('[/api/admin/organizers GET] Failed to fetch organizer requests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}
