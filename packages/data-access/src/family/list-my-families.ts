import {
  familyRoleSchema,
  familySummarySchema,
  profilePreferredLanguageSchema,
} from '@family-cookbook/contracts';
import { z } from 'zod';

import { getSessionUser } from '../auth/session.js';
import type { AppSupabaseClient } from '../supabase/server.js';

const listRowSchema = z.object({
  family_id: z.uuid(),
  role: familyRoleSchema,
  families: z.object({
    id: z.uuid(),
    name: z.string(),
    default_language: profilePreferredLanguageSchema,
    deleted_at: z.string().nullable(),
  }),
});

export async function listMyActiveFamilies(
  client: AppSupabaseClient,
): Promise<
  | { ok: true; families: z.infer<typeof familySummarySchema>[] }
  | { ok: false; error: 'query_failed' | 'auth_required' }
> {
  const sessionUser = await getSessionUser(client);
  if (!sessionUser) {
    return { ok: false, error: 'auth_required' };
  }

  const { data, error } = await client
    .from('family_members')
    .select(
      `
      family_id,
      role,
      families!inner (
        id,
        name,
        default_language,
        deleted_at
      )
    `,
    )
    .eq('user_id', sessionUser.id)
    .eq('status', 'active')
    .order('joined_at', { ascending: true });

  if (error) {
    return { ok: false, error: 'query_failed' };
  }

  const families: z.infer<typeof familySummarySchema>[] = [];
  for (const row of data ?? []) {
    const parsed = listRowSchema.safeParse(row);
    if (!parsed.success) {
      continue;
    }
    if (parsed.data.families.deleted_at !== null) {
      continue;
    }
    families.push({
      id: parsed.data.families.id,
      name: parsed.data.families.name,
      defaultLanguage: parsed.data.families.default_language,
      role: parsed.data.role,
    });
  }

  return { ok: true, families };
}
