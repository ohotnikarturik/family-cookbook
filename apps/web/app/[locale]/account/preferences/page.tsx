import { notFound, redirect } from 'next/navigation';

import { locales } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

/** Language and appearance now live on the Account page; keep the old address working. */
export default async function AccountPreferencesRedirectPage({ params }: Props) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) {
    notFound();
  }
  redirect(`/${locale}/account`);
}
