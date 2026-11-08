import type { SearchRecipesInput } from '@family-cookbook/contracts';

const FILTER_KEYS = [
  'query',
  'ingredient',
  'category',
  'tag',
  'language',
  'sort',
  'includeArchived',
  'cursor',
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

export function buildRecipeSearchQuery(
  input: SearchRecipesInput,
  overrides: Partial<Pick<SearchRecipesInput, FilterKey>> = {},
): string {
  const merged = { ...input, ...overrides };
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = merged[key];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (key === 'includeArchived') {
      if (value === true) {
        params.set(key, 'true');
      }
      continue;
    }
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
