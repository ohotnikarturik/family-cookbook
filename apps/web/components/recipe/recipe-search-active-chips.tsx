'use client';

import type { RecipeSearchSort } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';

import type {
  RecipeSearchContributorOption,
  RecipeSearchFormValues,
} from '@/components/recipe/recipe-search-form';
import { Link } from '@/i18n/navigation';
import { buildRecipeSearchQuery } from '@/lib/build-recipe-search-query';
import { buildRecipeSearchChips } from '@/lib/recipe-search-chips';

type Props = Readonly<{
  familyId: string;
  values: RecipeSearchFormValues;
  contributorOptions: readonly RecipeSearchContributorOption[];
}>;

export function RecipeSearchActiveChips({ familyId, values, contributorOptions }: Props) {
  const t = useTranslations('recipes.filters');
  const tSort = useTranslations('recipes.sort');
  const names = new Map(contributorOptions.map((option) => [option.userId, option.label]));

  const chips = buildRecipeSearchChips(values, {
    query: t('query'),
    ingredient: t('ingredient'),
    category: t('category'),
    tag: t('tag'),
    language: t('language'),
    contributor: t('contributor'),
    includeArchived: t('includeArchived'),
    sort: t('sort'),
    sortValue: (sort: Exclude<RecipeSearchSort, 'updatedAt'>) => tSort(sort),
    contributorName: (userId) => names.get(userId) ?? userId,
  });

  if (chips.length === 0) {
    return null;
  }

  return (
    <ul aria-label={t('activeLabel')} className="flex list-none flex-wrap gap-2 p-0">
      {chips.map((chip) => {
        const next: Record<string, unknown> = { ...values, familyId };
        if (chip.omit === 'includeArchived') {
          next.includeArchived = false;
        } else {
          delete next[chip.omit];
        }
        const href = `/f/${familyId}/recipes${buildRecipeSearchQuery(next as Parameters<typeof buildRecipeSearchQuery>[0])}`;
        return (
          <li key={chip.key}>
            <Link
              href={href}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{chip.label}</span>
              <span className="text-muted-foreground" aria-hidden>
                ×
              </span>
              <span className="sr-only">{t('removeChip', { value: chip.label })}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
