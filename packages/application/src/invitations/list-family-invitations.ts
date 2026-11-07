import { familyIdSchema, type PendingInvitation } from '@family-cookbook/contracts';
import {
  getFamilyWorkspaceForMember,
  listPendingFamilyInvitations,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { canManageInvitations } from './can-invite.js';

export type ListFamilyInvitationsResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'query_failed' }
  | { status: 'ok'; invitations: PendingInvitation[] };

export async function listFamilyInvitations(
  client: AppSupabaseClient,
  rawFamilyId: string,
): Promise<ListFamilyInvitationsResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const familyId = familyIdSchema.safeParse(rawFamilyId);
  if (!familyId.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, familyId.data);
  if (!workspace.ok || !canManageInvitations(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const listed = await listPendingFamilyInvitations(client, familyId.data);
  if (!listed.ok) {
    return { status: 'query_failed' };
  }

  return { status: 'ok', invitations: listed.invitations };
}
