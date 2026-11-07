import { familyIdSchema } from '@family-cookbook/contracts';
import {
  getFamilyWorkspaceForMember,
  revokeFamilyInvitation,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';
import { canManageInvitations } from './can-invite.js';

export type RevokeInvitationResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'revoke_failed' }
  | { status: 'ok' };

export async function revokeInvitation(
  client: AppSupabaseClient,
  rawFamilyId: string,
  rawInvitationId: string,
): Promise<RevokeInvitationResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const familyId = familyIdSchema.safeParse(rawFamilyId);
  const invitationId = familyIdSchema.safeParse(rawInvitationId);
  if (!familyId.success || !invitationId.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, familyId.data);
  if (!workspace.ok || !canManageInvitations(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const revoked = await revokeFamilyInvitation(client, invitationId.data, familyId.data);
  if (!revoked.ok) {
    if (revoked.error === 'not_found') {
      return { status: 'not_found' };
    }
    return { status: 'revoke_failed' };
  }

  return { status: 'ok' };
}
