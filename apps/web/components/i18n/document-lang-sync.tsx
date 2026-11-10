'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect } from 'react';

/** Keeps `document.documentElement.lang` and the meta description in sync with the active next-intl locale. */
export function DocumentLangSync() {
  const locale = useLocale();
  const t = useTranslations('meta');
  const title = t('title');
  const description = t('description');

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', description);
    }
  }, [description, locale, title]);

  return null;
}
