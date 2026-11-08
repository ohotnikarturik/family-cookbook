import { randomUUID } from 'node:crypto';

const OBJECT_FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function buildRecipeAssetObjectPath(
  familyId: string,
  recipeId: string,
  assetId: string,
): string {
  return `${familyId}/${recipeId}/${assetId}/${randomUUID()}`;
}

export function recipeAssetObjectPathMatches(
  objectPath: string,
  familyId: string,
  recipeId: string,
  assetId: string,
): boolean {
  const prefix = `${familyId}/${recipeId}/${assetId}/`;
  if (!objectPath.startsWith(prefix)) {
    return false;
  }
  return OBJECT_FILE_ID.test(objectPath.slice(prefix.length));
}
