import type { AppSupabaseClient } from '../supabase/server.js';

/** Most values returned per list; keeps selects on the browse page small. */
export const FAMILY_CATEGORY_LIMIT = 50;
export const FAMILY_TAG_LIMIT = 100;
export const FAMILY_LANGUAGE_LIMIT = 20;

/** PostgREST has no DISTINCT, so recipe columns are scanned up to this many rows and de-duplicated here. */
const FACET_SCAN_ROWS = 1000;

type FacetResult = { ok: true; values: string[] } | { ok: false };

function distinctCaseInsensitive(values: readonly string[], max: number): string[] {
  const seen = new Map<string, string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, trimmed);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b)).slice(0, max);
}

/** Distinct, non-empty categories used by active recipes of one family (max 50). */
export async function listFamilyCategories(
  client: AppSupabaseClient,
  familyId: string,
): Promise<FacetResult> {
  const { data, error } = await client
    .from('recipes')
    .select('category')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .not('category', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(FACET_SCAN_ROWS);
  if (error || !data) {
    return { ok: false };
  }
  return {
    ok: true,
    values: distinctCaseInsensitive(
      data.map((row) => row.category as string),
      FAMILY_CATEGORY_LIMIT,
    ),
  };
}

/** Languages (BCP 47 tags) that active recipes of one family are written in. */
export async function listFamilyRecipeLanguages(
  client: AppSupabaseClient,
  familyId: string,
): Promise<FacetResult> {
  const { data, error } = await client
    .from('recipes')
    .select('source_language')
    .eq('family_id', familyId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(FACET_SCAN_ROWS);
  if (error || !data) {
    return { ok: false };
  }
  return {
    ok: true,
    values: distinctCaseInsensitive(
      data.map((row) => row.source_language as string),
      FAMILY_LANGUAGE_LIMIT,
    ),
  };
}

/** Tag names defined for one family (max 100). */
export async function listFamilyTags(
  client: AppSupabaseClient,
  familyId: string,
): Promise<FacetResult> {
  const { data, error } = await client
    .from('family_tags')
    .select('name')
    .eq('family_id', familyId)
    .order('name', { ascending: true })
    .limit(FAMILY_TAG_LIMIT);
  if (error || !data) {
    return { ok: false };
  }
  return {
    ok: true,
    values: distinctCaseInsensitive(
      data.map((row) => row.name as string),
      FAMILY_TAG_LIMIT,
    ),
  };
}
