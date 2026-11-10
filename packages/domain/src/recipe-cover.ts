/** Dish photos that may represent a recipe in browse cards and the detail hero. Step photos stay with their steps. */

export const RECIPE_COVER_ASSET_KINDS = ['recipe_photo', 'original_photo'] as const;

export type RecipeCoverAssetKind = (typeof RECIPE_COVER_ASSET_KINDS)[number];

const COVER_KINDS = new Set<string>(RECIPE_COVER_ASSET_KINDS);
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type RecipeCoverCandidate = Readonly<{
  id: string;
  assetKind: string;
  processingStatus: string;
  detectedMimeType?: string;
  createdAt: string;
}>;

/** Earliest available dish photo. Order is created time, then id, so the choice is stable. */
export function pickRecipeCoverAssetId(assets: readonly RecipeCoverCandidate[]): string | null {
  const ranked = assets.filter((asset) => {
    if (asset.processingStatus !== 'available' || !COVER_KINDS.has(asset.assetKind)) {
      return false;
    }
    if (asset.detectedMimeType !== undefined && !IMAGE_MIME_TYPES.has(asset.detectedMimeType)) {
      return false;
    }
    return true;
  });
  ranked.sort((left, right) => {
    const byTime = left.createdAt.localeCompare(right.createdAt);
    return byTime !== 0 ? byTime : left.id.localeCompare(right.id);
  });
  return ranked[0]?.id ?? null;
}
