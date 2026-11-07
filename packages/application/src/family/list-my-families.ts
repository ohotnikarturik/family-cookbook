import type { FamilySummary } from '@family-cookbook/contracts';
import { listMyActiveFamilies, type AppSupabaseClient } from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type ListMyFamiliesResult =
  | { status: 'auth_required' }
  | { status: 'query_failed' }
  | { status: 'ok'; families: FamilySummary[] };

export async function listMyFamilies(client: AppSupabaseClient): Promise<ListMyFamiliesResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const listed = await listMyActiveFamilies(client);
  if (!listed.ok) {
    if (listed.error === 'auth_required') {
      return { status: 'auth_required' };
    }
    return { status: 'query_failed' };
  }

  return { status: 'ok', families: listed.families };
}
