import type { AppSupabaseClient } from '../supabase/server.js';

export type SetFamilyMemberStatusRepoResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' | 'invalid' | 'query_failed' };

const INVALID_SQLSTATE = new Set(['22023', '23514']);

export async function setFamilyMemberStatus(
  client: AppSupabaseClient,
  familyId: string,
  memberUserId: string,
  newStatus: string,
): Promise<SetFamilyMemberStatusRepoResult> {
  const { error } = await client.rpc('set_family_member_status', {
    p_family_id: familyId,
    p_member_user_id: memberUserId,
    p_new_status: newStatus,
  });

  if (!error) {
    return { ok: true };
  }
  if (error.code === '42501') {
    return { ok: false, error: 'forbidden' };
  }
  if (error.code === 'P0002') {
    return { ok: false, error: 'not_found' };
  }
  if (error.code && INVALID_SQLSTATE.has(error.code)) {
    return { ok: false, error: 'invalid' };
  }
  return { ok: false, error: 'query_failed' };
}
