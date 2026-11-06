'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps, ReactNode } from 'react';

import { ThemeProvider } from '@/components/theme/ThemeProvider';

type Messages = NonNullable<ComponentProps<typeof NextIntlClientProvider>['messages']>;

type Props = Readonly<{
  locale: string;
  messages: Messages;
  children: ReactNode;
}>;

export function AppProviders({ locale, messages, children }: Props) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider>{children}</ThemeProvider>
    </NextIntlClientProvider>
  );
}
