import { createBrowserClient } from '@supabase/ssr';

import { getPublicSupabaseEnv, getSupabaseAuthCookieOptions } from './env.js';

export function createBrowserSupabaseClient() {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createBrowserClient(url, anonKey, {
    cookieOptions: getSupabaseAuthCookieOptions(),
  });
}
