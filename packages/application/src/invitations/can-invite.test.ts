import { describe, expect, it } from 'vitest';

import { canAssignInviteRole, canManageInvitations } from './can-invite.js';

describe('canManageInvitations', () => {
  it('allows owners and admins only', () => {
    expect(canManageInvitations('owner')).toBe(true);
    expect(canManageInvitations('admin')).toBe(true);
    expect(canManageInvitations('editor')).toBe(false);
    expect(canManageInvitations('contributor')).toBe(false);
    expect(canManageInvitations('viewer')).toBe(false);
  });
});

describe('canAssignInviteRole', () => {
  it('lets the owner invite every role except owner', () => {
    expect(canAssignInviteRole('owner', 'admin')).toBe(true);
    expect(canAssignInviteRole('owner', 'editor')).toBe(true);
    expect(canAssignInviteRole('owner', 'contributor')).toBe(true);
    expect(canAssignInviteRole('owner', 'viewer')).toBe(true);
    expect(canAssignInviteRole('owner', 'owner')).toBe(false);
  });

  it('lets an admin invite editor, contributor, and viewer only', () => {
    expect(canAssignInviteRole('admin', 'editor')).toBe(true);
    expect(canAssignInviteRole('admin', 'contributor')).toBe(true);
    expect(canAssignInviteRole('admin', 'viewer')).toBe(true);
    expect(canAssignInviteRole('admin', 'admin')).toBe(false);
    expect(canAssignInviteRole('admin', 'owner')).toBe(false);
  });

  it('blocks editor, contributor, and viewer from inviting', () => {
    for (const role of ['editor', 'contributor', 'viewer'] as const) {
      expect(canAssignInviteRole(role, 'viewer')).toBe(false);
      expect(canAssignInviteRole(role, 'admin')).toBe(false);
    }
  });
});
