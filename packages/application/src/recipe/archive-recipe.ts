import { archiveRecipeInputSchema } from '@family-cookbook/contracts';
import { canArchiveRecipe } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  setRecipeStatus,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type ArchiveRecipeResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'version_conflict'; currentVersion?: number }
  | { status: 'mutation_failed' }
  | { status: 'ok'; recipeId: string; version: number };

export async function archiveRecipe(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<ArchiveRecipeResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = archiveRecipeInputSchema.safeParse(rawInput);
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

  if (!canArchiveRecipe(workspace.workspace.role, auth.userId, header.header.createdBy)) {
    return { status: 'forbidden' };
  }

  const archived = await setRecipeStatus(
    client,
    parsed.data.familyId,
    parsed.data.recipeId,
    parsed.data.expectedVersion,
    'archived',
  );

  if (!archived.ok) {
    if (archived.error === 'version_conflict') {
      return {
        status: 'version_conflict',
        ...(archived.currentVersion !== undefined
          ? { currentVersion: archived.currentVersion }
          : {}),
      };
    }
    if (archived.error === 'not_found') {
      return { status: 'not_found' };
    }
    if (archived.error === 'auth_required') {
      return { status: 'auth_required' };
    }
    if (archived.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok', recipeId: archived.recipeId, version: archived.version };
}
