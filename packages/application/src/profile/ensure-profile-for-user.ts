import type { ProfileBootstrapHints } from '@family-cookbook/contracts';
import {
  ensureProfile,
  type AppSupabaseClient,
  type EnsureProfileResult,
  getSessionUser,
} from '@family-cookbook/data-access';

export type EnsureProfileForUserResult =
  | { status: 'auth_required' }
  | { status: 'ok'; outcome: EnsureProfileResult; userId: string };

export async function ensureProfileForCurrentUser(
  client: AppSupabaseClient,
  hints: ProfileBootstrapHints,
): Promise<EnsureProfileForUserResult> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return { status: 'auth_required' };
  }
  const outcome = await ensureProfile(client, user, hints);
  return { status: 'ok', outcome, userId: user.id };
}

export async function loadVerifiedAuthUser(client: AppSupabaseClient): Promise<
  | { status: 'auth_required' }
  | {
      status: 'ok';
      userId: string;
      email: string | undefined;
    }
> {
  const sessionUser = await getSessionUser(client);
  if (!sessionUser) {
    return { status: 'auth_required' };
  }
  return {
    status: 'ok',
    userId: sessionUser.id,
    email: sessionUser.email,
  };
}
