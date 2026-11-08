import { randomUUID } from 'node:crypto';

import {
  RECIPE_MEDIA_BUCKET_ID,
  type AssetKind,
  type RecipeAssetMimeType,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import { buildRecipeAssetObjectPath } from './build-object-path.js';

export type InsertPendingAssetInput = {
  familyId: string;
  recipeId: string;
  uploadedBy: string;
  assetKind: AssetKind;
  originalFilename: string | null;
  declaredMimeType: RecipeAssetMimeType;
  declaredByteSize: number;
};

export async function insertPendingRecipeAsset(
  client: AppSupabaseClient,
  input: InsertPendingAssetInput,
): Promise<
  | { ok: true; assetId: string; objectPath: string }
  | { ok: false; error: 'insert_failed' | 'limit_exceeded' }
> {
  const assetId = randomUUID();
  const objectPath = buildRecipeAssetObjectPath(input.familyId, input.recipeId, assetId);

  const { data, error } = await client
    .from('recipe_assets')
    .insert({
      id: assetId,
      family_id: input.familyId,
      recipe_id: input.recipeId,
      uploaded_by: input.uploadedBy,
      bucket_id: RECIPE_MEDIA_BUCKET_ID,
      object_path: objectPath,
      asset_kind: input.assetKind,
      original_filename: input.originalFilename,
      detected_mime_type: input.declaredMimeType,
      byte_size: input.declaredByteSize,
      checksum_sha256: '',
      processing_status: 'pending',
    })
    .select('id, object_path')
    .single();

  if (error) {
    if (error.code === '23514' && error.message?.includes('recipe asset limit')) {
      return { ok: false, error: 'limit_exceeded' };
    }
    return { ok: false, error: 'insert_failed' };
  }

  return {
    ok: true,
    assetId: data.id as string,
    objectPath: data.object_path as string,
  };
}
