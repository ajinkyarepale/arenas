import { describe, expect, it, vi } from 'vitest';
import { PermissionKey, RoleType, UserStatus } from '@/generated/client';
import { can, getUserPermissions } from './rbac';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPermission: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

describe('RBAC Authorization Engine', () => {
  it('SuperAdmin has unrestricted access to all permissions and resources', async () => {
    const superAdmin = { id: 'sa_1', role: RoleType.SUPERADMIN, status: UserStatus.ACTIVE };

    expect(await can(superAdmin, PermissionKey.ADMIN_MANAGE)).toBe(true);
    expect(await can(superAdmin, PermissionKey.ARENA_MANAGE_ALL)).toBe(true);
    expect(await can(superAdmin, PermissionKey.USER_DELETE)).toBe(true);
    expect(await can(superAdmin, PermissionKey.ARENA_MANAGE_OWN, { organizerId: 'other_organizer' })).toBe(true);
  });

  it('Organizer can only manage their own arenas and rounds', async () => {
    const organizer = { id: 'org_1', role: RoleType.ORGANIZER, status: UserStatus.ACTIVE };

    // Allowed on own arena
    expect(await can(organizer, PermissionKey.ARENA_MANAGE_OWN, { organizerId: 'org_1' })).toBe(true);
    expect(await can(organizer, PermissionKey.ROUND_MANAGE_OWN, { organizerId: 'org_1' })).toBe(true);

    // Blocked on other organizer's arena
    expect(await can(organizer, PermissionKey.ARENA_MANAGE_OWN, { organizerId: 'org_2' })).toBe(false);
    expect(await can(organizer, PermissionKey.ROUND_MANAGE_OWN, { organizerId: 'org_2' })).toBe(false);

    // Blocked from global administrative capabilities
    expect(await can(organizer, PermissionKey.USER_SUSPEND)).toBe(false);
    expect(await can(organizer, PermissionKey.ADMIN_MANAGE)).toBe(false);
    expect(await can(organizer, PermissionKey.SYSTEM_SETTINGS_UPDATE)).toBe(false);
  });

  it('Participant has minimal necessary permissions and cannot access organizer or admin actions', async () => {
    const participant = { id: 'user_1', role: RoleType.PARTICIPANT, status: UserStatus.ACTIVE };

    // Allowed to view and trade
    expect(await can(participant, PermissionKey.PREDICTION_VIEW)).toBe(true);
    expect(await can(participant, PermissionKey.PREDICTION_SUBMIT)).toBe(true);

    // Blocked from organizer/admin actions
    expect(await can(participant, PermissionKey.ARENA_CREATE)).toBe(false);
    expect(await can(participant, PermissionKey.ARENA_MANAGE_OWN)).toBe(false);
    expect(await can(participant, PermissionKey.ROUND_OVERRIDE)).toBe(false);
    expect(await can(participant, PermissionKey.POINTS_ADJUST)).toBe(false);
  });

  it('Suspended or deactivated users have zero permissions', async () => {
    const suspended = { id: 'user_suspended', role: RoleType.SUPERADMIN, status: UserStatus.SUSPENDED };
    const deactivated = { id: 'user_deactivated', role: RoleType.ORGANIZER, status: UserStatus.DEACTIVATED };

    expect(await can(suspended, PermissionKey.PREDICTION_SUBMIT)).toBe(false);
    expect(await can(suspended, PermissionKey.ARENA_MANAGE_ALL)).toBe(false);
    expect(await can(deactivated, PermissionKey.ARENA_CREATE)).toBe(false);
  });
});
