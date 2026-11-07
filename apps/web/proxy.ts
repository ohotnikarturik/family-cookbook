import {
  copySessionCookies,
  updateSession,
} from '@family-cookbook/data-access/supabase/middleware';
import createIntlMiddleware from 'next-intl/middleware';
import { type NextRequest } from 'next/server';

import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/auth')) {
    return updateSession(request);
  }

  const sessionResponse = await updateSession(request);
  const intlResponse = intlMiddleware(request);
  copySessionCookies(sessionResponse, intlResponse);
  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
