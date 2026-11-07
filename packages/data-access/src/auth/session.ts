import type { AppSupabaseClient } from '../supabase/server.js';

export type SessionUser = Readonly<{
  id: string;
  email: string | undefined;
}>;

export const AUTH_REQUIRED_CODE = 'AUTH_REQUIRED' as const;

export class AuthRequiredError extends Error {
  readonly code = AUTH_REQUIRED_CODE;

  constructor() {
    super(AUTH_REQUIRED_CODE);
    this.name = 'AuthRequiredError';
  }
}

export async function getSessionUser(client: AppSupabaseClient): Promise<SessionUser | null> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    return null;
  }
  return {
    id: user.id,
    email: user.email ?? undefined,
  };
}

export async function requireSessionUser(client: AppSupabaseClient): Promise<SessionUser> {
  const user = await getSessionUser(client);
  if (!user) {
    throw new AuthRequiredError();
  }
  return user;
}
