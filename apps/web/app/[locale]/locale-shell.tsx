import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { AppProviders } from '@/app/providers';
import { appTimeZone, locales } from '@/i18n/routing';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export async function LocaleShell({ children, params }: Props) {
  await connection();

  const { locale } = await params;

  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages({ locale });

  return (
    <AppProviders locale={locale} messages={messages} timeZone={appTimeZone}>
      {children}
    </AppProviders>
  );
}
