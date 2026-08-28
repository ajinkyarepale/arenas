import { AuditAction } from '@/generated/client';
import { prisma } from '@/lib/prisma';

export interface CreateAuditLogParams {
  actorId?: string | null;
  action: AuditAction;
  resourceType: 'USER' | 'EVENT' | 'ROUND' | 'LEDGER' | 'SYSTEM';
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append-only audit logger for security-sensitive and operational events.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        previousData: (params.previousData as object) ?? undefined,
        newData: (params.newData as object) ?? undefined,
        metadata: (params.metadata as object) ?? undefined,
      },
    });
  } catch (err) {
    // Non-blocking catch to ensure audit logging errors do not crash critical business transactions
    console.error('Failed to create audit log entry:', err);
  }
}
