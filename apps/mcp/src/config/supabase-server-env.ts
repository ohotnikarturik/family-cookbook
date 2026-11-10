import { resolveSupabasePublicConfig } from './resolve-supabase-config.js';

/** Maps monorepo web env vars into names expected by `@supabase/server`. */
export function ensureSupabaseServerEnv(): void {
  const config = resolveSupabasePublicConfig();
  if (!config) {
    return;
  }
  if (!process.env['SUPABASE_URL']) {
    process.env['SUPABASE_URL'] = config.url;
  }
  if (!process.env['SUPABASE_PUBLISHABLE_KEY']) {
    process.env['SUPABASE_PUBLISHABLE_KEY'] = config.anonKey;
  }
  if (!process.env['SUPABASE_JWKS_URL']) {
    process.env['SUPABASE_JWKS_URL'] = `${config.url.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json`;
  }
  if (!process.env['NEXT_PUBLIC_SUPABASE_URL']) {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = config.url;
  }
  if (!process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = config.anonKey;
  }
}
