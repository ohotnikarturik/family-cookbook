import { updateRecipeInputSchema } from '@family-cookbook/contracts';
import { canEditRecipe } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  updateRecipeAggregate,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type UpdateRecipeResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'version_conflict'; currentVersion?: number }
  | { status: 'mutation_failed' }
  | { status: 'ok'; recipeId: string; version: number };

export async function updateRecipe(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<UpdateRecipeResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = updateRecipeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  const header = await getRecipeHeader(client, parsed.data.familyId, parsed.data.recipeId);
  if (!header.ok) {
    return header.error === 'not_found' ? { status: 'not_found' } : { status: 'mutation_failed' };
  }

  if (!canEditRecipe(workspace.workspace.role, auth.userId, header.header.createdBy)) {
    return { status: 'forbidden' };
  }

  const updated = await updateRecipeAggregate(
    client,
    parsed.data.familyId,
    parsed.data.recipeId,
    parsed.data.expectedVersion,
    parsed.data.recipe,
  );

  if (!updated.ok) {
    if (updated.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (updated.error === 'version_conflict') {
      return {
        status: 'version_conflict',
        ...(updated.currentVersion !== undefined ? { currentVersion: updated.currentVersion } : {}),
      };
    }
    if (updated.error === 'auth_required') {
      return { status: 'auth_required' };
    }
    if (updated.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    if (updated.error === 'invalid_payload') {
      return { status: 'validation_error' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok', recipeId: updated.recipeId, version: updated.version };
}
