import { familyIdSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export async function redeemFamilyInvitation(
  client: AppSupabaseClient,
  rawToken: string,
): Promise<
  | { ok: true; familyId: string }
  | {
      ok: false;
      error:
        | 'redeem_failed'
        | 'not_found'
        | 'revoked'
        | 'expired'
        | 'already_accepted'
        | 'email_mismatch'
        | 'already_member'
        | 'auth_required'
        | 'email_unverified'
        | 'invalid_token'
        | 'invalid_response';
    }
> {
  const { data, error } = await client.rpc('accept_family_invitation', {
    p_token: rawToken,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('verified email')) {
      return { ok: false, error: 'email_unverified' };
    }
    if (message.includes('authentication required')) {
      return { ok: false, error: 'auth_required' };
    }
    if (message.includes('invalid invitation token')) {
      return { ok: false, error: 'invalid_token' };
    }
    if (message.includes('not found')) {
      return { ok: false, error: 'not_found' };
    }
    if (message.includes('revoked')) {
      return { ok: false, error: 'revoked' };
    }
    if (message.includes('expired')) {
      return { ok: false, error: 'expired' };
    }
    if (message.includes('already accepted')) {
      return { ok: false, error: 'already_accepted' };
    }
    if (message.includes('email does not match')) {
      return { ok: false, error: 'email_mismatch' };
    }
    if (message.includes('already a member')) {
      return { ok: false, error: 'already_member' };
    }
    return { ok: false, error: 'redeem_failed' };
  }

  const parsed = familyIdSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_response' };
  }

  return { ok: true, familyId: parsed.data };
}
