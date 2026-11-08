import { RECIPE_MEDIA_BUCKET_ID } from '@family-cookbook/contracts';
import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const pendingAssetRowSchema = z.object({
  id: z.uuid(),
  family_id: z.uuid(),
  recipe_id: z.uuid(),
  uploaded_by: z.uuid(),
  bucket_id: z.string(),
  object_path: z.string(),
  detected_mime_type: z.string(),
  byte_size: z.coerce.number(),
  processing_status: z.enum(['pending', 'quarantined', 'available', 'rejected']),
});

export type PendingRecipeAsset = {
  id: string;
  familyId: string;
  recipeId: string;
  uploadedBy: string;
  bucketId: string;
  objectPath: string;
  declaredMimeType: string;
  declaredByteSize: number;
};

export async function getPendingRecipeAsset(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
  assetId: string,
): Promise<
  | { ok: true; asset: PendingRecipeAsset }
  | { ok: false; error: 'not_found' | 'query_failed' | 'invalid_row' }
> {
  const { data, error } = await client
    .from('recipe_assets')
    .select(
      'id, family_id, recipe_id, uploaded_by, bucket_id, object_path, detected_mime_type, byte_size, processing_status',
    )
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

  const parsed = pendingAssetRowSchema.safeParse(data);
  if (
    !parsed.success ||
    parsed.data.processing_status !== 'pending' ||
    parsed.data.bucket_id !== RECIPE_MEDIA_BUCKET_ID
  ) {
    return { ok: false, error: 'not_found' };
  }

  return {
    ok: true,
    asset: {
      id: parsed.data.id,
      familyId: parsed.data.family_id,
      recipeId: parsed.data.recipe_id,
      uploadedBy: parsed.data.uploaded_by,
      bucketId: parsed.data.bucket_id,
      objectPath: parsed.data.object_path,
      declaredMimeType: parsed.data.detected_mime_type,
      declaredByteSize: parsed.data.byte_size,
    },
  };
}
