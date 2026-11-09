import { updateFamilyInputSchema } from '@family-cookbook/contracts';
import { canChangeFamilySettings } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  updateFamilySettings as updateFamilySettingsRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type UpdateFamilyResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'mutation_failed' }
  | { status: 'ok' };

export async function updateFamily(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<UpdateFamilyResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = updateFamilyInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canChangeFamilySettings(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const updated = await updateFamilySettingsRepo(client, parsed.data);
  if (!updated.ok) {
    if (updated.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    if (updated.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (updated.error === 'validation') {
      return { status: 'validation_error' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok' };
}
