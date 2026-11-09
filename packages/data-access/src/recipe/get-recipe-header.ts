import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const recipeHeaderRowSchema = z.object({
  id: z.uuid(),
  family_id: z.uuid(),
  created_by: z.uuid(),
  source_language: z.string(),
  version: z.number().int().min(1),
  status: z.enum(['active', 'archived']),
});

export type RecipeHeader = {
  id: string;
  familyId: string;
  createdBy: string;
  sourceLanguage: string;
  version: number;
  status: 'active' | 'archived';
};

export async function getRecipeHeader(
  client: AppSupabaseClient,
  familyId: string,
  recipeId: string,
): Promise<
  | { ok: true; header: RecipeHeader }
  | { ok: false; error: 'not_found' | 'query_failed' | 'invalid_row' }
> {
  const { data, error } = await client
    .from('recipes')
    .select('id, family_id, created_by, source_language, version, status')
    .eq('family_id', familyId)
    .eq('id', recipeId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  const parsed = recipeHeaderRowSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_row' };
  }

  return {
    ok: true,
    header: {
      id: parsed.data.id,
      familyId: parsed.data.family_id,
      createdBy: parsed.data.created_by,
      sourceLanguage: parsed.data.source_language,
      version: parsed.data.version,
      status: parsed.data.status,
    },
  };
}
