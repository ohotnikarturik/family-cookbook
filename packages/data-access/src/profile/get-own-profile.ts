import {
  ownProfileSchema,
  profilePreferredLanguageSchema,
  profileThemePreferenceSchema,
} from '@family-cookbook/contracts';
import { z } from 'zod';

import type { AppSupabaseClient } from '../supabase/server.js';

const ownProfileRowSchema = z.object({
  display_name: z.string(),
  preferred_language: profilePreferredLanguageSchema,
  theme_preference: profileThemePreferenceSchema,
});

export type GetOwnProfileResult =
  | { ok: true; profile: z.infer<typeof ownProfileSchema> }
  | { ok: false; error: 'not_found' | 'query_failed' };

export async function getOwnProfile(client: AppSupabaseClient): Promise<GetOwnProfileResult> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { ok: false, error: 'not_found' };
  }

  const { data, error } = await client
    .from('profiles')
    .select('display_name, preferred_language, theme_preference')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'query_failed' };
  }
  if (!data) {
    return { ok: false, error: 'not_found' };
  }

  const row = ownProfileRowSchema.safeParse(data);
  if (!row.success) {
    return { ok: false, error: 'query_failed' };
  }

  const profile = ownProfileSchema.safeParse({
    displayName: row.data.display_name,
    preferredLanguage: row.data.preferred_language,
    themePreference: row.data.theme_preference,
  });
  if (!profile.success) {
    return { ok: false, error: 'query_failed' };
  }

  return { ok: true, profile: profile.data };
}
