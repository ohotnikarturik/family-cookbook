import { RECIPE_COVER_ASSET_KINDS } from '@family-cookbook/domain';

import type { AppSupabaseClient } from '../supabase/server.js';

export async function listRecipeCoverAssetIds(
  client: AppSupabaseClient,
  familyId: string,
  recipeIds: readonly string[],
): Promise<Map<string, string>> {
  if (recipeIds.length === 0) {
    return new Map();
  }

  const { data, error } = await client
    .from('recipe_assets')
    .select('id, recipe_id, asset_kind, created_at')
    .eq('family_id', familyId)
    .in('recipe_id', [...recipeIds])
    .eq('processing_status', 'available')
    .in('asset_kind', [...RECIPE_COVER_ASSET_KINDS])
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error || !data) {
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data) {
    const recipeId = row.recipe_id as string;
    if (!map.has(recipeId)) {
      map.set(recipeId, row.id as string);
    }
  }
  return map;
}
