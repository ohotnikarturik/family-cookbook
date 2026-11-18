import { familyIdSchema } from '@family-cookbook/contracts';
import { canViewRecipes } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  listFamilyCategories,
  listFamilyRecipeLanguages,
  listFamilyTags,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { isWithinRateLimit } from '../security/enforce-rate-limit.js';
import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type RecipeBrowseOptions = Readonly<{
  categories: readonly string[];
  tags: readonly string[];
  languages: readonly string[];
}>;

export type ListRecipeBrowseOptionsResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'rate_limited' }
  | { status: 'query_failed' }
  | { status: 'ok'; options: RecipeBrowseOptions };

/** Values the family really uses, for the recipe browse selects and category chips. */
export async function listRecipeBrowseOptions(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<ListRecipeBrowseOptionsResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = familyIdSchema.safeParse(
    typeof rawInput === 'object' && rawInput !== null && 'familyId' in rawInput
      ? rawInput.familyId
      : undefined,
  );
  if (!parsed.success) {
    return { status: 'validation_error' };
  }
  const familyId = parsed.data;

  const workspace = await getFamilyWorkspaceForMember(client, familyId);
  if (!workspace.ok || !canViewRecipes(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  if (!isWithinRateLimit('recipe_search', auth.userId)) {
    return { status: 'rate_limited' };
  }

  const [categories, tags, languages] = await Promise.all([
    listFamilyCategories(client, familyId),
    listFamilyTags(client, familyId),
    listFamilyRecipeLanguages(client, familyId),
  ]);
  if (!categories.ok || !tags.ok || !languages.ok) {
    return { status: 'query_failed' };
  }

  return {
    status: 'ok',
    options: {
      categories: categories.values,
      tags: tags.values,
      languages: languages.values,
    },
  };
}
