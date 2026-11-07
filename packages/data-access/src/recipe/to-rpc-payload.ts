import type { CreateRecipePayload, UpdateRecipePayload } from '@family-cookbook/contracts';

function mapTagAttach(tag: CreateRecipePayload['tags'][number]): Record<string, string> {
  if ('tagId' in tag) {
    return { tagId: tag.tagId };
  }
  return { name: tag.name };
}

export function recipePayloadToRpcJson(
  payload: CreateRecipePayload | UpdateRecipePayload,
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    title: payload.title,
    sourceLanguage: payload.sourceLanguage,
    description: payload.description ?? null,
    category: payload.category ?? null,
    servings: payload.servings ?? null,
    prepMinutes: payload.prepMinutes ?? null,
    cookMinutes: payload.cookMinutes ?? null,
    notes: payload.notes ?? null,
    ingredients: payload.ingredients,
    steps: payload.steps,
    tags: payload.tags.map(mapTagAttach),
    translations: payload.translations,
    ingredientTranslations: payload.ingredientTranslations,
    stepTranslations: payload.stepTranslations,
  };

  if ('changeSummary' in payload) {
    base.changeSummary = payload.changeSummary ?? null;
  }

  return base;
}
