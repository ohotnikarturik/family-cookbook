import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveDefaultFamilyId } from './resolve-default-family-id.js';
import { setActiveFamilyPreference } from './set-active-family-preference.js';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FAMILY_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    listMyActiveFamilies: vi.fn(),
    getLastSelectedFamilyId: vi.fn(),
    getFamilyWorkspaceForMember: vi.fn(),
    updateLastSelectedFamilyId: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  getFamilyWorkspaceForMember,
  getLastSelectedFamilyId,
  listMyActiveFamilies,
  updateLastSelectedFamilyId,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

const mockClient = {} as AppSupabaseClient;

describe('resolveDefaultFamilyId', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns none when the user has no memberships', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
    vi.mocked(listMyActiveFamilies).mockResolvedValue({ ok: true, families: [] });

    const result = await resolveDefaultFamilyId(mockClient);
    expect(result).toEqual({ status: 'none' });
  });

  it('uses preference when membership still exists', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
    vi.mocked(listMyActiveFamilies).mockResolvedValue({
      ok: true,
      families: [
        {
          id: FAMILY_A,
          name: 'A',
          defaultLanguage: 'en',
          role: 'editor',
        },
        {
          id: FAMILY_B,
          name: 'B',
          defaultLanguage: 'en',
          role: 'viewer',
        },
      ],
    });
    vi.mocked(getLastSelectedFamilyId).mockResolvedValue({ ok: true, familyId: FAMILY_B });

    const result = await resolveDefaultFamilyId(mockClient);
    expect(result).toEqual({ status: 'ok', familyId: FAMILY_B });
  });

  it('falls back to first membership when preference is stale', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
    vi.mocked(listMyActiveFamilies).mockResolvedValue({
      ok: true,
      families: [
        {
          id: FAMILY_A,
          name: 'A',
          defaultLanguage: 'en',
          role: 'owner',
        },
      ],
    });
    vi.mocked(getLastSelectedFamilyId).mockResolvedValue({
      ok: true,
      familyId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });

    const result = await resolveDefaultFamilyId(mockClient);
    expect(result).toEqual({ status: 'ok', familyId: FAMILY_A });
  });
});

describe('setActiveFamilyPreference', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects when membership check fails', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'user-1',
      email: 'a@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({ ok: false, error: 'forbidden' });

    const result = await setActiveFamilyPreference(mockClient, FAMILY_B);
    expect(result).toEqual({ status: 'forbidden' });
    expect(updateLastSelectedFamilyId).not.toHaveBeenCalled();
  });
});
