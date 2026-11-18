'use client';

import type { RecipeSearchSort } from '@family-cookbook/contracts';
import { ChevronDown, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';

import { FormField } from '@/components/product/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';
import { languageLabel } from '@/lib/language-label';
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

type Props = Readonly<{
  familyId: string;
  defaultValues: RecipeSearchFormValues;
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

export function RecipeSearchForm({
  familyId,
  defaultValues,
  contributorOptions,
  categories,
  tags,
  languages,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('recipes.filters');
  const tSort = useTranslations('recipes.sort');
  const panelId = useId();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const categoryOptions = withCurrent(categories, defaultValues.category);
  const tagOptions = withCurrent(tags, defaultValues.tag);
  const languageOptions = withCurrent(languages, defaultValues.language);
  const currentCategory = categoryOptions.find(
    (option) => option.toLowerCase() === defaultValues.category?.trim().toLowerCase(),
  );
  const currentTag = tagOptions.find(
    (option) => option.toLowerCase() === defaultValues.tag?.trim().toLowerCase(),
  );

  return (
    <form method="get" role="search" aria-label={t('legend')} className="space-y-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
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
            defaultValue={defaultValues.anyText ?? ''}
            placeholder={t('queryPlaceholder')}
            autoComplete="off"
            maxLength={200}
            className="min-h-12 pl-10 text-base"
          />
        </div>
        <Button type="submit" className="min-h-12 shrink-0 px-5">
          {t('submit')}
        </Button>
      </div>

      {defaultValues.ingredient ? (
        <input type="hidden" name="ingredient" value={defaultValues.ingredient} />
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

      {/* Hidden fields are still submitted, so Search keeps the chosen filters. */}
      <div
        id={panelId}
        hidden={!filtersExpanded}
        className="space-y-4 rounded-xl border border-border bg-surface-raised p-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="recipe-category" label={t('category')}>
            <select name="category" defaultValue={currentCategory ?? ''} className={selectClass}>
              <option value="">{t('anyCategory')}</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="recipe-tag" label={t('tag')}>
            <select name="tag" defaultValue={currentTag ?? ''} className={selectClass}>
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
              defaultValue={defaultValues.language ?? ''}
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
              defaultValue={defaultValues.createdBy ?? ''}
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
              defaultValue={defaultValues.sort ?? 'updatedAt'}
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
                defaultChecked={defaultValues.includeArchived === true}
                className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span>{t('includeArchived')}</span>
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="secondary" className="min-h-11">
            {t('submit')}
          </Button>
          <Button type="button" variant="outline" className="min-h-11" asChild>
            <Link href={`/f/${familyId}/recipes`}>{t('clear')}</Link>
          </Button>
        </div>
      </div>
    </form>
  );
}
