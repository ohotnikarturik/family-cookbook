import { setFamilyMemberRoleInputSchema } from '@family-cookbook/contracts';
import { canAdministrateTargetMember, canAssignMemberRole } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  listFamilyMemberDirectory,
  setFamilyMemberRole as setFamilyMemberRoleRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type SetFamilyMemberRoleResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function setFamilyMemberRole(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<SetFamilyMemberRoleResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = setFamilyMemberRoleInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canAssignMemberRole(workspace.workspace.role, parsed.data.newRole)) {
    return { status: 'forbidden' };
  }

  const directory = await listFamilyMemberDirectory(client, parsed.data.familyId);
  if (!directory.ok) {
    return { status: 'mutation_failed' };
  }

  const target = directory.members.find((m) => m.userId === parsed.data.memberUserId);
  if (!target) {
    return { status: 'not_found' };
  }

  if (
    !canAdministrateTargetMember(workspace.workspace.role, auth.userId, {
      userId: target.userId,
      role: target.role,
      status: target.status,
    })
  ) {
    return { status: 'forbidden' };
  }

  if (target.role === parsed.data.newRole) {
    return { status: 'ok' };
  }

  const updated = await setFamilyMemberRoleRepo(
    client,
    parsed.data.familyId,
    parsed.data.memberUserId,
    parsed.data.newRole,
  );

  if (!updated.ok) {
    if (updated.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    if (updated.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (updated.error === 'invalid') {
      return { status: 'forbidden' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok' };
}
