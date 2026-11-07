import { familyIdSchema } from '@family-cookbook/contracts';
import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const pendingRowSchema = z.object({
  id: familyIdSchema,
  expires_at: z.string().min(1),
});

export async function findPendingInvitationByEmail(
  client: AppSupabaseClient,
  familyId: string,
  email: string,
): Promise<
  | { ok: true; invitation: { id: string; expiresAt: string } | null }
  | { ok: false; error: 'query_failed' }
> {
  const { data, error } = await client
    .from('family_invitations')
    .select('id, expires_at')
    .eq('family_id', familyId)
    .eq('email_normalized', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: true, invitation: null };
  }

  const parsed = pendingRowSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: 'query_failed' };
  }

  return {
    ok: true,
    invitation: { id: parsed.data.id, expiresAt: parsed.data.expires_at },
  };
}
