import {
  getLastSelectedFamilyId,
  listMyActiveFamilies,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type ResolveDefaultFamilyIdResult =
  | { status: 'auth_required' }
  | { status: 'none' }
  | { status: 'query_failed' }
  | { status: 'ok'; familyId: string };

/**
 * Picks a dashboard family from active memberships. Preference is used only when
 * the user still has access; authorization is always membership-based.
 */
export async function resolveDefaultFamilyId(
  client: AppSupabaseClient,
): Promise<ResolveDefaultFamilyIdResult> {
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

  if (listed.families.length === 0) {
    return { status: 'none' };
  }

  const preferred = await getLastSelectedFamilyId(client);
  if (!preferred.ok) {
    return { status: 'query_failed' };
  }

  if (preferred.familyId) {
    const match = listed.families.find((family) => family.id === preferred.familyId);
    if (match) {
      return { status: 'ok', familyId: match.id };
    }
  }

  return { status: 'ok', familyId: listed.families[0]!.id };
}
