import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Suspense } from 'react';

import en from '../../messages/en.json';

import { LocaleShell } from './locale-shell';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

// Title is the same in every UI locale. Reading `params` here makes Cache Components
// treat metadata as runtime data and log a prefetch error on every navigation.
export const metadata: Metadata = {
  title: en.home.title,
  description: en.home.subtitle,
};

export default function LocaleLayout({ children, params }: Props) {
  return (
    <Suspense fallback={null}>
      <LocaleShell params={params}>{children}</LocaleShell>
    </Suspense>
  );
}
