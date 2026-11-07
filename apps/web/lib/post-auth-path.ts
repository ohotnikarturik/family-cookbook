import { resolveDefaultFamilyId } from '@family-cookbook/application';
import type { AppSupabaseClient } from '@family-cookbook/data-access/supabase/server';

import type { AppLocale } from '@/i18n/routing';

export async function resolveSignedInLandingPath(
  client: AppSupabaseClient,
  locale: AppLocale,
): Promise<string> {
  const resolved = await resolveDefaultFamilyId(client);
  if (resolved.status === 'none') {
    return `/${locale}/onboarding`;
  }
  if (resolved.status === 'ok') {
    return `/${locale}/f/${resolved.familyId}`;
  }
  return `/${locale}/account`;
}
