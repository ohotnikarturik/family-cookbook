import type { AppSupabaseClient } from '../supabase/server.js';

export async function revokeFamilyInvitation(
  client: AppSupabaseClient,
  invitationId: string,
  familyId: string,
): Promise<{ ok: true } | { ok: false; error: 'revoke_failed' | 'not_found' }> {
  const { data, error } = await client
    .from('family_invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('family_id', familyId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'revoke_failed' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  return { ok: true };
}
