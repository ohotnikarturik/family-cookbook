import {
  assetKindSchema,
  assetStatusSchema,
  recipeAssetMimeTypeSchema,
  recipeAssetSummarySchema,
  type RecipeAssetSummary,
} from '@family-cookbook/contracts';

export type RecipeAssetRow = {
  id: string;
  family_id: string;
  recipe_id: string;
  uploaded_by: string;
  bucket_id: string;
  object_path: string;
  asset_kind: string;
  original_filename: string | null;
  detected_mime_type: string;
  byte_size: number | string;
  checksum_sha256: string;
  processing_status: string;
  created_at: string;
  available_at: string | null;
};

export function mapRecipeAssetRow(row: RecipeAssetRow): RecipeAssetSummary | null {
  const kind = assetKindSchema.safeParse(row.asset_kind);
  const status = assetStatusSchema.safeParse(row.processing_status);
  const mime = recipeAssetMimeTypeSchema.safeParse(row.detected_mime_type);
  if (!kind.success || !status.success || !mime.success) {
    return null;
  }
  const byteSize =
    typeof row.byte_size === 'number' ? row.byte_size : Number.parseInt(row.byte_size, 10);
  if (!Number.isFinite(byteSize)) {
    return null;
  }

  const candidate = {
    id: row.id,
    familyId: row.family_id,
    recipeId: row.recipe_id,
    uploadedBy: row.uploaded_by,
    bucketId: row.bucket_id,
    objectPath: row.object_path,
    assetKind: kind.data,
    originalFilename: row.original_filename,
    detectedMimeType: mime.data,
    byteSize,
    checksumSha256: row.checksum_sha256,
    processingStatus: status.data,
    createdAt: row.created_at,
    availableAt: row.available_at,
  };

  const parsed = recipeAssetSummarySchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}
