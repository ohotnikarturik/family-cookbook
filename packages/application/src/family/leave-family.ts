import { leaveFamilyInputSchema } from '@family-cookbook/contracts';
import { canLeaveFamily } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  leaveFamily as leaveFamilyRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type LeaveFamilyResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'sole_owner' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function leaveFamily(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<LeaveFamilyResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = leaveFamilyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canLeaveFamily(workspace.workspace.role)) {
    return { status: 'sole_owner' };
  }

  const left = await leaveFamilyRepo(client, parsed.data.familyId);
  if (!left.ok) {
    if (left.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    if (left.error === 'sole_owner') {
      return { status: 'sole_owner' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok' };
}
