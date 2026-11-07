import type { CreateFamilyInput } from '@family-cookbook/contracts';
import { familyIdSchema } from '@family-cookbook/contracts';

import type { AppSupabaseClient } from '../supabase/server.js';

export async function createFamilyBootstrap(
  client: AppSupabaseClient,
  input: CreateFamilyInput,
): Promise<
  { ok: true; familyId: string } | { ok: false; error: 'bootstrap_failed' | 'invalid_response' }
> {
  const { data, error } = await client.rpc('create_family_bootstrap', {
    p_name: input.name,
    p_default_language: input.defaultLanguage ?? 'en',
  });

  if (error) {
    return { ok: false, error: 'bootstrap_failed' };
  }

  const parsed = familyIdSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: 'invalid_response' };
  }

  return { ok: true, familyId: parsed.data };
}
