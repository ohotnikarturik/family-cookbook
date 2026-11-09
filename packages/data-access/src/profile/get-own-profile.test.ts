import type { AppSupabaseClient } from '../supabase/server.js';
import { describe, expect, it, vi } from 'vitest';

import { getOwnProfile } from './get-own-profile.js';

describe('getOwnProfile', () => {
  it('maps a profile row to domain fields', async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                display_name: 'Ana',
                preferred_language: 'fi',
                theme_preference: 'dark',
              },
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as AppSupabaseClient;

    await expect(getOwnProfile(client)).resolves.toEqual({
      ok: true,
      profile: {
        displayName: 'Ana',
        preferredLanguage: 'fi',
        themePreference: 'dark',
      },
    });
  });

  it('returns not_found without a profile row', async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    } as unknown as AppSupabaseClient;

    await expect(getOwnProfile(client)).resolves.toEqual({ ok: false, error: 'not_found' });
  });
});
