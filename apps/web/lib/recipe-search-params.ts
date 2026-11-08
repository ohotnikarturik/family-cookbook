import {
  RECIPE_SEARCH_DEFAULT_LIMIT,
  searchRecipesInputSchema,
  type SearchRecipesInput,
} from '@family-cookbook/contracts';

type RawSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}

export type ParsedRecipeSearch = Readonly<{
  input: SearchRecipesInput | null;
  hadInvalidParams: boolean;
}>;

export function parseRecipeSearchFromUrl(
  familyId: string,
  searchParams: RawSearchParams,
): ParsedRecipeSearch {
  const raw = {
    familyId,
    query: firstParam(searchParams.query),
    ingredient: firstParam(searchParams.ingredient),
    category: firstParam(searchParams.category),
    tag: firstParam(searchParams.tag),
    language: firstParam(searchParams.language),
    sort: firstParam(searchParams.sort),
    cursor: firstParam(searchParams.cursor),
    includeArchived: parseOptionalBoolean(firstParam(searchParams.includeArchived)),
    limit: RECIPE_SEARCH_DEFAULT_LIMIT,
  };

  const cleaned = Object.fromEntries(
    Object.entries(raw).filter(([, value]) => value !== undefined && value !== ''),
  );

  const parsed = searchRecipesInputSchema.safeParse(cleaned);
  if (!parsed.success) {
    return { input: null, hadInvalidParams: true };
  }

  return { input: parsed.data, hadInvalidParams: false };
}
