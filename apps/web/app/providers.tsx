'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { DocumentLangSync } from '@/components/i18n/document-lang-sync';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

type Messages = NonNullable<ComponentProps<typeof NextIntlClientProvider>['messages']>;

type Props = Readonly<{
  locale: string;
  messages: Messages;
  timeZone: string;
  children: ReactNode;
}>;

export function AppProviders({ locale, messages, timeZone, children }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <DocumentLangSync />
      <ThemeProvider>{children}</ThemeProvider>
    </NextIntlClientProvider>
  );
}
