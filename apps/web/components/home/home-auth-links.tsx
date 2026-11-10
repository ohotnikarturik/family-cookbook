import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';

import { TextLink } from '@/components/product/text-link';
import { Button } from '@/components/ui/button';
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
      <nav aria-label={t('navLabel')}>
        <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
          <Link href="/auth/sign-in">{t('signIn')}</Link>
        </Button>
      </nav>
    );
  }

  return (
    <nav aria-label={t('navLabel')} className="flex flex-wrap gap-3 text-sm">
      <TextLink href="/families">{t('families')}</TextLink>
      <TextLink href="/account">{t('account')}</TextLink>
    </nav>
  );
}
