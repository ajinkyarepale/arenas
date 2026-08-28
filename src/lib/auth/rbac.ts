import { PermissionKey, RoleType } from '@/generated/client';
import { prisma } from '@/lib/prisma';

/**
 * Baseline permission matrix defining default capabilities per RoleType.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleType, PermissionKey[]> = {
  SUPERADMIN: [
    PermissionKey.USER_VIEW,
    PermissionKey.USER_CREATE,
    PermissionKey.USER_UPDATE,
    PermissionKey.USER_SUSPEND,
    PermissionKey.USER_DELETE,
    PermissionKey.ADMIN_MANAGE,
    PermissionKey.ROLE_ASSIGN,
    PermissionKey.ARENA_VIEW_ALL,
    PermissionKey.ARENA_CREATE,
    PermissionKey.ARENA_MANAGE_OWN,
    PermissionKey.ARENA_MANAGE_ALL,
    PermissionKey.ARENA_DELETE_OWN,
    PermissionKey.ARENA_DELETE_ALL,
    PermissionKey.ROUND_VIEW,
    PermissionKey.ROUND_MANAGE_OWN,
    PermissionKey.ROUND_MANAGE_ALL,
    PermissionKey.ROUND_OVERRIDE,
    PermissionKey.PREDICTION_VIEW,
    PermissionKey.PREDICTION_SUBMIT,
    PermissionKey.LEDGER_VIEW,
    PermissionKey.POINTS_ADJUST,
    PermissionKey.ANALYTICS_VIEW,
    PermissionKey.AUDIT_LOG_VIEW,
    PermissionKey.SYSTEM_SETTINGS_VIEW,
    PermissionKey.SYSTEM_SETTINGS_UPDATE,
  ],
  ADMIN: [
    PermissionKey.USER_VIEW,
    PermissionKey.ARENA_VIEW_ALL,
    PermissionKey.ARENA_MANAGE_ALL,
    PermissionKey.ROUND_VIEW,
    PermissionKey.ROUND_MANAGE_ALL,
    PermissionKey.PREDICTION_VIEW,
    PermissionKey.LEDGER_VIEW,
    PermissionKey.ANALYTICS_VIEW,
    PermissionKey.AUDIT_LOG_VIEW,
  ],
  ORGANIZER: [
    PermissionKey.ARENA_CREATE,
    PermissionKey.ARENA_MANAGE_OWN,
    PermissionKey.ARENA_DELETE_OWN,
    PermissionKey.ROUND_VIEW,
    PermissionKey.ROUND_MANAGE_OWN,
    PermissionKey.PREDICTION_VIEW,
    PermissionKey.PREDICTION_SUBMIT,
    PermissionKey.ANALYTICS_VIEW,
  ],
  PARTICIPANT: [
    PermissionKey.PREDICTION_VIEW,
    PermissionKey.PREDICTION_SUBMIT,
  ],
};

/**
 * Metadata for all granular system permissions.
 */
export const ALL_PERMISSIONS: Array<{ key: PermissionKey; name: string; category: string; description: string }> = [
  { key: PermissionKey.USER_VIEW, name: 'View Users', category: 'Users', description: 'View user list and user profile details' },
  { key: PermissionKey.USER_CREATE, name: 'Create Users', category: 'Users', description: 'Create new user accounts' },
  { key: PermissionKey.USER_UPDATE, name: 'Update Users', category: 'Users', description: 'Update profile and metadata of users' },
  { key: PermissionKey.USER_SUSPEND, name: 'Suspend Users', category: 'Users', description: 'Suspend or deactivate user accounts' },
  { key: PermissionKey.USER_DELETE, name: 'Delete Users', category: 'Users', description: 'Permanently delete user accounts' },

  { key: PermissionKey.ADMIN_MANAGE, name: 'Manage Admins', category: 'Administration', description: 'Create and configure admin accounts and assign permissions' },
  { key: PermissionKey.ROLE_ASSIGN, name: 'Assign Roles', category: 'Administration', description: 'Assign roles to users' },

  { key: PermissionKey.ARENA_VIEW_ALL, name: 'View All Arenas', category: 'Arenas', description: 'View arenas across all organizers' },
  { key: PermissionKey.ARENA_CREATE, name: 'Create Arena', category: 'Arenas', description: 'Create new prediction market tournaments' },
  { key: PermissionKey.ARENA_MANAGE_OWN, name: 'Manage Own Arena', category: 'Arenas', description: 'Manage tournament settings for owned arenas' },
  { key: PermissionKey.ARENA_MANAGE_ALL, name: 'Manage All Arenas', category: 'Arenas', description: 'Manage any arena regardless of ownership' },
  { key: PermissionKey.ARENA_DELETE_OWN, name: 'Delete Own Arena', category: 'Arenas', description: 'Delete owned arenas' },
  { key: PermissionKey.ARENA_DELETE_ALL, name: 'Delete All Arenas', category: 'Arenas', description: 'Delete any arena across the platform' },

  { key: PermissionKey.ROUND_VIEW, name: 'View Rounds', category: 'Rounds', description: 'View rounds, live states, and trade activity' },
  { key: PermissionKey.ROUND_MANAGE_OWN, name: 'Manage Own Rounds', category: 'Rounds', description: 'Start, pause, and advance rounds in owned arenas' },
  { key: PermissionKey.ROUND_MANAGE_ALL, name: 'Manage All Rounds', category: 'Rounds', description: 'Manage rounds across all arenas' },
  { key: PermissionKey.ROUND_OVERRIDE, name: 'Override Rounds', category: 'Rounds', description: 'Override automated settlement in emergency cases' },

  { key: PermissionKey.PREDICTION_VIEW, name: 'View Predictions', category: 'Trading', description: 'View trade tape and crowd volume' },
  { key: PermissionKey.PREDICTION_SUBMIT, name: 'Submit Predictions', category: 'Trading', description: 'Place YES/NO outcome predictions with available balance' },

  { key: PermissionKey.LEDGER_VIEW, name: 'View Point Ledger', category: 'Ledger', description: 'View double-entry point transaction history' },
  { key: PermissionKey.POINTS_ADJUST, name: 'Adjust Points', category: 'Ledger', description: 'Perform manual point adjustments or corrections' },

  { key: PermissionKey.ANALYTICS_VIEW, name: 'View Analytics', category: 'Analytics', description: 'Access platform and tournament analytics' },
  { key: PermissionKey.AUDIT_LOG_VIEW, name: 'View Audit Logs', category: 'Audit', description: 'View system and security audit trail' },
  { key: PermissionKey.SYSTEM_SETTINGS_VIEW, name: 'View System Settings', category: 'System', description: 'View global system configuration' },
  { key: PermissionKey.SYSTEM_SETTINGS_UPDATE, name: 'Update System Settings', category: 'System', description: 'Modify global system settings' },
];

/**
 * Seed or verify baseline permissions and role mappings in the database.
 */
export async function seedDefaultPermissions(): Promise<void> {
  for (const p of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { name: p.name, category: p.category, description: p.description },
      create: { key: p.key, name: p.name, category: p.category, description: p.description },
    });
  }

  const dbPermissions = await prisma.permission.findMany();
  const permMap = new Map(dbPermissions.map((p) => [p.key, p.id]));

  for (const [role, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS) as Array<[RoleType, PermissionKey[]]>) {
    for (const key of keys) {
      const permissionId = permMap.get(key);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: { role_permissionId: { role, permissionId } },
          update: {},
          create: { role, permissionId },
        });
      }
    }
  }
}

/**
 * Fetch all effective permissions for a user (combining role defaults + user permission overrides).
 */
export async function getUserPermissions(userId: string, role: RoleType): Promise<Set<PermissionKey>> {
  if (role === RoleType.SUPERADMIN) {
    return new Set(Object.values(PermissionKey));
  }

  // 1. Get baseline permissions for the role
  const baseline = DEFAULT_ROLE_PERMISSIONS[role] || [];
  const effective = new Set<PermissionKey>(baseline);

  // 2. Fetch specific user permission overrides
  try {
    const overrides = await prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    for (const ov of overrides) {
      if (ov.granted) {
        effective.add(ov.permission.key);
      } else {
        effective.delete(ov.permission.key);
      }
    }
  } catch {
    // If DB is unreachable (e.g. unit test runtime), use role baseline
  }

  return effective;
}

/**
 * Centralized authorization policy engine:
 * `can(user, action, resource)`
 */
export async function can(
  user: { id: string; role: RoleType; status?: string } | null | undefined,
  action: PermissionKey,
  resource?: { organizerId?: string; userId?: string }
): Promise<boolean> {
  if (!user) return false;
  if (user.status === 'SUSPENDED' || user.status === 'DEACTIVATED') return false;

  // SuperAdmin has full bypass
  if (user.role === RoleType.SUPERADMIN) return true;

  // Resource ownership scoping:
  if (action === PermissionKey.ARENA_MANAGE_OWN || action === PermissionKey.ARENA_DELETE_OWN || action === PermissionKey.ROUND_MANAGE_OWN) {
    if (resource?.organizerId && resource.organizerId !== user.id) {
      // Check if user has global permission to manage all
      const perms = await getUserPermissions(user.id, user.role);
      return perms.has(PermissionKey.ARENA_MANAGE_ALL) || perms.has(PermissionKey.ROUND_MANAGE_ALL);
    }
  }

  const permissions = await getUserPermissions(user.id, user.role);
  return permissions.has(action);
}
