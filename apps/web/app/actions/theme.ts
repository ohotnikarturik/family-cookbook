'use server';

import { cookies } from 'next/headers';

import { persistSignedInUiPreferences } from '@/app/actions/account-profile';
import { THEME_COOKIE, type ThemePreference } from '@/lib/theme';

const oneYearSeconds = 60 * 60 * 24 * 365;

export async function setThemePreferenceAction(theme: ThemePreference) {
  if (theme !== 'system' && theme !== 'light' && theme !== 'dark') {
    return { ok: false as const };
  }

  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    path: '/',
    maxAge: oneYearSeconds,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: false,
  });

  await persistSignedInUiPreferences({ themePreference: theme });

  return { ok: true as const };
}
