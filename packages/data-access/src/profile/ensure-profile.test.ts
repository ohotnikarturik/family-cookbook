import type { User } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '../supabase/server.js';
import { ensureProfile } from './ensure-profile.js';

function mockUser(): User {
  return {
    id: '11111111-1111-4111-8111-111111111199',
    email: 'new@family-cookbook.test',
    app_metadata: {},
    user_metadata: { full_name: 'New Member' },
    aud: 'authenticated',
    created_at: '',
  } as User;
}

describe('ensureProfile', () => {
  it('returns exists when profile row is present', async () => {
    const client = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue({ data: { user_id: mockUser().id }, error: null }),
          }),
        }),
      }),
    } as unknown as AppSupabaseClient;

    await expect(ensureProfile(client, mockUser(), {})).resolves.toBe('exists');
  });

  it('inserts when profile is missing', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table !== 'profiles') {
          throw new Error('unexpected table');
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          insert,
        };
      }),
    } as unknown as AppSupabaseClient;

    await expect(
      ensureProfile(client, mockUser(), { preferredLanguage: 'fi', themePreference: 'dark' }),
    ).resolves.toBe('created');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser().id,
        display_name: 'New Member',
        preferred_language: 'fi',
        theme_preference: 'dark',
      }),
    );
  });
});
