import {
  copySessionCookies,
  updateSession,
} from '@family-cookbook/data-access/supabase/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';

import { applyWebSecurityHeaders } from '@/lib/web-security';

import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

function withSecurityHeaders(response: Response): Response {
  applyWebSecurityHeaders(response.headers);
  return response;
}

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return withSecurityHeaders(await updateSession(request));
  }

  const sessionResponse = await updateSession(request);
  const intlResponse = intlMiddleware(request);
  copySessionCookies(sessionResponse, intlResponse);
  return withSecurityHeaders(intlResponse);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
