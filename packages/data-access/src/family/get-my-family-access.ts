import { familyAccessStateSchema, type FamilyAccessState } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

/**
 * The caller's own blocked state for a family: `suspended`, `left`, or `null`
 * (no membership row, or an active one). It says nothing about other users or
 * whether the family exists.
 */
export async function getMyFamilyAccess(
  client: AppSupabaseClient,
  familyId: string,
): Promise<{ ok: true; state: FamilyAccessState | null } | { ok: false }> {
  const { data, error } = await client.rpc('get_my_family_access', { p_family_id: familyId });

  if (error) {
    return { ok: false };
  }
  if (data === null) {
    return { ok: true, state: null };
  }
  const parsed = familyAccessStateSchema.safeParse(data);
  return parsed.success ? { ok: true, state: parsed.data } : { ok: false };
}
