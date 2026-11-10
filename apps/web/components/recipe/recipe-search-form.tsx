'use client';

import type { RecipeSearchSort } from '@family-cookbook/contracts';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';

import { FormField } from '@/components/product/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export type RecipeSearchContributorOption = Readonly<{
  userId: string;
  label: string;
}>;

export type RecipeSearchFormValues = Readonly<{
  query?: string;
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
}>;

export function RecipeSearchForm({ familyId, defaultValues, contributorOptions }: Props) {
  const t = useTranslations('recipes.filters');
  const tSort = useTranslations('recipes.sort');
  const panelId = useId();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      if (media.matches) {
        setFiltersExpanded(true);
      }
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return (
    <form method="get" className="space-y-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-3">
        <FormField id="recipe-query-top" label={t('query')} className="min-w-[12rem] flex-1">
          <Input
            name="query"
            type="search"
            defaultValue={defaultValues.query ?? ''}
            autoComplete="off"
            className="min-h-11"
          />
        </FormField>
        <Button type="submit" variant="secondary" className="min-h-11 shrink-0">
          {t('apply')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-1 md:hidden"
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
      </div>

      <div id={panelId} className={cn('space-y-4', filtersExpanded ? 'block' : 'hidden md:block')}>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">{t('legend')}</legend>
          <FormField id="recipe-ingredient" label={t('ingredient')} hint={t('ingredientHint')}>
            <Input
              name="ingredient"
              defaultValue={defaultValues.ingredient ?? ''}
              autoComplete="off"
              className="min-h-11"
            />
          </FormField>
          <FormField id="recipe-category" label={t('category')}>
            <Input
              name="category"
              defaultValue={defaultValues.category ?? ''}
              autoComplete="off"
              className="min-h-11"
            />
          </FormField>
          <FormField id="recipe-tag" label={t('tag')}>
            <Input
              name="tag"
              defaultValue={defaultValues.tag ?? ''}
              autoComplete="off"
              className="min-h-11"
            />
          </FormField>
          <FormField id="recipe-language" label={t('language')}>
            <Input
              name="language"
              defaultValue={defaultValues.language ?? ''}
              placeholder={t('languagePlaceholder')}
              autoComplete="off"
              className="min-h-11"
            />
          </FormField>
          <FormField id="recipe-contributor" label={t('contributor')} hint={t('contributorHint')}>
            <select
              name="createdBy"
              defaultValue={defaultValues.createdBy ?? ''}
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="updatedAt">{tSort('updatedAt')}</option>
              <option value="createdAt">{tSort('createdAt')}</option>
              <option value="title">{tSort('title')}</option>
            </select>
          </FormField>
          <div className="flex min-h-11 items-center gap-2 text-sm sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2">
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
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('clear')}</Link>
        </Button>
      </div>
    </form>
  );
}
