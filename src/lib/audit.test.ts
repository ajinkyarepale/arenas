import { describe, expect, it } from 'vitest';
import { isOrganizer } from '@/lib/auth';
import { RoleType } from '@/generated/client';

describe('Super Admin Role & Authorization Plumbing', () => {
  it('correctly identifies SUPERADMIN role in isOrganizer check', () => {
    expect(isOrganizer(RoleType.SUPERADMIN)).toBe(true);
    expect(isOrganizer(RoleType.ADMIN)).toBe(true);
    expect(isOrganizer(RoleType.ORGANIZER)).toBe(true);
    expect(isOrganizer(RoleType.PARTICIPANT)).toBe(false);
    expect(isOrganizer(undefined)).toBe(false);
  });
});
