import { randomUUID } from 'node:crypto';

export function buildRecipeAssetObjectPath(
  familyId: string,
  recipeId: string,
  assetId: string,
): string {
  return `${familyId}/${recipeId}/${assetId}/${randomUUID()}`;
}
