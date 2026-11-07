import { ensureProfileForCurrentUser } from '@family-cookbook/application';
import { sanitizeAuthRedirect } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';

function redirectAuth(url: string): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  response.headers.set('Expires', '0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const jar = await cookies();
  const locale = parseAppLocale(jar.get(LOCALE_COOKIE)?.value);
  const fallback = `/${locale}/account`;

  if (!code) {
    return redirectAuth(`${requestUrl.origin}/${locale}/auth/sign-in?error=callback`);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirectAuth(`${requestUrl.origin}/${locale}/auth/sign-in?error=callback`);
  }

  await ensureProfileForCurrentUser(supabase, profileBootstrapHintsFromCookies(jar));

  const path = sanitizeAuthRedirect(next, fallback);
  return redirectAuth(`${requestUrl.origin}${path}`);
}
