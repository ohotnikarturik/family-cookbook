import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    createFamilyBootstrap: vi.fn(),
    ensureProfile: vi.fn(),
    updateLastSelectedFamilyId: vi.fn(),
  };
});

vi.mock('../profile/ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

import {
  createFamilyBootstrap,
  ensureProfile,
  updateLastSelectedFamilyId,
} from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

import { createFamily } from './create-family.js';

const mockUser = { id: 'user-1', email: 'test@example.com' };

describe('createFamily', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('ensures profile before family bootstrap', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: mockUser.id,
      email: mockUser.email,
    });
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
    } as unknown as AppSupabaseClient;
    vi.mocked(ensureProfile).mockResolvedValue('created');
    vi.mocked(createFamilyBootstrap).mockResolvedValue({ ok: true, familyId: FAMILY_ID });
    vi.mocked(updateLastSelectedFamilyId).mockResolvedValue({ ok: true });

    const result = await createFamily(client, { name: 'Kitchen' }, { preferredLanguage: 'fi' });

    expect(result).toEqual({ status: 'ok', familyId: FAMILY_ID });
    expect(ensureProfile).toHaveBeenCalledWith(client, mockUser, { preferredLanguage: 'fi' });
    expect(createFamilyBootstrap).toHaveBeenCalled();
    expect(vi.mocked(ensureProfile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createFamilyBootstrap).mock.invocationCallOrder[0]!,
    );
  });

  it('returns auth_required without a session user', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({ status: 'auth_required' });
    const client = {} as AppSupabaseClient;

    await expect(createFamily(client, { name: 'Kitchen' })).resolves.toEqual({
      status: 'auth_required',
    });
    expect(ensureProfile).not.toHaveBeenCalled();
  });
});
