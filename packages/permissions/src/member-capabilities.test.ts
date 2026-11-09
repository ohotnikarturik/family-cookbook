import { describe, expect, it } from 'vitest';

import {
  assignableMemberRolesForActor,
  canAdministrateTargetMember,
  canAssignMemberRole,
  canChangeFamilySettings,
  canReceiveFamilyOwnership,
  canTransferFamilyOwnership,
} from './member-capabilities.js';

const targetViewer = {
  userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
  role: 'viewer' as const,
  status: 'active' as const,
};

describe('canAssignMemberRole', () => {
  it('matches invitation rules', () => {
    expect(canAssignMemberRole('owner', 'admin')).toBe(true);
    expect(canAssignMemberRole('admin', 'admin')).toBe(false);
    expect(canAssignMemberRole('admin', 'editor')).toBe(true);
    expect(canAssignMemberRole('owner', 'owner')).toBe(false);
    expect(canAssignMemberRole('editor', 'viewer')).toBe(false);
  });
});

describe('canAdministrateTargetMember', () => {
  it('blocks self and owner targets', () => {
    expect(
      canAdministrateTargetMember('owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        ...targetViewer,
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
      }),
    ).toBe(false);
    expect(
      canAdministrateTargetMember('owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        userId: targetViewer.userId,
        role: 'owner',
        status: 'active',
      }),
    ).toBe(false);
  });

  it('blocks editors', () => {
    expect(
      canAdministrateTargetMember('editor', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', targetViewer),
    ).toBe(false);
  });

  it('requires owner to manage admins', () => {
    expect(
      canAdministrateTargetMember('admin', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002', {
        userId: targetViewer.userId,
        role: 'admin',
        status: 'active',
      }),
    ).toBe(false);
    expect(
      canAdministrateTargetMember('owner', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        userId: targetViewer.userId,
        role: 'admin',
        status: 'active',
      }),
    ).toBe(true);
  });
});

describe('assignableMemberRolesForActor', () => {
  it('lists roles an actor may assign', () => {
    expect(assignableMemberRolesForActor('admin')).toEqual(['viewer', 'contributor', 'editor']);
    expect(assignableMemberRolesForActor('owner')).toContain('admin');
  });
});

describe('canChangeFamilySettings', () => {
  it('allows owner and admin only', () => {
    expect(canChangeFamilySettings('owner')).toBe(true);
    expect(canChangeFamilySettings('admin')).toBe(true);
    expect(canChangeFamilySettings('editor')).toBe(false);
  });
});

describe('ownership transfer', () => {
  it('allows only owners to transfer', () => {
    expect(canTransferFamilyOwnership('owner')).toBe(true);
    expect(canTransferFamilyOwnership('admin')).toBe(false);
  });

  it('rejects invalid transfer targets', () => {
    expect(
      canReceiveFamilyOwnership('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        ...targetViewer,
        userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001',
      }),
    ).toBe(false);
    expect(
      canReceiveFamilyOwnership('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        userId: targetViewer.userId,
        role: 'owner',
        status: 'active',
      }),
    ).toBe(false);
    expect(
      canReceiveFamilyOwnership('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', {
        ...targetViewer,
        status: 'suspended',
      }),
    ).toBe(false);
    expect(
      canReceiveFamilyOwnership('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001', targetViewer),
    ).toBe(true);
  });
});
