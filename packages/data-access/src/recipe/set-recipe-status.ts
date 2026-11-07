import type { RecipeStatus } from '@family-cookbook/contracts';
import { recipeMutationResultSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { parseRecipeMutationError } from './parse-mutation-error.js';

export async function setRecipeStatus(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
  expectedVersion: number,
  status: RecipeStatus,
  changeSummary?: string | null,
): Promise<
  | { ok: true; recipeId: string; version: number }
  | {
      ok: false;
      error: ReturnType<typeof parseRecipeMutationError>['error'];
      currentVersion?: number;
    }
> {
  const { data, error } = await client.rpc('set_recipe_status', {
    p_family_id: familyId,
    p_recipe_id: recipeId,
    p_expected_version: expectedVersion,
    p_status: status,
    p_change_summary: changeSummary ?? null,
  });

  if (error) {
    const parsed = parseRecipeMutationError(error);
    return parsed.currentVersion === undefined
      ? { ok: false, error: parsed.error }
      : { ok: false, error: parsed.error, currentVersion: parsed.currentVersion };
  }

  const parsedRow = recipeMutationResultSchema.safeParse(data);
  if (!parsedRow.success) {
    return { ok: false, error: 'mutation_failed' };
  }

  return {
    ok: true,
    recipeId: parsedRow.data.recipe_id,
    version: parsedRow.data.version,
  };
}
