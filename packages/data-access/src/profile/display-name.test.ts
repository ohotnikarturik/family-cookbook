import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import { defaultProfileDisplayName } from './display-name.js';

function user(partial: Partial<User> & Pick<User, 'id'>): User {
  return {
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '',
    ...partial,
  } as User;
}

describe('defaultProfileDisplayName', () => {
  it('prefers user metadata full_name', () => {
    expect(
      defaultProfileDisplayName(
        user({
          id: '1',
          user_metadata: { full_name: '  Owner A  ' },
          email: 'a@test.com',
        }),
      ),
    ).toBe('Owner A');
  });

  it('falls back to email local part', () => {
    expect(
      defaultProfileDisplayName(user({ id: '1', email: 'editor-a@family-cookbook.test' })),
    ).toBe('editor-a');
  });
});
