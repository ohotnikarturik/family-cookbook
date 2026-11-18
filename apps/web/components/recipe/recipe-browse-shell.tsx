'use client';

import type { SearchRecipesInput } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { RecipeCategoryChips } from '@/components/recipe/recipe-category-chips';
import { RecipeSearchActiveChips } from '@/components/recipe/recipe-search-active-chips';
import {
  RecipeSearchForm,
  type RecipeSearchContributorOption,
  type RecipeSearchFormValues,
} from '@/components/recipe/recipe-search-form';
import { parseRecipeSearchFromUrl } from '@/lib/recipe-search-params';
import { browseFieldsFromUrl } from '@/lib/search-as-you-type';

const AnnounceContext = createContext<(message: string) => void>(() => {});

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

  const [announcement, setAnnouncement] = useState('');
  const firstMessage = useRef<string | null>(null);
  const searched = useRef(false);
  const announce = useCallback((message: string) => {
    // The count on first load is on screen already; only read out what a search changed. (Effects
    // can run twice in development, so the first message is skipped by value, not by count.)
    if (firstMessage.current === null) {
      firstMessage.current = message;
      return;
    }
    if (!searched.current && message === firstMessage.current) {
      return;
    }
    searched.current = true;
    // A zero-width space makes an identical message count as new, so it is read again.
    setAnnouncement((current) => (current === message ? `${message}​` : message));
  }, []);

  return (
    <AnnounceContext.Provider value={announce}>
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
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {children}
    </AnnounceContext.Provider>
  );
}

/** Rendered by the results page: hands its result count to the live region above. */
export function AnnounceRecipeResults({ message }: Readonly<{ message: string }>) {
  const announce = useContext(AnnounceContext);
  useEffect(() => {
    announce(message);
  }, [announce, message]);
  return null;
}
