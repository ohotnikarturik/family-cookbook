import type { AppSupabaseClient } from '../supabase/server.js';

export type LeaveFamilyRepoResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'sole_owner' | 'query_failed' };

export async function leaveFamily(
  client: AppSupabaseClient,
  familyId: string,
): Promise<LeaveFamilyRepoResult> {
  const { error } = await client.rpc('leave_family', { p_family_id: familyId });

  if (!error) {
    return { ok: true };
  }
  if (error.code === '42501') {
    return { ok: false, error: 'forbidden' };
  }
  if (error.code === '22023' && error.message.includes('sole_owner_must_transfer')) {
    return { ok: false, error: 'sole_owner' };
  }
  return { ok: false, error: 'query_failed' };
}
