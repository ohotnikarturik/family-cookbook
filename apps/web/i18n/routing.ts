import { defineRouting } from 'next-intl/routing';

/** BCP 47-style UI locales. Match PROJECT_SPEC initial locales. */
export const locales = ['en', 'fi', 'ru', 'uk'] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = 'en';

/** Fixed zone so server and client formatters cannot drift with the host timezone. */
export const appTimeZone = 'UTC';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  localePrefix: 'always',
  /** Align cookie name with Family Cookbook preference naming (`fc-*`). */
  localeCookie: {
    name: 'fc-locale',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  },
});
