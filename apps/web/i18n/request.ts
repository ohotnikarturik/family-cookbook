import { getRequestConfig } from 'next-intl/server';

import en from '../messages/en.json';
import fi from '../messages/fi.json';
import ru from '../messages/ru.json';
import uk from '../messages/uk.json';
import { appTimeZone, defaultLocale, locales, type AppLocale } from './routing';

/**
 * Static imports keep every catalog in the module graph.
 * A dynamic JSON import could stay bound to an older evaluated module in a
 * long-running Turbopack process, so new keys rendered as their own paths.
 */
const messagesByLocale = {
  en,
  fi,
  ru,
  uk,
} satisfies Record<AppLocale, typeof en>;

function isAppLocale(value: string): value is AppLocale {
  return (locales as readonly string[]).includes(value);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = requested && isAppLocale(requested) ? requested : defaultLocale;

  return {
    locale,
    timeZone: appTimeZone,
    messages: messagesByLocale[locale],
  };
});
