import type { UpsertRecipeTranslationPayload } from '@family-cookbook/contracts';

export function translationPayloadToRpcJson(
  payload: UpsertRecipeTranslationPayload,
): Record<string, unknown> {
  return {
    title: payload.title,
    description: payload.description ?? null,
    notes: payload.notes ?? null,
    reviewStatus: payload.reviewStatus ?? 'unreviewed',
    changeSummary: payload.changeSummary ?? null,
    ingredients: payload.ingredients.map((item) => ({
      position: item.ingredientPosition,
      name: item.name,
      notes: item.notes ?? null,
    })),
    steps: payload.steps.map((item) => ({
      position: item.stepPosition,
      instruction: item.instruction,
    })),
  };
}
