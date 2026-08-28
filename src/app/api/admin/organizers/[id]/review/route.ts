import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/audit';
import { PermissionKey, RoleType } from '@/generated/client';

export const dynamic = 'force-dynamic';

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  rejectionReason: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const hasAccess = await can(user, PermissionKey.ADMIN_MANAGE);
    if (!hasAccess && user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'SuperAdmin permission required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid review action' },
        { status: 400 }
      );
    }

    const organizerRequest = await prisma.organizerRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!organizerRequest) {
      return NextResponse.json({ error: 'Organizer request not found' }, { status: 404 });
    }

    const { action, rejectionReason } = parsed.data;

    if (action === 'APPROVE') {
      // Elevate user role to ORGANIZER and mark request APPROVED in a transaction
      const [updatedRequest, updatedUser] = await prisma.$transaction([
        prisma.organizerRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            reviewedById: user.id,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        }),
        prisma.user.update({
          where: { id: organizerRequest.userId },
          data: {
            role: RoleType.ORGANIZER,
          },
        }),
      ]);

      void createAuditLog({
        actorId: user.id,
        action: 'ROLE_CHANGED',
        resourceType: 'USER',
        resourceId: organizerRequest.userId,
        metadata: {
          action: 'ORGANIZER_APPROVE',
          requestId: id,
          collegeName: organizerRequest.collegeName,
          targetUserEmail: organizerRequest.user.email,
        },
      });

      return NextResponse.json({
        success: true,
        request: updatedRequest,
        user: { id: updatedUser.id, role: updatedUser.role },
        message: `Successfully approved ${organizerRequest.user.name} (${organizerRequest.collegeName}) as an Organizer.`,
      });
    } else {
      // Reject request
      const updatedRequest = await prisma.organizerRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: user.id,
          reviewedAt: new Date(),
          rejectionReason: rejectionReason || 'Application criteria not met.',
        },
      });

      void createAuditLog({
        actorId: user.id,
        action: 'PERMISSIONS_UPDATED',
        resourceType: 'USER',
        resourceId: id,
        metadata: {
          action: 'ORGANIZER_REJECT',
          collegeName: organizerRequest.collegeName,
          reason: rejectionReason,
        },
      });

      return NextResponse.json({
        success: true,
        request: updatedRequest,
        message: `Application rejected.`,
      });
    }
  } catch (error) {
    console.error('[/api/admin/organizers/review POST] Failed to review request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process review' },
      { status: 500 }
    );
  }
}
