import type { RecipeAssetMimeType } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export async function updateRecipeAssetAfterValidation(
  client: AppSupabaseClient,
  assetId: string,
  familyId: string,
  update:
    | {
        outcome: 'available';
        detectedMimeType: RecipeAssetMimeType;
        byteSize: number;
        checksumSha256: string;
      }
    | { outcome: 'rejected' },
): Promise<{ ok: true } | { ok: false; error: 'update_failed' }> {
  const now = new Date().toISOString();
  const row =
    update.outcome === 'available'
      ? {
          processing_status: 'available' as const,
          detected_mime_type: update.detectedMimeType,
          byte_size: update.byteSize,
          checksum_sha256: update.checksumSha256,
          available_at: now,
        }
      : {
          processing_status: 'rejected' as const,
        };

  const { data, error } = await client
    .from('recipe_assets')
    .update(row)
    .eq('id', assetId)
    .eq('family_id', familyId)
    .eq('processing_status', 'pending')
    .select('id');

  if (error || !data || data.length !== 1) {
    return { ok: false, error: 'update_failed' };
  }

  return { ok: true };
}
