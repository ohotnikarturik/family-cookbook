import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAMILY_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const RECIPE_A = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0001';
const CONTRIBUTOR_A = '11111111-1111-4111-8111-111111111104';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    getFamilyWorkspaceForMember: vi.fn(),
    getRecipeHeader: vi.fn(),
    listRecipeAuditEvents: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  listRecipeAuditEvents,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { getRecipeAuditLog } from './get-recipe-audit-log.js';

const mockClient = {} as AppSupabaseClient;

describe('getRecipeAuditLog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forbids contributors even for their own recipes', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: CONTRIBUTOR_A,
      email: 'contributor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'contributor',
        memberCount: 3,
      },
    });

    const result = await getRecipeAuditLog(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
    });

    expect(result).toEqual({ status: 'forbidden' });
    expect(listRecipeAuditEvents).not.toHaveBeenCalled();
  });

  it('allows editors to load audit rows', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: '11111111-1111-4111-8111-111111111102',
      email: 'editor@test.test',
    });
    vi.mocked(getFamilyWorkspaceForMember).mockResolvedValue({
      ok: true,
      workspace: {
        id: FAMILY_A,
        name: 'A',
        defaultLanguage: 'en',
        role: 'editor',
        memberCount: 3,
      },
    });
    vi.mocked(getRecipeHeader).mockResolvedValue({
      ok: true,
      header: {
        id: RECIPE_A,
        familyId: FAMILY_A,
        createdBy: CONTRIBUTOR_A,
        sourceLanguage: 'en',
        version: 1,
        status: 'active',
      },
    });
    vi.mocked(listRecipeAuditEvents).mockResolvedValue({
      ok: true,
      result: { items: [], nextCursor: null },
    });

    const result = await getRecipeAuditLog(mockClient, {
      familyId: FAMILY_A,
      recipeId: RECIPE_A,
    });

    expect(result.status).toBe('ok');
    expect(listRecipeAuditEvents).toHaveBeenCalledOnce();
  });
});
