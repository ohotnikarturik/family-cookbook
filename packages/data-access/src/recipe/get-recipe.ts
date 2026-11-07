import { recipeDetailSchema, type RecipeDetail } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { mapRecipeDetailRow } from './map-recipe-detail.js';

export async function getRecipeById(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
): Promise<
  | { ok: true; recipe: RecipeDetail }
  | { ok: false; error: 'not_found' | 'query_failed' | 'invalid_row' }
> {
  const { data, error } = await client
    .from('recipes')
    .select(
      `
      id,
      family_id,
      created_by,
      updated_by,
      title,
      description,
      source_language,
      category,
      servings,
      prep_minutes,
      cook_minutes,
      notes,
      status,
      version,
      created_at,
      updated_at,
      archived_at,
      recipe_ingredients (
        position,
        name,
        quantity,
        quantity_text,
        unit,
        notes
      ),
      recipe_steps (
        position,
        instruction,
        duration_minutes
      ),
      recipe_tags (
        tag_id,
        family_tags (
          id,
          family_id,
          name,
          normalized_name,
          created_by,
          created_at
        )
      ),
      recipe_translations (
        language_tag,
        title,
        description,
        notes,
        review_status
      )
    `,
    )
    .eq('family_id', familyId)
    .eq('id', recipeId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  const mapped = mapRecipeDetailRow(data as unknown as Parameters<typeof mapRecipeDetailRow>[0]);
  if (!mapped) {
    return { ok: false, error: 'invalid_row' };
  }

  const parsed = recipeDetailSchema.safeParse(mapped);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return { ok: true, recipe: parsed.data };
}
