import { familyIdSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export async function getLastSelectedFamilyId(
  client: AppSupabaseClient,
): Promise<
  { ok: true; familyId: string | null } | { ok: false; error: 'query_failed' | 'invalid_row' }
> {
  const { data, error } = await client
    .from('profiles')
    .select('last_selected_family_id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: true, familyId: null };
  }

  const raw = data.last_selected_family_id;
  if (raw === null) {
    return { ok: true, familyId: null };
  }

  const parsed = familyIdSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return { ok: true, familyId: parsed.data };
}

export async function updateLastSelectedFamilyId(
  client: AppSupabaseClient,
  userId: string,
  familyId: string,
): Promise<{ ok: true } | { ok: false; error: 'update_failed' }> {
  const { error } = await client
    .from('profiles')
    .update({ last_selected_family_id: familyId })
    .eq('user_id', userId);

  if (error) {
    return { ok: false, error: 'update_failed' };
  }

  return { ok: true };
}
