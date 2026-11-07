import type { InviteMemberInput } from '@family-cookbook/contracts';
import { INVITATION_EXPIRY_DAYS } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

import { hashInvitationToken } from './hash-token.js';

export async function insertFamilyInvitation(
  client: AppSupabaseClient,
  invitedByUserId: string,
  input: InviteMemberInput,
  rawToken: string,
): Promise<
  { ok: true; invitationId: string } | { ok: false; error: 'insert_failed' | 'duplicate_pending' }
> {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + INVITATION_EXPIRY_DAYS);

  const { data, error } = await client
    .from('family_invitations')
    .insert({
      family_id: input.familyId,
      email_normalized: input.email,
      role: input.role,
      token_hash: hashInvitationToken(rawToken),
      invited_by: invitedByUserId,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'duplicate_pending' };
    }
    return { ok: false, error: 'insert_failed' };
  }

  return { ok: true, invitationId: data.id };
}
