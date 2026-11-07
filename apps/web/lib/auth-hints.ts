import type { ProfileBootstrapHints } from '@family-cookbook/contracts';

import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { parseThemePreference, THEME_COOKIE } from '@/lib/theme';

type CookieStore = Readonly<{
  get: (name: string) => { value: string } | undefined;
}>;

export function profileBootstrapHintsFromCookies(jar: CookieStore): ProfileBootstrapHints {
  return {
    preferredLanguage: parseAppLocale(jar.get(LOCALE_COOKIE)?.value),
    themePreference: parseThemePreference(jar.get(THEME_COOKIE)?.value),
  };
}
