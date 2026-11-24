import { familyIdSchema, type FamilyWorkspace } from '@family-cookbook/contracts';
import {
  getFamilyWorkspaceForMember,
  getMyFamilyAccess,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

/**
 * `forbidden` means "no access" for every reason except suspension: not a
 * member, left the family, or no such family. They share one result so a
 * family's existence is never revealed.
 */
export type ResolveAccessibleFamilyResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'suspended' }
  | { status: 'forbidden' }
  | { status: 'query_failed' }
  | { status: 'ok'; workspace: FamilyWorkspace };

export async function resolveAccessibleFamily(
  client: AppSupabaseClient,
  rawFamilyId: string,
): Promise<ResolveAccessibleFamilyResult> {
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
      const access = await getMyFamilyAccess(client, parsedId.data);
      if (access.ok && access.state === 'suspended') {
        return { status: 'suspended' };
      }
      return { status: 'forbidden' };
    }
    return { status: 'query_failed' };
  }

  return { status: 'ok', workspace: workspace.workspace };
}
