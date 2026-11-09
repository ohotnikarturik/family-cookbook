import { getOwnProfile } from '@family-cookbook/application';
import { AccountPreferencesForm } from '@/components/account/account-preferences-form';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { ensureProfileForCurrentUser } from '@family-cookbook/application';
import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getSessionUser } from '@family-cookbook/data-access';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default function AccountPreferencesPage(props: Props) {
  return (
    <Suspense fallback={<PreferencesFallback />}>
      <PreferencesContent params={props.params} />
    </Suspense>
  );
}

function PreferencesFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-16">
      <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

async function PreferencesContent({ params }: Props) {
  await connection();
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'account.preferences' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/account/preferences`);
  }

  const jar = await cookies();
  await ensureProfileForCurrentUser(supabase, profileBootstrapHintsFromCookies(jar));

  const loaded = await getOwnProfile(supabase);
  if (loaded.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/account/preferences`);
  }
  if (loaded.status !== 'ok') {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-16 font-sans">
      <header className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>
      <AccountPreferencesForm profile={loaded.profile} />
      <Link
        href="/account"
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('backAccount')}
      </Link>
    </main>
  );
}
