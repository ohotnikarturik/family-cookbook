import type { UpsertRecipeTranslationPayload } from '@family-cookbook/contracts';
import { recipeMutationResultSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { parseRecipeMutationError } from './parse-mutation-error.js';
import { translationPayloadToRpcJson } from './translation-payload-to-rpc.js';

export async function upsertRecipeTranslationsRpc(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
  expectedVersion: number,
  languageTag: string,
  payload: UpsertRecipeTranslationPayload,
): Promise<
  | { ok: true; recipeId: string; version: number }
  | {
      ok: false;
      error: ReturnType<typeof parseRecipeMutationError>['error'];
      currentVersion?: number;
    }
> {
  const { data, error } = await client.rpc('upsert_recipe_translations', {
    p_family_id: familyId,
    p_recipe_id: recipeId,
    p_expected_version: expectedVersion,
    p_language_tag: languageTag,
    p_payload: translationPayloadToRpcJson(payload),
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
