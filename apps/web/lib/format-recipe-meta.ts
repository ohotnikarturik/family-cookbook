import type { RecipeSummary } from '@family-cookbook/contracts';

export function formatIngredientAmount(ingredient: {
  quantityText: string | null;
  quantityLabel: string | null;
  unit: string | null;
}): string | null {
  if (ingredient.quantityText) {
    return ingredient.quantityText;
  }
  if (ingredient.quantityLabel && ingredient.unit) {
    return `${ingredient.quantityLabel} ${ingredient.unit}`;
  }
  return ingredient.quantityLabel ?? ingredient.unit;
}

export function recipeContentLang(summary: RecipeSummary, uiLocale: string): string | undefined {
  const base = summary.sourceLanguage.split('-')[0]?.toLowerCase();
  const ui = uiLocale.split('-')[0]?.toLowerCase();
  if (base && ui && base !== ui) {
    return summary.sourceLanguage;
  }
  return undefined;
}
