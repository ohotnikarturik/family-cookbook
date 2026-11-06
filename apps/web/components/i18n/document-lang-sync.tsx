'use client';

import { useLocale } from 'next-intl';
import { useEffect } from 'react';

/** Keeps `document.documentElement.lang` in sync with the active next-intl locale (avoids `headers()` in root layout for PPR). */
export function DocumentLangSync() {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
