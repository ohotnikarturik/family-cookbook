import { getRecipeAuditInputSchema, type RecipeAuditResult } from '@family-cookbook/contracts';
import { canViewAuditEvents } from '@family-cookbook/permissions';
import {
  getFamilyWorkspaceForMember,
  getRecipeHeader,
  listRecipeAuditEvents,
  type AppSupabaseClient,
} from '@family-cookbook/data-access';

import { loadVerifiedAuthUser } from '../profile/ensure-profile-for-user.js';

export type GetRecipeAuditLogResult =
  | { status: 'auth_required' }
  | { status: 'validation_error' }
  | { status: 'forbidden' }
  | { status: 'not_found' }
  | { status: 'query_failed' }
  | { status: 'ok'; result: RecipeAuditResult };

export async function getRecipeAuditLog(
  client: AppSupabaseClient,
  rawInput: unknown,
): Promise<GetRecipeAuditLogResult> {
  const auth = await loadVerifiedAuthUser(client);
  if (auth.status !== 'ok') {
    return { status: 'auth_required' };
  }

  const parsed = getRecipeAuditInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: 'validation_error' };
  }

  const workspace = await getFamilyWorkspaceForMember(client, parsed.data.familyId);
  if (!workspace.ok) {
    return { status: 'forbidden' };
  }

  if (!canViewAuditEvents(workspace.workspace.role)) {
    return { status: 'forbidden' };
  }

  const header = await getRecipeHeader(client, parsed.data.familyId, parsed.data.recipeId);
  if (!header.ok) {
    return header.error === 'not_found' ? { status: 'not_found' } : { status: 'query_failed' };
  }

  const listed = await listRecipeAuditEvents(client, parsed.data);
  if (!listed.ok) {
    return { status: 'query_failed' };
  }

  return { status: 'ok', result: listed.result };
}
