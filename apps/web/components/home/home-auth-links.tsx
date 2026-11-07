import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';

import { Link } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

type Props = Readonly<{ locale: AppLocale }>;

export async function HomeAuthLinks({ locale }: Props) {
  await connection();
  const t = await getTranslations({ locale, namespace: 'home.auth' });
  const supabase = await createServerSupabaseClient();
  const user = await getSessionUser(supabase);

  if (!user) {
    return (
      <nav aria-label={t('navLabel')} className="flex flex-wrap gap-3 text-sm">
        <Link
          href="/auth/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('signIn')}
        </Link>
      </nav>
    );
  }

  return (
    <nav aria-label={t('navLabel')} className="flex flex-wrap gap-3 text-sm">
      <Link
        href="/families"
        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('families')}
      </Link>
      <Link
        href="/account"
        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('account')}
      </Link>
    </nav>
  );
}
