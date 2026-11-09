import type { OwnProfile, ProfileBootstrapHints } from '@family-cookbook/contracts';

import { LOCALE_COOKIE } from '@/lib/locale';
import { THEME_COOKIE } from '@/lib/theme';

const oneYearSeconds = 60 * 60 * 24 * 365;

type WritableCookieJar = Readonly<{
  set: (
    name: string,
    value: string,
    options: {
      path: string;
      maxAge: number;
      sameSite: 'lax';
      secure: boolean;
      httpOnly: boolean;
    },
  ) => void;
}>;

const cookieBase = {
  path: '/',
  maxAge: oneYearSeconds,
  sameSite: 'lax' as const,
  secure: process.env['NODE_ENV'] === 'production',
  httpOnly: false,
};

export function writeProfilePreferenceCookies(
  jar: WritableCookieJar,
  profile: Pick<OwnProfile, 'preferredLanguage' | 'themePreference'>,
): void {
  jar.set(LOCALE_COOKIE, profile.preferredLanguage, cookieBase);
  jar.set(THEME_COOKIE, profile.themePreference, cookieBase);
}

export function writeProfilePreferenceHints(
  jar: WritableCookieJar,
  hints: ProfileBootstrapHints,
): void {
  if (hints.preferredLanguage !== undefined) {
    jar.set(LOCALE_COOKIE, hints.preferredLanguage, cookieBase);
  }
  if (hints.themePreference !== undefined) {
    jar.set(THEME_COOKIE, hints.themePreference, cookieBase);
  }
}
