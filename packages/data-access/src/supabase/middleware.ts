import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server.js';

import { getPublicSupabaseEnv, getSupabaseAuthCookieOptions } from './env.js';

const SESSION_CACHE_HEADERS = ['cache-control', 'expires', 'pragma'] as const;

/**
 * Copy auth Set-Cookie headers and the no-store headers Supabase attaches to a
 * token refresh onto another middleware response (for example next-intl).
 */
export function copySessionCookies(from: NextResponse, to: NextResponse): void {
  const setCookieHeaders = from.headers.getSetCookie();
  for (const header of setCookieHeaders) {
    to.headers.append('set-cookie', header);
  }
  if (setCookieHeaders.length === 0) {
    for (const cookie of from.cookies.getAll()) {
      to.cookies.set(cookie);
    }
  }
  for (const name of SESSION_CACHE_HEADERS) {
    const value = from.headers.get(name);
    if (value !== null) {
      to.headers.set(name, value);
    }
  }
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, anonKey } = getPublicSupabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: getSupabaseAuthCookieOptions(),
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
