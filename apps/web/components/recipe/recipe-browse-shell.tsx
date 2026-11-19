'use client';

import type { SearchRecipesInput } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';

import { RecipeCategoryChips } from '@/components/recipe/recipe-category-chips';
import { RecipeSearchActiveChips } from '@/components/recipe/recipe-search-active-chips';
import {
  RecipeSearchForm,
  type RecipeSearchContributorOption,
  type RecipeSearchFormValues,
} from '@/components/recipe/recipe-search-form';
import { ResultsAnnouncer } from '@/components/recipe/recipe-results-announcer';
import { parseRecipeSearchFromUrl } from '@/lib/recipe-search-params';
import { browseFieldsFromUrl } from '@/lib/search-as-you-type';

type Props = Readonly<{
  familyId: string;
  contributorOptions: readonly RecipeSearchContributorOption[];
  categories: readonly string[];
  tags: readonly string[];
  languages: readonly string[];
  /** Shown when the member list could not be loaded (the author filter is then empty). */
  membersError: string | null;
  children: ReactNode;
}>;

function formValuesOf(input: SearchRecipesInput): RecipeSearchFormValues {
  return {
    ...(input.anyText ? { anyText: input.anyText } : {}),
    ...(input.ingredient ? { ingredient: input.ingredient } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.tag ? { tag: input.tag } : {}),
    ...(input.language ? { language: input.language } : {}),
    ...(input.createdBy ? { createdBy: input.createdBy } : {}),
    ...(input.sort ? { sort: input.sort } : {}),
    ...(input.includeArchived ? { includeArchived: true } : {}),
  };
}

/**
 * Everything above the results on the Recipes page: search box, filters, category chips and the
 * chips for active filters. It sits in the recipe-list layout, so it stays mounted while the page
 * below it (the results) is replaced on every search. It also owns one polite live region that
 * reads out the new result count after a search.
 */
export function RecipeBrowseShell({
  familyId,
  contributorOptions,
  categories,
  tags,
  languages,
  membersError,
  children,
}: Props) {
  const t = useTranslations('recipes.filters');
  const searchParams = useSearchParams();
  const urlFields = browseFieldsFromUrl(searchParams);
  const parsed = parseRecipeSearchFromUrl(familyId, Object.fromEntries(searchParams.entries()));

  return (
    <ResultsAnnouncer>
      <RecipeSearchForm
        familyId={familyId}
        urlFields={urlFields}
        contributorOptions={contributorOptions}
        categories={categories}
        tags={tags}
        languages={languages}
      />
      {parsed.input ? (
        <RecipeCategoryChips
          familyId={familyId}
          searchInput={parsed.input}
          categories={categories}
          label={t('categoriesLabel')}
          allLabel={t('anyCategory')}
          selectedLabel={t('selected')}
        />
      ) : null}
      {parsed.input ? (
        <RecipeSearchActiveChips
          familyId={familyId}
          values={formValuesOf(parsed.input)}
          contributorOptions={contributorOptions}
        />
      ) : null}
      {membersError ? (
        <p className="text-sm text-destructive" role="alert">
          {membersError}
        </p>
      ) : null}
      {children}
    </ResultsAnnouncer>
  );
}
