import {
  archiveRecipeInputSchema,
  createRecipeInputSchema,
  getRecipeHistoryInputSchema,
  getRecipeInputSchema,
  restoreRecipeInputSchema,
  searchRecipesInputSchema,
  updateRecipeInputSchema,
} from '@family-cookbook/contracts';

export function parseSearchRecipesMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return searchRecipesInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return searchRecipesInputSchema.safeParse({
    familyId: o['family_id'],
    query: o['query'],
    ingredient: o['ingredient'],
    category: o['category'],
    tag: o['tag'],
    language: o['language'],
    createdBy: o['created_by'],
    includeArchived: o['include_archived'],
    limit: o['limit'],
    cursor: o['cursor'],
  });
}

export function parseGetRecipeMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return getRecipeInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return getRecipeInputSchema.safeParse({
    familyId: o['family_id'],
    recipeId: o['recipe_id'],
    language: o['language'],
  });
}

export function parseGetRecipeHistoryMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return getRecipeHistoryInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return getRecipeHistoryInputSchema.safeParse({
    familyId: o['family_id'],
    recipeId: o['recipe_id'],
    limit: o['limit'],
    cursor: o['cursor'],
  });
}

export function parseCreateRecipeMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return createRecipeInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return createRecipeInputSchema.safeParse({
    familyId: o['family_id'],
    recipe: o['recipe'],
  });
}

export function parseUpdateRecipeMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return updateRecipeInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return updateRecipeInputSchema.safeParse({
    familyId: o['family_id'],
    recipeId: o['recipe_id'],
    expectedVersion: o['expected_version'],
    recipe: o['patch'] ?? o['recipe'],
  });
}

export function parseArchiveRecipeMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return archiveRecipeInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return archiveRecipeInputSchema.safeParse({
    familyId: o['family_id'],
    recipeId: o['recipe_id'],
    expectedVersion: o['expected_version'],
    confirm: o['confirm'],
  });
}

export function parseRestoreRecipeMcpInput(raw: unknown) {
  if (typeof raw !== 'object' || raw === null) {
    return restoreRecipeInputSchema.safeParse(raw);
  }
  const o = raw as Record<string, unknown>;
  return restoreRecipeInputSchema.safeParse({
    familyId: o['family_id'],
    recipeId: o['recipe_id'],
    expectedVersion: o['expected_version'],
  });
}
