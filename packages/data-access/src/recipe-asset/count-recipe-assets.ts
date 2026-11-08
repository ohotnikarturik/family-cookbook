import type { AppSupabaseClient } from '../supabase/server.js';

export async function countRecipeAssets(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: 'query_failed' }> {
  const { count, error } = await client
    .from('recipe_assets')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', familyId)
    .eq('recipe_id', recipeId)
    .neq('processing_status', 'rejected');

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  return { ok: true, count: count ?? 0 };
}
