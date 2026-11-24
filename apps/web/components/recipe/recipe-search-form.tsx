'use client';

import type { RecipeSearchSort } from '@family-cookbook/contracts';
import { ChevronDown, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState, useTransition } from 'react';

import { DisabledReason } from '@/components/product/disabled-reason';
import { FormField } from '@/components/product/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link, useRouter } from '@/i18n/navigation';
import { languageLabel } from '@/lib/language-label';
import {
  browseQueryString,
  SEARCH_DEBOUNCE_MS,
  searchTrigger,
  type BrowseFields,
} from '@/lib/search-as-you-type';
import { cn } from '@/lib/utils';

export type RecipeSearchContributorOption = Readonly<{
  userId: string;
  label: string;
}>;

export type RecipeSearchFormValues = Readonly<{
  /** Text typed in the search box: matches title, description, category and ingredient names. */
  anyText?: string;
  ingredient?: string;
  category?: string;
  tag?: string;
  language?: string;
  createdBy?: string;
  sort?: RecipeSearchSort;
  includeArchived?: boolean;
}>;

type Filters = Omit<BrowseFields, 'query' | 'ingredient'>;

type Props = Readonly<{
  familyId: string;
  /** What the address bar says right now. The form follows it when it changes elsewhere. */
  urlFields: BrowseFields;
  contributorOptions: readonly RecipeSearchContributorOption[];
  /** Values the family really uses (see `listRecipeBrowseOptions`). */
  categories: readonly string[];
  tags: readonly string[];
  languages: readonly string[];
}>;

const selectClass =
  'flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** The current value stays selectable even if the family no longer uses it. */
function withCurrent(options: readonly string[], current: string | undefined): string[] {
  const trimmed = current?.trim();
  if (!trimmed) {
    return [...options];
  }
  const known = options.some((option) => option.toLowerCase() === trimmed.toLowerCase());
  return known ? [...options] : [...options, trimmed];
}

function matchOption(options: readonly string[], value: string): string {
  const wanted = value.trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === wanted) ?? '';
}

function filtersOf(fields: BrowseFields): Filters {
  return {
    category: fields.category,
    tag: fields.tag,
    language: fields.language,
    createdBy: fields.createdBy,
    sort: fields.sort,
    includeArchived: fields.includeArchived,
  };
}

/**
 * Search box and filters. Nothing needs a confirm button: text searches 500 ms after typing stops
 * (2 or more characters), and a filter applies as soon as it is chosen. The form lives in the
 * recipe-list layout, so it keeps focus and the open Filters panel while results change.
 */
export function RecipeSearchForm({
  familyId,
  urlFields,
  contributorOptions,
  categories,
  tags,
  languages,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('recipes.filters');
  const tSort = useTranslations('recipes.sort');
  const panelId = useId();
  const queryHintId = useId();
  const router = useRouter();
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  const urlQuery = browseQueryString(urlFields);
  const [text, setText] = useState(urlFields.query);
  const [filters, setFilters] = useState<Filters>(() => filtersOf(urlFields));
  const [composing, setComposing] = useState(false);
  // What this form last put into the address: the full query string, the text it used and the
  // filters it used.
  const lastPushed = useRef(urlQuery);
  const appliedText = useRef(urlFields.query);
  const appliedFilters = useRef(JSON.stringify(filtersOf(urlFields)));
  // Addresses this form asked for that have not shown up yet, oldest first. An older one can
  // still arrive after a newer one was asked for (two filters picked quickly); it is ours, so it
  // must not reset the controls. Any other address came from elsewhere (a chip, "Clear filters",
  // Back) and the controls follow it.
  const inFlight = useRef<string[]>([]);

  useEffect(() => {
    const ours = inFlight.current.indexOf(urlQuery);
    if (ours !== -1) {
      inFlight.current = inFlight.current.slice(ours + 1);
      return;
    }
    if (urlQuery === lastPushed.current) {
      return;
    }
    inFlight.current = [];
    lastPushed.current = urlQuery;
    appliedText.current = urlFields.query;
    appliedFilters.current = JSON.stringify(filtersOf(urlFields));
    setText(urlFields.query);
    setFilters(filtersOf(urlFields));
  }, [urlQuery, urlFields]);

  const navigate = useCallback(
    (queryText: string, nextFilters: Filters) => {
      const target = browseQueryString({
        query: queryText,
        ingredient: urlFields.ingredient,
        ...nextFilters,
      });
      if (target === lastPushed.current) {
        return;
      }
      lastPushed.current = target;
      appliedText.current = queryText;
      appliedFilters.current = JSON.stringify(nextFilters);
      inFlight.current = [...inFlight.current, target].slice(-10);
      startTransition(() => {
        router.replace(`/f/${familyId}/recipes${target ? `?${target}` : ''}`);
      });
    },
    [familyId, router, urlFields.ingredient],
  );

  useEffect(() => {
    if (composing) {
      return;
    }
    const trigger = searchTrigger(text);
    const filtersChanged = JSON.stringify(filters) !== appliedFilters.current;
    const timer = setTimeout(
      () => {
        // One character is too short to search by typing: keep the text that is applied when
        // the timer fires (Enter may have applied it meanwhile).
        const queryText =
          trigger === 'search' ? text.trim() : trigger === 'clear' ? '' : appliedText.current;
        navigate(queryText, filters);
      },
      filtersChanged ? 0 : SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [text, filters, composing, navigate]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const categoryOptions = withCurrent(categories, filters.category);
  const tagOptions = withCurrent(tags, filters.tag);
  const languageOptions = withCurrent(languages, filters.language);

  return (
    <form
      method="get"
      role="search"
      aria-label={t('legend')}
      aria-busy={pending}
      className="space-y-3"
      onSubmit={(event) => {
        // Enter searches straight away, even for a single character.
        event.preventDefault();
        navigate(text.trim(), filters);
      }}
    >
      <div className="relative">
        <Label htmlFor="recipe-query" className="sr-only">
          {t('query')}
        </Label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id="recipe-query"
          name="query"
          type="search"
          enterKeyHint="search"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          aria-describedby={queryHintId}
          placeholder={t('queryPlaceholder')}
          autoComplete="off"
          maxLength={200}
          className="min-h-12 pl-10 text-base"
        />
      </div>

      <p id={queryHintId} className="text-sm text-muted-foreground">
        {t('queryHint')}
      </p>

      {urlFields.ingredient ? (
        <input type="hidden" name="ingredient" value={urlFields.ingredient} />
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="min-h-11 gap-1"
        aria-expanded={filtersExpanded}
        aria-controls={panelId}
        onClick={() => setFiltersExpanded((open) => !open)}
      >
        {t('toggleLabel')}
        <ChevronDown
          className={cn('size-4 transition-transform', filtersExpanded && 'rotate-180')}
          aria-hidden
        />
      </Button>

      <div
        id={panelId}
        hidden={!filtersExpanded}
        className="space-y-4 rounded-xl border border-border bg-surface-raised p-4"
      >
        <p className="text-sm text-muted-foreground">{t('panelHint')}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="recipe-category" label={t('category')}>
            <select
              name="category"
              value={matchOption(categoryOptions, filters.category)}
              onChange={(event) => setFilter('category', event.target.value)}
              className={selectClass}
            >
              <option value="">{t('anyCategory')}</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="recipe-tag" label={t('tag')}>
            <select
              name="tag"
              value={matchOption(tagOptions, filters.tag)}
              onChange={(event) => setFilter('tag', event.target.value)}
              className={selectClass}
            >
              <option value="">{t('anyTag')}</option>
              {tagOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="recipe-language" label={t('language')}>
            <select
              name="language"
              value={matchOption(languageOptions, filters.language)}
              onChange={(event) => setFilter('language', event.target.value)}
              className={selectClass}
            >
              <option value="">{t('anyLanguage')}</option>
              {languageOptions.map((tag) => (
                <option key={tag} value={tag}>
                  {languageLabel(tag, locale)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="recipe-contributor" label={t('contributor')} hint={t('contributorHint')}>
            <select
              name="createdBy"
              value={filters.createdBy}
              onChange={(event) => setFilter('createdBy', event.target.value)}
              className={selectClass}
            >
              <option value="">{t('contributorAny')}</option>
              {contributorOptions.map((option) => (
                <option key={option.userId} value={option.userId}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="recipe-sort" label={t('sort')}>
            <select
              name="sort"
              value={filters.sort}
              onChange={(event) => setFilter('sort', event.target.value)}
              className={selectClass}
            >
              <option value="updatedAt">{tSort('updatedAt')}</option>
              <option value="createdAt">{tSort('createdAt')}</option>
              <option value="title">{tSort('title')}</option>
            </select>
          </FormField>
          <div className="flex min-h-11 items-center gap-2 text-sm sm:self-end">
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                name="includeArchived"
                value="true"
                checked={filters.includeArchived}
                onChange={(event) => setFilter('includeArchived', event.target.checked)}
                className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span>{t('includeArchived')}</span>
            </label>
          </div>
        </div>
        {urlQuery === '' ? (
          <div className="space-y-2">
            <Button type="button" variant="outline" className="min-h-11" disabled>
              {t('clear')}
            </Button>
            <DisabledReason show>{t('clearDisabled')}</DisabledReason>
          </div>
        ) : (
          <Button type="button" variant="outline" className="min-h-11" asChild>
            <Link href={`/f/${familyId}/recipes`}>{t('clear')}</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
