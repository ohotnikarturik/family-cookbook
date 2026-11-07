import {
  profileBootstrapHintsSchema,
  type ProfileBootstrapHints,
} from '@family-cookbook/contracts';
import type { User } from '@supabase/supabase-js';

import type { AppSupabaseClient } from '../supabase/server.js';

import { defaultProfileDisplayName } from './display-name.js';

export type EnsureProfileResult = 'created' | 'exists';

type ProfileRow = Readonly<{
  user_id: string;
  display_name: string;
  preferred_language: string;
  theme_preference: string;
}>;

export async function ensureProfile(
  client: AppSupabaseClient,
  user: User,
  rawHints: ProfileBootstrapHints,
): Promise<EnsureProfileResult> {
  const hints = profileBootstrapHintsSchema.parse(rawHints);

  const { data: existing, error: selectError } = await client
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (selectError) {
    throw new Error('Failed to load profile');
  }
  if (existing) {
    return 'exists';
  }

  const row: ProfileRow = {
    user_id: user.id,
    display_name: defaultProfileDisplayName(user),
    preferred_language: hints.preferredLanguage ?? 'en',
    theme_preference: hints.themePreference ?? 'system',
  };

  const { error: insertError } = await client.from('profiles').insert(row);
  if (insertError) {
    if (insertError.code === '23505') {
      return 'exists';
    }
    throw new Error('Failed to create profile');
  }
  return 'created';
}
