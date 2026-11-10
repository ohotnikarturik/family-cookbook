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

export function recipeTimingLabel(
  recipe: Readonly<{
    prepMinutes?: number | null | undefined;
    cookMinutes?: number | null | undefined;
    servings?: number | null | undefined;
  }>,
  labels: Readonly<{
    prep: (minutes: number) => string;
    cook: (minutes: number) => string;
    servings: (servings: number) => string;
  }>,
): string | null {
  const parts: string[] = [];
  if (typeof recipe.prepMinutes === 'number') {
    parts.push(labels.prep(recipe.prepMinutes));
  }
  if (typeof recipe.cookMinutes === 'number') {
    parts.push(labels.cook(recipe.cookMinutes));
  }
  if (typeof recipe.servings === 'number') {
    parts.push(labels.servings(recipe.servings));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function recipeContentLang(summary: RecipeSummary, uiLocale: string): string | undefined {
  const base = summary.sourceLanguage.split('-')[0]?.toLowerCase();
  const ui = uiLocale.split('-')[0]?.toLowerCase();
  if (base && ui && base !== ui) {
    return summary.sourceLanguage;
  }
  return undefined;
}
