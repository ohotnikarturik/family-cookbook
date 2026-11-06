import { defaultLocale, locales, type AppLocale } from '@/i18n/routing';

/** Cookie used for saved UI locale (matches `routing.localeCookie.name` in middleware). */
export const LOCALE_COOKIE = 'fc-locale';

const localeSet = new Set<string>(locales);

export function parseAppLocale(value: string | undefined): AppLocale {
  if (value !== undefined && localeSet.has(value)) {
    return value as AppLocale;
  }
  return defaultLocale;
}
