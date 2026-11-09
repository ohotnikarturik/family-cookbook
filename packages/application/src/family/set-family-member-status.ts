import { setFamilyMemberStatusInputSchema } from '@family-cookbook/contracts';
import { canAdministrateTargetMember } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  listFamilyMemberDirectory,
  setFamilyMemberStatus as setFamilyMemberStatusRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type SetFamilyMemberStatusResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function setFamilyMemberStatus(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<SetFamilyMemberStatusResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = setFamilyMemberStatusInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
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

  if (target.status === parsed.data.newStatus) {
    return { status: 'ok' };
  }

  const updated = await setFamilyMemberStatusRepo(
    client,
    parsed.data.familyId,
    parsed.data.memberUserId,
    parsed.data.newStatus,
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
