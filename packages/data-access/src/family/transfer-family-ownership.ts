import type { FormerOwnerRole } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export type TransferFamilyOwnershipRepoResult =
  | { ok: true }
  | { ok: false; error: 'forbidden' | 'not_found' | 'invalid' | 'query_failed' };

const INVALID_SQLSTATE = new Set(['22023', '23514']);

export async function transferFamilyOwnership(
  client: AppSupabaseClient,
  familyId: string,
  newOwnerUserId: string,
  formerOwnerRole: FormerOwnerRole,
): Promise<TransferFamilyOwnershipRepoResult> {
  const { error } = await client.rpc('transfer_family_ownership', {
    p_family_id: familyId,
    p_new_owner_user_id: newOwnerUserId,
    p_former_owner_role: formerOwnerRole,
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
