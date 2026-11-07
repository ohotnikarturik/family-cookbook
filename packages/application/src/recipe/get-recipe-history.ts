import { getRecipeHistoryInputSchema, type RecipeHistoryResult } from '@family-cookbook/contracts';
import { canViewRecipeHistory } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  listRecipeRevisions,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type GetRecipeHistoryResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'query_failed' }
  | { status: 'ok'; result: RecipeHistoryResult };

export async function getRecipeHistory(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<GetRecipeHistoryResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = getRecipeHistoryInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  const header = await getRecipeHeader(client, parsed.data.familyId, parsed.data.recipeId);
  if (!header.ok) {
    return header.error === 'not_found' ? { status: 'not_found' } : { status: 'query_failed' };
  }

  if (!canViewRecipeHistory(workspace.workspace.role, auth.userId, header.header.createdBy)) {
    return { status: 'forbidden' };
  }

  const listed = await listRecipeRevisions(client, parsed.data);
  if (!listed.ok) {
    return { status: 'query_failed' };
  }

  return { status: 'ok', result: listed.result };
}
