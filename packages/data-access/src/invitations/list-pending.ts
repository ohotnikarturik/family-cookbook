import {
  invitableFamilyRoleSchema,
  isPendingInvitationExpired,
  pendingInvitationSchema,
  type PendingInvitation,
} from '@family-cookbook/contracts';
import { authEmailSchema } from '@family-cookbook/contracts';
import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const rowSchema = z.object({
  id: z.uuid(),
  family_id: z.uuid(),
  email_normalized: authEmailSchema,
  role: invitableFamilyRoleSchema,
  expires_at: z.string(),
  created_at: z.string(),
});

export async function listPendingFamilyInvitations(
  client: AppSupabaseClient,
  familyId: string,
): Promise<{ ok: true; invitations: PendingInvitation[] } | { ok: false; error: 'query_failed' }> {
  const { data, error } = await client
    .from('family_invitations')
    .select('id, family_id, email_normalized, role, expires_at, created_at')
    .eq('family_id', familyId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  const invitations: PendingInvitation[] = [];
  for (const row of data ?? []) {
    const parsedRow = rowSchema.safeParse(row);
    if (!parsedRow.success) {
      continue;
    }
    const candidate = {
      id: parsedRow.data.id,
      familyId: parsedRow.data.family_id,
      email: parsedRow.data.email_normalized,
      role: parsedRow.data.role,
      expiresAt: parsedRow.data.expires_at,
      createdAt: parsedRow.data.created_at,
      expired: isPendingInvitationExpired(parsedRow.data.expires_at, new Date()),
    };
    const parsedInvitation = pendingInvitationSchema.safeParse(candidate);
    if (parsedInvitation.success) {
      invitations.push(parsedInvitation.data);
    }
  }

  return { ok: true, invitations };
}
