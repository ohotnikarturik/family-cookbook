import { z } from 'zod';

import { familyIdSchema } from './family.js';
import { recipeIdSchema } from './recipe-core.js';

export const RECIPE_MEDIA_BUCKET_ID = 'family-recipe-media';

export const RECIPE_ASSET_IMAGE_MAX_BYTES = 15 * 1024 * 1024;
export const RECIPE_ASSET_PDF_MAX_BYTES = 25 * 1024 * 1024;
export const RECIPE_ASSETS_PER_RECIPE_MAX = 10;

export const RECIPE_ASSET_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const recipeAssetMimeTypeSchema = z.enum(RECIPE_ASSET_ALLOWED_MIME_TYPES);

export type RecipeAssetMimeType = z.infer<typeof recipeAssetMimeTypeSchema>;

export const assetKindSchema = z.enum([
  'original_photo',
  'original_document',
  'recipe_photo',
  'step_photo',
]);

export type AssetKind = z.infer<typeof assetKindSchema>;

export const assetStatusSchema = z.enum(['pending', 'quarantined', 'available', 'rejected']);

export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const recipeAssetIdSchema = z.uuid();

function hasUnsafeFilenameCharacter(value: string): boolean {
  if (value.includes('\\') || value.includes('/')) {
    return true;
  }
  for (const character of value) {
    const code = character.codePointAt(0);
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) {
      return true;
    }
  }
  return false;
}

const originalFilenameSchema = z
  .string()
  .trim()
  .min(1)
  .max(256)
  .refine((value) => !hasUnsafeFilenameCharacter(value), {
    message: 'originalFilename has unsafe characters',
  })
  .nullable()
  .optional();

export const recipeAssetSummarySchema = z.object({
  id: recipeAssetIdSchema,
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  uploadedBy: z.uuid(),
  bucketId: z.string().min(1).max(120),
  objectPath: z.string().min(1).max(512),
  assetKind: assetKindSchema,
  originalFilename: z.string().nullable(),
  detectedMimeType: recipeAssetMimeTypeSchema,
  byteSize: z.number().int().min(0),
  checksumSha256: z.string().regex(/^([0-9a-f]{64}|)$/),
  processingStatus: assetStatusSchema,
  createdAt: z.string(),
  availableAt: z.string().nullable(),
});

export type RecipeAssetSummary = z.infer<typeof recipeAssetSummarySchema>;

export const createRecipeUploadSlotInputSchema = z
  .object({
    familyId: familyIdSchema,
    recipeId: recipeIdSchema,
    assetKind: assetKindSchema,
    declaredMimeType: recipeAssetMimeTypeSchema,
    declaredByteSize: z.number().int().min(1),
    originalFilename: originalFilenameSchema,
  })
  .superRefine((value, ctx) => {
    const maxBytes =
      value.declaredMimeType === 'application/pdf'
        ? RECIPE_ASSET_PDF_MAX_BYTES
        : RECIPE_ASSET_IMAGE_MAX_BYTES;
    if (value.declaredByteSize > maxBytes) {
      ctx.addIssue({
        code: 'custom',
        message: 'declaredByteSize exceeds allowlist',
        path: ['declaredByteSize'],
      });
    }
    const photoKind =
      value.assetKind === 'original_photo' ||
      value.assetKind === 'recipe_photo' ||
      value.assetKind === 'step_photo';
    if (value.assetKind === 'original_document' && value.declaredMimeType !== 'application/pdf') {
      ctx.addIssue({
        code: 'custom',
        message: 'original documents must be PDF',
        path: ['declaredMimeType'],
      });
    }
    if (photoKind && value.declaredMimeType === 'application/pdf') {
      ctx.addIssue({
        code: 'custom',
        message: 'photos must be images',
        path: ['declaredMimeType'],
      });
    }
  });

export type CreateRecipeUploadSlotInput = z.infer<typeof createRecipeUploadSlotInputSchema>;

export const finalizeRecipeUploadInputSchema = z.object({
  familyId: familyIdSchema,
  recipeId: recipeIdSchema,
  assetId: recipeAssetIdSchema,
});

export type FinalizeRecipeUploadInput = z.infer<typeof finalizeRecipeUploadInputSchema>;

export const createRecipeUploadSlotResultSchema = z.object({
  assetId: recipeAssetIdSchema,
  objectPath: z.string().min(1).max(512),
  signedUploadUrl: z.url(),
  expiresAt: z.string(),
});

export type CreateRecipeUploadSlotResult = z.infer<typeof createRecipeUploadSlotResultSchema>;

export const finalizeRecipeUploadResultSchema = z.object({
  assetId: recipeAssetIdSchema,
  processingStatus: z.literal('available'),
  detectedMimeType: recipeAssetMimeTypeSchema,
  byteSize: z.number().int().min(1),
  checksumSha256: z.string().regex(/^[0-9a-f]{64}$/),
});

export type FinalizeRecipeUploadResult = z.infer<typeof finalizeRecipeUploadResultSchema>;

export const RECIPE_UPLOAD_SIGNED_URL_TTL_SECONDS = 600;
