import type { RecipeSearchSort } from '@family-cookbook/contracts';

import type { RecipeSearchFormValues } from '@/components/recipe/recipe-search-form';

export type RecipeSearchChip = Readonly<{
  key: string;
  label: string;
  omit: keyof RecipeSearchFormValues;
}>;

type ChipLabels = Readonly<{
  query: string;
  ingredient: string;
  category: string;
  tag: string;
  language: string;
  contributor: string;
  includeArchived: string;
  sort: string;
  sortValue: (sort: Exclude<RecipeSearchSort, 'updatedAt'>) => string;
  contributorName: (userId: string) => string;
}>;

export function buildRecipeSearchChips(
  values: RecipeSearchFormValues,
  labels: ChipLabels,
): RecipeSearchChip[] {
  const chips: RecipeSearchChip[] = [];

  function push(key: keyof RecipeSearchFormValues, field: string, value: string) {
    chips.push({ key, label: `${field}: ${value}`, omit: key });
  }

  if (values.query?.trim()) {
    push('query', labels.query, values.query.trim());
  }
  if (values.ingredient?.trim()) {
    push('ingredient', labels.ingredient, values.ingredient.trim());
  }
  if (values.category?.trim()) {
    push('category', labels.category, values.category.trim());
  }
  if (values.tag?.trim()) {
    push('tag', labels.tag, values.tag.trim());
  }
  if (values.language?.trim()) {
    push('language', labels.language, values.language.trim());
  }
  if (values.createdBy) {
    push('createdBy', labels.contributor, labels.contributorName(values.createdBy));
  }
  if (values.sort === 'createdAt' || values.sort === 'title') {
    push('sort', labels.sort, labels.sortValue(values.sort));
  }
  if (values.includeArchived) {
    chips.push({
      key: 'archived',
      label: labels.includeArchived,
      omit: 'includeArchived',
    });
  }

  return chips;
}
