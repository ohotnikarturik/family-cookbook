import { NextRequest, NextResponse } from 'next/server.js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { copySessionCookies, updateSession } from './middleware.js';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(
    (
      _url: string,
      _key: string,
      options: {
        cookies: {
          setAll: (
            cookies: { name: string; value: string; options: Record<string, unknown> }[],
            headers: Record<string, string>,
          ) => void;
        };
      },
    ) => {
      options.cookies.setAll(
        [
          {
            name: 'sb-refresh-token',
            value: 'rotated-token',
            options: {
              path: '/',
              sameSite: 'lax',
              secure: false,
              httpOnly: false,
              maxAge: 3600,
            },
          },
        ],
        {
          'cache-control': 'private, no-cache, no-store, must-revalidate, max-age=0',
          expires: '0',
          pragma: 'no-cache',
        },
      );
      return {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      };
    },
  ),
}));

beforeAll(() => {
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'http://127.0.0.1:54321';
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key';
});

describe('updateSession', () => {
  it('writes refreshed cookies onto the request and the response', async () => {
    const request = new NextRequest('http://localhost:3003/en/account', {
      headers: { cookie: 'sb-access-token=old' },
    });

    const response = await updateSession(request);

    expect(request.cookies.get('sb-access-token')?.value).toBe('old');
    expect(request.cookies.get('sb-refresh-token')?.value).toBe('rotated-token');
    expect(response.headers.get('cache-control')).toContain('no-store');
    const setCookie = response.headers.getSetCookie().join('\n');
    expect(setCookie).toContain('sb-refresh-token=rotated-token');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie.toLowerCase()).toContain('max-age=3600');
  });
});

describe('copySessionCookies', () => {
  it('keeps existing cookies and copies auth cookies with cache headers', () => {
    const session = NextResponse.next();
    session.cookies.set('sb-refresh-token', 'rotated-token', {
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
      secure: false,
      maxAge: 3600,
    });
    session.headers.set('cache-control', 'private, no-store');

    const intl = NextResponse.next();
    intl.cookies.set('fc-locale', 'en', { path: '/' });

    copySessionCookies(session, intl);

    const setCookie = intl.headers.getSetCookie().join('\n');
    expect(setCookie).toContain('fc-locale=en');
    expect(setCookie).toContain('sb-refresh-token=rotated-token');
    expect(setCookie.toLowerCase()).toContain('max-age=3600');
    expect(intl.headers.get('cache-control')).toContain('no-store');
  });
});
