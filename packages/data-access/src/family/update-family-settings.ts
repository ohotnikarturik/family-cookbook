import type { UpdateFamilyInput } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export type UpdateFamilySettingsRepoResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' | 'validation' | 'query_failed' };

export async function updateFamilySettings(
  client: AppSupabaseClient,
  input: UpdateFamilyInput,
): Promise<UpdateFamilySettingsRepoResult> {
  const { data, error } = await client
    .from('families')
    .update({
      name: input.name,
      default_language: input.defaultLanguage,
    })
    .eq('id', input.familyId)
    .select('id')
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
