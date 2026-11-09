'use server';

import { cookies } from 'next/headers';

import { persistSignedInUiPreferences } from '@/app/actions/account-profile';
import { locales, type AppLocale } from '@/i18n/routing';
import { LOCALE_COOKIE } from '@/lib/locale';

const oneYearSeconds = 60 * 60 * 24 * 365;

export async function setLocalePreferenceAction(locale: string) {
  if (!(locales as readonly string[]).includes(locale)) {
    return { ok: false as const };
  }

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale as AppLocale, {
    path: '/',
    maxAge: oneYearSeconds,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: false,
  });

  await persistSignedInUiPreferences({ preferredLanguage: locale as AppLocale });

  return { ok: true as const };
}
