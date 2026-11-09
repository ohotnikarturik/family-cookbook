import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { describe, expect, it, vi } from 'vitest';

import { getOwnProfile, updateOwnProfile } from './get-own-profile.js';

vi.mock('./ensure-profile-for-user.js', () => ({
  loadVerifiedAuthUser: vi.fn(),
}));

vi.mock('@family-cookbook/data-access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@family-cookbook/data-access')>();
  return {
    ...actual,
    getOwnProfile: vi.fn(),
    updateOwnProfile: vi.fn(),
  };
});

import { getOwnProfile as getOwnProfileRepo, updateOwnProfile as updateOwnProfileRepo } from '@family-cookbook/data-access';
import { loadVerifiedAuthUser } from './ensure-profile-for-user.js';

describe('getOwnProfile use case', () => {
  it('returns auth_required without a session', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({ status: 'auth_required' });
    const client = {} as AppSupabaseClient;
    await expect(getOwnProfile(client)).resolves.toEqual({ status: 'auth_required' });
  });

  it('returns profile for the signed-in user', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'u1',
      email: 'a@example.com',
    });
    vi.mocked(getOwnProfileRepo).mockResolvedValue({
      ok: true,
      profile: {
        displayName: 'Ana',
        preferredLanguage: 'en',
        themePreference: 'system',
      },
    });
    const client = {} as AppSupabaseClient;
    await expect(getOwnProfile(client)).resolves.toEqual({
      status: 'ok',
      profile: {
        displayName: 'Ana',
        preferredLanguage: 'en',
        themePreference: 'system',
      },
    });
  });
});

describe('updateOwnProfile use case', () => {
  it('rejects invalid input', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'u1',
      email: undefined,
    });
    const client = {} as AppSupabaseClient;
    await expect(
      updateOwnProfile(client, { displayName: '', preferredLanguage: 'en', themePreference: 'system' }),
    ).resolves.toEqual({ status: 'validation_error' });
  });

  it('persists valid input for the signed-in user', async () => {
    vi.mocked(loadVerifiedAuthUser).mockResolvedValue({
      status: 'ok',
      userId: 'u1',
      email: undefined,
    });
    vi.mocked(updateOwnProfileRepo).mockResolvedValue({ ok: true });
    const client = {} as AppSupabaseClient;
    await expect(
      updateOwnProfile(client, {
        displayName: 'Ana',
        preferredLanguage: 'uk',
        themePreference: 'dark',
      }),
    ).resolves.toEqual({ status: 'ok' });
    expect(updateOwnProfileRepo).toHaveBeenCalledWith(client, 'u1', {
      displayName: 'Ana',
      preferredLanguage: 'uk',
      themePreference: 'dark',
    });
  });
});
