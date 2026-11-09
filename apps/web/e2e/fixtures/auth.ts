import { createServerClient } from '@supabase/ssr';
import type { BrowserContext, Page } from '@playwright/test';

import { LOCAL_DEV_PASSWORD } from './constants';
import { resolvePublicSupabaseEnv } from './env';

type StoredCookie = {
  name: string;
  value: string;
  options?: {
    path?: string;
    sameSite?: 'lax' | 'strict' | 'none';
    httpOnly?: boolean;
    secure?: boolean;
  };
};

function mapSameSite(value: string | undefined): 'Strict' | 'Lax' | 'None' | undefined {
  if (value === 'strict') return 'Strict';
  if (value === 'none') return 'None';
  if (value === 'lax') return 'Lax';
  return undefined;
}

export async function seedAuthSession(
  context: BrowserContext,
  email: string,
  baseURL: string,
): Promise<void> {
  const config = resolvePublicSupabaseEnv();
  if (!config) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY for e2e auth',
    );
  }

  const jar: StoredCookie[] = [];

  const supabase = createServerClient(config.url, config.anonKey, {
    cookieOptions: { secure: false },
    cookies: {
      getAll() {
        return jar.map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        for (const entry of cookiesToSet) {
          const index = jar.findIndex((item) => item.name === entry.name);
          const next: StoredCookie = {
            name: entry.name,
            value: entry.value,
            options: {
              path: typeof entry.options?.path === 'string' ? entry.options.path : '/',
              sameSite:
                entry.options?.sameSite === 'lax' ||
                entry.options?.sameSite === 'strict' ||
                entry.options?.sameSite === 'none'
                  ? entry.options.sameSite
                  : 'lax',
              httpOnly: entry.options?.httpOnly === true,
              secure: entry.options?.secure === true,
            },
          };
          if (index >= 0) {
            jar[index] = next;
          } else {
            jar.push(next);
          }
        }
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password: LOCAL_DEV_PASSWORD });
  if (error) {
    throw new Error(`signInWithPassword failed for ${email}: ${error.message}`);
  }

  await supabase.auth.getSession();

  if (jar.length === 0) {
    throw new Error(`No auth cookies were set after sign-in for ${email}`);
  }

  const resolvedBase =
    baseURL.trim() !== ''
      ? baseURL
      : (process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:3003');
  const { hostname } = new URL(resolvedBase);

  await context.addCookies(
    jar.map(({ name, value, options }) => {
      const path = options?.path && options.path !== '' ? options.path : '/';
      return {
        name,
        value,
        domain: hostname,
        path,
        httpOnly: options?.httpOnly ?? true,
        secure: false,
        sameSite: mapSameSite(options?.sameSite) ?? 'Lax',
      };
    }),
  );
}

export async function loginAs(page: Page, email: string, baseURL?: string): Promise<void> {
  const resolved =
    baseURL && baseURL.trim() !== ''
      ? baseURL
      : (process.env['PLAYWRIGHT_TEST_BASE_URL'] ??
        process.env['PLAYWRIGHT_BASE_URL'] ??
        'http://127.0.0.1:3003');
  await seedAuthSession(page.context(), email, resolved);
}
