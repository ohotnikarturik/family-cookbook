import type { UpdateProfileInput } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export type UpdateOwnProfileResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' | 'validation' | 'query_failed' };

export async function updateOwnProfile(
  client: AppSupabaseClient,
  userId: string,
  input: UpdateProfileInput,
): Promise<UpdateOwnProfileResult> {
  const { data, error } = await client
    .from('profiles')
    .update({
      display_name: input.displayName,
      preferred_language: input.preferredLanguage,
      theme_preference: input.themePreference,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_id')
    .maybeSingle();

  if (error) {
    if (error.code === '42501') {
      return { ok: false, error: 'forbidden' };
    }
    if (error.code === '23514' || error.code === '23503') {
      return { ok: false, error: 'validation' };
    }
    return { ok: false, error: 'query_failed' };
  }

  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
