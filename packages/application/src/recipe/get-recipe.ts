import { getRecipeInputSchema, type RecipeDetail } from '@family-cookbook/contracts';
import { getRecipeById, type AppSupabaseClient } from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type GetRecipeResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'not_found' }
  | { status: 'query_failed' }
  | { status: 'ok'; recipe: RecipeDetail };

export async function getRecipe(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<GetRecipeResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = getRecipeInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const loaded = await getRecipeById(client, parsed.data.familyId, parsed.data.recipeId);
  if (!loaded.ok) {
    if (loaded.error === 'not_found') {
      return { status: 'not_found' };
    }
    return { status: 'query_failed' };
  }

  return { status: 'ok', recipe: loaded.recipe };
}
