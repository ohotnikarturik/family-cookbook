import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';

import { LocaleShell } from './locale-shell';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    return {};
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function LocaleLayout({ children, params }: Props) {
  return (
    <Suspense fallback={null}>
      <LocaleShell params={params}>{children}</LocaleShell>
    </Suspense>
  );
}
