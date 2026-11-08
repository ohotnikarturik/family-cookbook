import { RECIPE_MEDIA_BUCKET_ID, type RecipeAssetSummary } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { recipeAssetObjectPathMatches } from './build-object-path.js';
import { mapRecipeAssetRow, type RecipeAssetRow } from './map-recipe-asset-row.js';

const assetSelect =
  'id, family_id, recipe_id, uploaded_by, bucket_id, object_path, asset_kind, original_filename, detected_mime_type, byte_size, checksum_sha256, processing_status, created_at, available_at';

export async function getAvailableRecipeAsset(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
  assetId: string,
): Promise<
  | { ok: true; asset: RecipeAssetSummary }
  | { ok: false; error: 'not_found' | 'query_failed' | 'invalid_row' | 'unavailable' }
> {
  const { data, error } = await client
    .from('recipe_assets')
    .select(assetSelect)
    .eq('family_id', familyId)
    .eq('recipe_id', recipeId)
    .eq('id', assetId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  const mapped = mapRecipeAssetRow(data as RecipeAssetRow);
  if (!mapped) {
    return { ok: false, error: 'invalid_row' };
  }
  if (
    mapped.bucketId !== RECIPE_MEDIA_BUCKET_ID ||
    mapped.processingStatus !== 'available' ||
    !recipeAssetObjectPathMatches(mapped.objectPath, familyId, recipeId, assetId)
  ) {
    return { ok: false, error: 'unavailable' };
  }

  return { ok: true, asset: mapped };
}
