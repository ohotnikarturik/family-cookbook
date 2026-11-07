import type { CreateRecipePayload } from '@family-cookbook/contracts';
import { recipeMutationResultSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { parseRecipeMutationError } from './parse-mutation-error.js';
import { recipePayloadToRpcJson } from './to-rpc-payload.js';

export async function createRecipeAggregate(
  client: AppSupabaseClient,
  familyId: string,
  payload: CreateRecipePayload,
): Promise<
  | { ok: true; recipeId: string; version: number }
  | {
      ok: false;
      error: ReturnType<typeof parseRecipeMutationError>['error'];
      currentVersion?: number;
    }
> {
  const { data, error } = await client.rpc('create_recipe_aggregate', {
    p_family_id: familyId,
    p_payload: recipePayloadToRpcJson(payload),
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
