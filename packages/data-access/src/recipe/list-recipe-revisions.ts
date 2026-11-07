import {
  RECIPE_HISTORY_LIMIT_MAX,
  recipeHistoryResultSchema,
  recipeRevisionSummarySchema,
  type GetRecipeHistoryInput,
  type RecipeHistoryResult,
} from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';
import {
  decodeRevisionCursor,
  encodeRevisionCursor,
  revisionKeysetFilter,
} from './search-cursor.js';

const DEFAULT_HISTORY_LIMIT = 25;

export async function listRecipeRevisions(
  client: AppSupabaseClient,
  input: GetRecipeHistoryInput,
): Promise<
  { ok: true; result: RecipeHistoryResult } | { ok: false; error: 'query_failed' | 'invalid_row' }
> {
  const limit = Math.min(input.limit ?? DEFAULT_HISTORY_LIMIT, RECIPE_HISTORY_LIMIT_MAX);
  const fetchLimit = limit + 1;

  let query = client
    .from('recipe_revisions')
    .select('id, family_id, recipe_id, version, changed_by, change_summary, created_at')
    .eq('family_id', input.familyId)
    .eq('recipe_id', input.recipeId)
    .order('version', { ascending: false })
    .order('id', { ascending: false });

  if (input.cursor) {
    const decoded = decodeRevisionCursor(input.cursor);
    if (decoded) {
      query = query.or(revisionKeysetFilter(decoded.version, decoded.id));
    }
  }

  const { data, error } = await query.limit(fetchLimit);

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const items = [];
  for (const row of page) {
    const candidate = {
      id: row.id as string,
      familyId: row.family_id as string,
      recipeId: row.recipe_id as string,
      version: row.version as number,
      changedBy: row.changed_by as string,
      changeSummary: (row.change_summary as string | null) ?? null,
      createdAt: row.created_at as string,
    };
    const parsed = recipeRevisionSummarySchema.safeParse(candidate);
    if (!parsed.success) {
      return { ok: false, error: 'invalid_row' };
    }
    items.push(parsed.data);
  }

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    if (last) {
      nextCursor = encodeRevisionCursor(last.version as number, last.id as string);
    }
  }

  const result = { items, nextCursor };
  const validated = recipeHistoryResultSchema.safeParse(result);
  if (!validated.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return { ok: true, result: validated.data };
}
