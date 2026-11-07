export function isRecipeVersionConflict(expectedVersion: number, actualVersion: number): boolean {
  return expectedVersion !== actualVersion;
}

export function recipeVersionMatches(expectedVersion: number, actualVersion: number): boolean {
  return expectedVersion === actualVersion;
}
