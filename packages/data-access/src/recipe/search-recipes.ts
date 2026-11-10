import {
  RECIPE_SEARCH_DEFAULT_LIMIT,
  RECIPE_SEARCH_MAX_LIMIT,
  recipeSummarySchema,
  type RecipeSearchResult,
  type SearchRecipesInput,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

type RecipeSummaryRow = {
  id: string;
  family_id: string;
  title: string;
  source_language: string;
  category: string | null;
  servings: number | string | null;
  prep_minutes: number | string | null;
  cook_minutes: number | string | null;
  status: 'active' | 'archived';
  version: number;
  created_by: string;
  updated_at: string;
  created_at: string;
};
import {
  decodeRecipeSearchCursor,
  encodeRecipeSearchCursor,
  escapeIlikePattern,
  recipeSearchKeysetFilter,
} from './search-cursor.js';
import { listRecipeCoverAssetIds } from './list-recipe-cover-asset-ids.js';
import { readRecipeSummaryNumber } from './summary-number.js';

export async function searchRecipes(
  client: AppSupabaseClient,
  input: SearchRecipesInput,
): Promise<
  { ok: true; result: RecipeSearchResult } | { ok: false; error: 'query_failed' | 'invalid_row' }
> {
  const limit = Math.min(input.limit ?? RECIPE_SEARCH_DEFAULT_LIMIT, RECIPE_SEARCH_MAX_LIMIT);
  const fetchLimit = limit + 1;
  const sort = input.sort ?? 'updatedAt';

  let select =
    'id, family_id, title, source_language, category, servings, prep_minutes, cook_minutes, status, version, created_by, updated_at, created_at';
  if (input.ingredient) {
    select += ',recipe_ingredients!inner(name)';
  }
  if (input.tag) {
    select += ',recipe_tags!inner(tag_id,family_tags!inner(normalized_name))';
  }

  let query = client.from('recipes').select(select).eq('family_id', input.familyId);

  if (!input.includeArchived) {
    query = query.eq('status', 'active');
  }

  if (input.query) {
    query = query.textSearch('search_document', input.query, {
      type: 'websearch',
      config: 'simple',
    });
  }

  if (input.category) {
    query = query.ilike('category', escapeIlikePattern(input.category));
  }

  if (input.language) {
    query = query.eq('source_language', input.language);
  }

  if (input.createdBy) {
    query = query.eq('created_by', input.createdBy);
  }

  if (input.ingredient) {
    query = query.ilike('recipe_ingredients.name', `%${escapeIlikePattern(input.ingredient)}%`);
  }

  if (input.tag) {
    query = query.eq('recipe_tags.family_tags.normalized_name', input.tag.trim().toLowerCase());
  }

  if (sort === 'title') {
    query = query.order('title', { ascending: true }).order('id', { ascending: true });
  } else if (sort === 'createdAt') {
    query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
  } else {
    query = query.order('updated_at', { ascending: false }).order('id', { ascending: false });
  }

  if (input.cursor) {
    const decoded = decodeRecipeSearchCursor(input.cursor);
    if (decoded && decoded.sort === sort) {
      query = query.or(recipeSearchKeysetFilter(decoded));
    }
  }

  const { data, error } = await query.limit(fetchLimit);

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  // Embedded filters make the select string dynamic, so the client types it as an error row.
  const rows = (data ?? []) as unknown as RecipeSummaryRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items = [];
  for (const row of page) {
    const servings = readRecipeSummaryNumber(row.servings, false);
    const prepMinutes = readRecipeSummaryNumber(row.prep_minutes, true);
    const cookMinutes = readRecipeSummaryNumber(row.cook_minutes, true);
    if (servings === 'invalid' || prepMinutes === 'invalid' || cookMinutes === 'invalid') {
      return { ok: false, error: 'invalid_row' };
    }
    const candidate = {
      id: row.id,
      familyId: row.family_id,
      title: row.title,
      sourceLanguage: row.source_language,
      category: row.category,
      servings,
      prepMinutes,
      cookMinutes,
      status: row.status,
      version: row.version,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    };
    const parsed = recipeSummarySchema.safeParse(candidate);
    if (!parsed.success) {
      return { ok: false, error: 'invalid_row' };
    }
    items.push(parsed.data);
  }

  const coverIds = await listRecipeCoverAssetIds(
    client,
    input.familyId,
    items.map((item) => item.id),
  );
  if (coverIds.size > 0) {
    for (let index = 0; index < items.length; index += 1) {
      const cover = coverIds.get(items[index]!.id);
      if (cover) {
        const withCover = { ...items[index]!, coverAssetId: cover };
        const reparsed = recipeSummarySchema.safeParse(withCover);
        if (reparsed.success) {
          items[index] = reparsed.data;
        }
      }
    }
  }

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    if (last) {
      nextCursor = encodeRecipeSearchCursor({
        sort,
        value:
          sort === 'title' ? last.title : sort === 'createdAt' ? last.created_at : last.updated_at,
        id: last.id,
      });
    }
  }

  return { ok: true, result: { items, nextCursor } };
}
