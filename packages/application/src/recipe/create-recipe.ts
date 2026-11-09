import { createRecipeInputSchema } from '@family-cookbook/contracts';
import { canCreateRecipe } from '@family-cookbook/permissions';
import {
  createRecipeAggregate,
  getFamilyWorkspaceForMember,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type CreateRecipeResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'mutation_failed' }
  | { status: 'ok'; recipeId: string; version: number };

export async function createRecipe(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<CreateRecipeResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = createRecipeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canCreateRecipe(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const created = await createRecipeAggregate(client, parsed.data.familyId, parsed.data.recipe);
  if (!created.ok) {
    if (created.error === 'auth_required') {
      return { status: 'auth_required' };
    }
    if (created.error === 'forbidden') {
      return { status: 'forbidden' };
    }
    if (created.error === 'invalid_payload') {
      return { status: 'validation_error' };
    }
    return { status: 'mutation_failed' };
  }

  return { status: 'ok', recipeId: created.recipeId, version: created.version };
}
