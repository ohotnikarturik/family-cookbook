'use client';

import type { RecipeSearchSort } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Link } from '@/i18n/navigation';

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

  return (
    <form method="get" className="space-y-4 rounded-xl border border-border bg-surface-raised p-4">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="sr-only">{t('legend')}</legend>
        <FilterField
          id="recipe-query"
          label={t('query')}
          hint={t('queryHint')}
          hintId="recipe-query-hint"
        >
          <Input
            id="recipe-query"
            name="query"
            type="search"
            defaultValue={defaultValues.query ?? ''}
            autoComplete="off"
            aria-describedby="recipe-query-hint"
            className="min-h-11"
          />
        </FilterField>
        <FilterField
          id="recipe-ingredient"
          label={t('ingredient')}
          hint={t('ingredientHint')}
          hintId="recipe-ingredient-hint"
        >
          <Input
            id="recipe-ingredient"
            name="ingredient"
            defaultValue={defaultValues.ingredient ?? ''}
            autoComplete="off"
            aria-describedby="recipe-ingredient-hint"
            className="min-h-11"
          />
        </FilterField>
        <FilterField id="recipe-category" label={t('category')}>
          <Input
            id="recipe-category"
            name="category"
            defaultValue={defaultValues.category ?? ''}
            autoComplete="off"
            className="min-h-11"
          />
        </FilterField>
        <FilterField id="recipe-tag" label={t('tag')}>
          <Input
            id="recipe-tag"
            name="tag"
            defaultValue={defaultValues.tag ?? ''}
            autoComplete="off"
            className="min-h-11"
          />
        </FilterField>
        <FilterField id="recipe-language" label={t('language')}>
          <Input
            id="recipe-language"
            name="language"
            defaultValue={defaultValues.language ?? ''}
            placeholder={t('languagePlaceholder')}
            autoComplete="off"
            className="min-h-11"
          />
        </FilterField>
        <FilterField
          id="recipe-contributor"
          label={t('contributor')}
          hint={t('contributorHint')}
          hintId="recipe-contributor-hint"
        >
          <select
            id="recipe-contributor"
            name="createdBy"
            defaultValue={defaultValues.createdBy ?? ''}
            aria-describedby="recipe-contributor-hint"
            className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('contributorAny')}</option>
            {contributorOptions.map((option) => (
              <option key={option.userId} value={option.userId}>
                {option.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField id="recipe-sort" label={t('sort')}>
          <select
            id="recipe-sort"
            name="sort"
            defaultValue={defaultValues.sort ?? 'updatedAt'}
            className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="updatedAt">{tSort('updatedAt')}</option>
            <option value="createdAt">{tSort('createdAt')}</option>
            <option value="title">{tSort('title')}</option>
          </select>
        </FilterField>
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
      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="min-h-11 min-w-11 px-5">
          {t('apply')}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('clear')}</Link>
        </Button>
      </div>
    </form>
  );
}

function FilterField({
  id,
  label,
  hint,
  hintId,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  hintId?: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}
