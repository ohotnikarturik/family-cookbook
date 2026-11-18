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

/** Total cooking time in minutes (prep + cook). Missing or zero values count as nothing. */
export function recipeTotalMinutes(
  recipe: Readonly<{
    prepMinutes?: number | null | undefined;
    cookMinutes?: number | null | undefined;
  }>,
): number | null {
  const prep = recipe.prepMinutes ?? 0;
  const cook = recipe.cookMinutes ?? 0;
  const total = Math.max(prep, 0) + Math.max(cook, 0);
  return total > 0 ? total : null;
}

/** Minutes as whole hours plus remaining minutes. Missing, zero and negative values give null. */
export function splitDuration(
  minutes: number | null | undefined,
): Readonly<{ hours: number; minutes: number }> | null {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }
  const whole = Math.round(minutes);
  return { hours: Math.floor(whole / 60), minutes: whole % 60 };
}

/**
 * Text for a duration such as "45 min", "2 h" or "1 h 5 min". The wording (and number formatting)
 * comes from the caller's message catalog so every locale stays in one place.
 */
export function formatDuration(
  minutes: number | null | undefined,
  labels: Readonly<{
    minutes: (minutes: number) => string;
    hours: (hours: number) => string;
    hoursMinutes: (hours: number, minutes: number) => string;
  }>,
): string | null {
  const parts = splitDuration(minutes);
  if (parts === null) {
    return null;
  }
  if (parts.hours === 0) {
    return labels.minutes(parts.minutes);
  }
  if (parts.minutes === 0) {
    return labels.hours(parts.hours);
  }
  return labels.hoursMinutes(parts.hours, parts.minutes);
}

/** One short line for a card: total time and servings. Zero and missing values are left out. */
export function recipeMetaLabel(
  recipe: Readonly<{
    prepMinutes?: number | null | undefined;
    cookMinutes?: number | null | undefined;
    servings?: number | null | undefined;
  }>,
  labels: Readonly<{
    totalTime: (minutes: number) => string;
    servings: (servings: number) => string;
  }>,
): string | null {
  const parts: string[] = [];
  const total = recipeTotalMinutes(recipe);
  if (total !== null) {
    parts.push(labels.totalTime(total));
  }
  if (typeof recipe.servings === 'number' && recipe.servings > 0) {
    parts.push(labels.servings(recipe.servings));
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Updated" text for a card: relative ("2 hours ago", "3 days ago") within a week, otherwise the date
 * alone. Never shows a time of day.
 */
export function recipeUpdatedLabel(
  updatedAt: string | Date,
  now: Date,
  formats: Readonly<{
    relative: (updated: Date, now: Date) => string;
    date: (date: Date) => string;
  }>,
): string {
  const updated = new Date(updatedAt);
  const days = Math.floor((now.getTime() - updated.getTime()) / DAY_MS);
  if (days >= 0 && days <= 7) {
    return formats.relative(updated, now);
  }
  return formats.date(updated);
}

export function recipeContentLang(summary: RecipeSummary, uiLocale: string): string | undefined {
  const base = summary.sourceLanguage.split('-')[0]?.toLowerCase();
  const ui = uiLocale.split('-')[0]?.toLowerCase();
  if (base && ui && base !== ui) {
    return summary.sourceLanguage;
  }
  return undefined;
}
