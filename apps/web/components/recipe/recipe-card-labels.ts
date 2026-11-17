import { getFormatter, getTranslations } from 'next-intl/server';

import { recipeMetaLabel, recipeUpdatedLabel } from '@/lib/format-recipe-meta';
import type { RecipeSummary } from '@family-cookbook/contracts';

/** Labels shared by every list of recipe cards (Home and Recipes). Server-only. */
export async function getRecipeCardLabels(locale: string) {
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const format = await getFormatter({ locale });
  const now = new Date();
  return {
    updatedLabelFor: (recipe: RecipeSummary) =>
      t('list.updated', {
        date: recipeUpdatedLabel(recipe.updatedAt, now, {
          relative: (updated, at) => format.relativeTime(updated, at),
          date: (date) => format.dateTime(date, { dateStyle: 'medium' }),
        }),
      }),
    archivedLabel: t('list.archivedBadge'),
    imageLoadingLabel: t('list.imageLoading'),
    metaLabelFor: (recipe: RecipeSummary) =>
      recipeMetaLabel(recipe, {
        totalTime: (minutes) => t('list.totalMinutes', { minutes: format.number(minutes) }),
        servings: (servings) => t('list.servings', { servings: format.number(servings) }),
      }),
  };
}
