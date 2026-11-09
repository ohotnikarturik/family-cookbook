import type { EnsureProfileForUserResult } from '@family-cookbook/application';
import { ensureProfileForCurrentUser, getOwnProfile } from '@family-cookbook/application';
import type { AppSupabaseClient } from '@family-cookbook/data-access';
import type { ProfileBootstrapHints } from '@family-cookbook/contracts';
import { cookies } from 'next/headers';

import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { writeProfilePreferenceCookies } from '@/lib/profile-preference-cookies';

/** Call only from Route Handlers or Server Actions — sets preference cookies. */
export async function ensureProfileForSession(
  client: AppSupabaseClient,
  hints?: ProfileBootstrapHints,
): Promise<EnsureProfileForUserResult> {
  const resolvedHints = hints ?? profileBootstrapHintsFromCookies(await cookies());
  const ensured = await ensureProfileForCurrentUser(client, resolvedHints);
  if (ensured.status !== 'ok' || ensured.outcome !== 'exists') {
    return ensured;
  }

  const loaded = await getOwnProfile(client);
  if (loaded.status === 'ok') {
    writeProfilePreferenceCookies(await cookies(), loaded.profile);
  }

  return ensured;
}
