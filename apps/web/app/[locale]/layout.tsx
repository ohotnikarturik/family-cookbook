import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

import { type AppLocale, locales } from '@/i18n/routing';

import { LocaleShell } from './locale-shell';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) {
    return {};
  }
  const t = await getTranslations({ locale: locale as AppLocale, namespace: 'home' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function LocaleLayout({ children, params }: Props) {
  return (
    <Suspense fallback={null}>
      <LocaleShell params={params}>{children}</LocaleShell>
    </Suspense>
  );
}
