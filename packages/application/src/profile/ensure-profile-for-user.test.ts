import type { AppSupabaseClient } from '@family-cookbook/data-access';
import { describe, expect, it, vi } from 'vitest';

import { ensureProfileForCurrentUser } from './ensure-profile-for-user.js';

describe('ensureProfileForCurrentUser', () => {
  it('returns auth_required without a user', async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as AppSupabaseClient;

    await expect(ensureProfileForCurrentUser(client, {})).resolves.toEqual({
      status: 'auth_required',
    });
  });
});
