import {
  recipeAssetDownloadResultSchema,
  type RecipeAssetDownloadResult,
} from '@family-cookbook/contracts';

export type AssetDownloadAccept = 'image' | 'pdf';

export function isDisplayableAssetDownload(
  result: RecipeAssetDownloadResult,
  accept: AssetDownloadAccept,
): boolean {
  if (accept === 'image') {
    return (
      result.disposition === 'inline' &&
      (result.detectedMimeType === 'image/jpeg' ||
        result.detectedMimeType === 'image/png' ||
        result.detectedMimeType === 'image/webp')
    );
  }
  return result.disposition === 'attachment' && result.detectedMimeType === 'application/pdf';
}

export async function fetchRecipeAssetDownloadUrl(
  familyId: string,
  recipeId: string,
  assetId: string,
): Promise<RecipeAssetDownloadResult> {
  const response = await fetch(
    `/api/families/${encodeURIComponent(familyId)}/recipes/${encodeURIComponent(recipeId)}/assets/${encodeURIComponent(assetId)}/download-url`,
    { method: 'GET', credentials: 'same-origin', cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error(`download_url_${response.status}`);
  }
  const parsed = recipeAssetDownloadResultSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error('download_url_invalid');
  }
  return parsed.data;
}
