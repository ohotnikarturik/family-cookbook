import {
  RECIPE_ASSET_IMAGE_MAX_BYTES,
  RECIPE_ASSET_PDF_MAX_BYTES,
  RECIPE_MEDIA_BUCKET_ID,
  type RecipeAssetMimeType,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

function maxBytes(mimeType: RecipeAssetMimeType): number {
  return mimeType === 'application/pdf' ? RECIPE_ASSET_PDF_MAX_BYTES : RECIPE_ASSET_IMAGE_MAX_BYTES;
}

export async function fetchStorageObjectForValidation(
  client: AppSupabaseClient,
  bucketId: string,
  objectPath: string,
  declaredMimeType: RecipeAssetMimeType,
): Promise<
  { ok: true; bytes: Uint8Array } | { ok: false; error: 'missing' | 'oversize' | 'read_failed' }
> {
  if (bucketId !== RECIPE_MEDIA_BUCKET_ID) {
    return { ok: false, error: 'read_failed' };
  }

  const { data, error } = await client.storage.from(bucketId).download(objectPath);

  if (error || !data) {
    return { ok: false, error: 'missing' };
  }

  const buffer = new Uint8Array(await data.arrayBuffer());
  if (buffer.length > maxBytes(declaredMimeType)) {
    return { ok: false, error: 'oversize' };
  }

  return { ok: true, bytes: buffer };
}
