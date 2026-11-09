import { transferFamilyOwnershipInputSchema } from '@family-cookbook/contracts';
import {
  canReceiveFamilyOwnership,
  canTransferFamilyOwnership,
} from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  listFamilyMemberDirectory,
  transferFamilyOwnership as transferFamilyOwnershipRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type TransferFamilyOwnershipResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function transferFamilyOwnership(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<TransferFamilyOwnershipResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = transferFamilyOwnershipInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canTransferFamilyOwnership(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const directory = await listFamilyMemberDirectory(client, parsed.data.familyId);
  if (!directory.ok) {
    return { status: 'mutation_failed' };
  }

  const target = directory.members.find((m) => m.userId === parsed.data.newOwnerUserId);
  if (!target) {
    return { status: 'not_found' };
  }

  if (
    !canReceiveFamilyOwnership(auth.userId, {
      userId: target.userId,
      role: target.role,
      status: target.status,
    })
  ) {
    return { status: 'forbidden' };
  }

  const formerOwnerRole = parsed.data.formerOwnerRole ?? 'admin';
  const updated = await transferFamilyOwnershipRepo(
    client,
    parsed.data.familyId,
    parsed.data.newOwnerUserId,
    formerOwnerRole,
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
