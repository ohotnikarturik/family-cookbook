import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers.js';

import { getPublicSupabaseEnv, getSupabaseAuthCookieOptions } from './env.js';

export type AppSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function createServerSupabaseClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookieOptions: getSupabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies; middleware/route handlers refresh the session.
        }
      },
    },
  });
}
