import { familyIdSchema } from '@family-cookbook/contracts';
import {
  getFamilyWorkspaceForMember,
  updateLastSelectedFamilyId,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type SetActiveFamilyPreferenceResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'query_failed' }
  | { status: 'update_failed' }
  | { status: 'ok' };

export async function setActiveFamilyPreference(
  client: AppSupabaseClient,
  rawFamilyId: string,
): Promise<SetActiveFamilyPreferenceResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsedId = familyIdSchema.safeParse(rawFamilyId);
  if (!parsedId.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsedId.data);
  if (!workspace.ok) {
    if (workspace.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    return { status: 'query_failed' };
  }

  const updated = await updateLastSelectedFamilyId(client, auth.userId, parsedId.data);
  if (!updated.ok) {
    return { status: 'update_failed' };
  }

  return { status: 'ok' };
}
