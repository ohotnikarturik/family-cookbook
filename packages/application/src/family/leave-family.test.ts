import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    getFamilyWorkspaceForMember: vi.fn(),
    getMyFamilyAccess: vi.fn(),
    leaveFamily: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  getFamilyWorkspaceForMember,
  getMyFamilyAccess,
  leaveFamily as leaveFamilyRepo,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { leaveFamily } from './leave-family.js';
import { resolveAccessibleFamily } from './resolve-accessible-family.js';

const FAMILY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const client = {} as AppSupabaseClient;

function workspace(role: 'owner' | 'admin' | 'editor' | 'contributor' | 'viewer') {
  return {
    ok: true as const,
    workspace: {
      id: FAMILY,
      name: 'Test family',
      defaultLanguage: 'en' as const,
      role,
      memberCount: 4,
    },
  };
}

describe('leaveFamily', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
  });

  it('requires a signed-in user', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({ status: 'auth_required' });
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: true })).toEqual({
      status: 'auth_required',
    });
    expect(leaveFamilyRepo).not.toHaveBeenCalled();
  });

  it('rejects input without confirmation or with a bad family id', async () => {
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: false })).toEqual({
      status: 'validation_error',
    });
    expect(await leaveFamily(client, { familyId: 'nope', confirm: true })).toEqual({
      status: 'validation_error',
    });
    expect(leaveFamilyRepo).not.toHaveBeenCalled();
  });

  it('is forbidden when the caller has no active membership', async () => {
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({ ok: false, error: 'forbidden' });
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: true })).toEqual({
      status: 'forbidden',
    });
    expect(leaveFamilyRepo).not.toHaveBeenCalled();
  });

  it('points an owner to ownership transfer without calling the database', async () => {
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue(workspace('owner'));
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: true })).toEqual({
      status: 'sole_owner',
    });
    expect(leaveFamilyRepo).not.toHaveBeenCalled();
  });

  it('lets a non-owner leave', async () => {
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue(workspace('viewer'));
    vi.mocked(leaveFamilyRepo).mockResolvedValue({ ok: true });
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: true })).toEqual({
      status: 'ok',
    });
    expect(leaveFamilyRepo).toHaveBeenCalledWith(client, FAMILY);
  });

  it.each([
    ['forbidden', 'forbidden'],
    ['sole_owner', 'sole_owner'],
    ['query_failed', 'mutation_failed'],
  ] as const)('maps database error %s to %s', async (error, status) => {
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue(workspace('editor'));
    vi.mocked(leaveFamilyRepo).mockResolvedValue({ ok: false, error });
    expect(await leaveFamily(client, { familyId: FAMILY, confirm: true })).toEqual({ status });
  });
});

describe('resolveAccessibleFamily access states', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({ ok: false, error: 'forbidden' });
  });

  it('reports a suspended member as suspended', async () => {
    vi.mocked(getMyFamilyAccess).mockResolvedValue({ ok: true, state: 'suspended' });
    expect(await resolveAccessibleFamily(client, FAMILY)).toEqual({ status: 'suspended' });
  });

  it.each([
    ['left', { ok: true, state: 'left' }],
    ['not a member', { ok: true, state: null }],
    ['state lookup failed', { ok: false }],
  ] as const)('reports no access for %s', async (_name, access) => {
    vi.mocked(getMyFamilyAccess).mockResolvedValue(access);
    expect(await resolveAccessibleFamily(client, FAMILY)).toEqual({ status: 'forbidden' });
  });

  it('does not look up the state when the family query itself failed', async () => {
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({ ok: false, error: 'query_failed' });
    expect(await resolveAccessibleFamily(client, FAMILY)).toEqual({ status: 'query_failed' });
    expect(getMyFamilyAccess).not.toHaveBeenCalled();
  });
});
