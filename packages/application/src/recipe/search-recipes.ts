import { searchRecipesInputSchema, type RecipeSearchResult } from '@family-cookbook/contracts';
import { canViewRecipes } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  searchRecipes as searchRecipesRepo,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { isWithinRateLimit } from '../security/enforce-rate-limit.js';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type SearchRecipesResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'rate_limited' }
  | { status: 'query_failed' }
  | { status: 'ok'; result: RecipeSearchResult };

export async function searchRecipes(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<SearchRecipesResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = searchRecipesInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canViewRecipes(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  if (!isWithinRateLimit('recipe_search', auth.userId)) {
    return { status: 'rate_limited' };
  }

  const result = await searchRecipesRepo(client, parsed.data);
  if (!result.ok) {
    return { status: 'query_failed' };
  }

  return { status: 'ok', result: result.result };
}
