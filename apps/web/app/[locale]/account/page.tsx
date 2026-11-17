import { signOutAction } from '@/app/actions/auth';
import { AccountPreferencesForm } from '@/components/account/account-preferences-form';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { AccountShell } from '@/components/shell/account-shell';
import { Button } from '@/components/ui/button';
import { locales, type AppLocale } from '@/i18n/routing';
import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { resolveSignedInLandingPath } from '@/lib/post-auth-path';
import { ensureProfileForCurrentUser, getOwnProfile } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default function AccountPage(props: Props) {
  return (
    <Suspense fallback={<AccountFallback />}>
      <AccountContent params={props.params} />
    </Suspense>
  );
}

function AccountFallback() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8 font-sans">
      <LoadingState />
    </div>
  );
}

async function AccountContent({ params }: Props) {
  await connection();
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'account' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/account`);
  }

  const jar = await cookies();
  const ensured = await ensureProfileForCurrentUser(
    supabase,
    profileBootstrapHintsFromCookies(jar),
  );
  if (ensured.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/account`);
  }

  const loaded = await getOwnProfile(supabase);
  if (loaded.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/account`);
  }
  if (loaded.status !== 'ok') {
    notFound();
  }

  const homeHref = await resolveSignedInLandingPath(supabase, locale);

  return (
    <AccountShell locale={locale} homeHref={homeHref}>
      <PageHeader title={t('title')} description={t('subtitle')} />

      {sessionUser.email ? (
        <section
          className="space-y-2 rounded-xl border border-border bg-card p-5 shadow-sm"
          aria-labelledby="account-email-heading"
        >
          <h2 id="account-email-heading" className="text-base font-semibold">
            {t('signedInAs')}
          </h2>
          <p className="break-all text-foreground">{sessionUser.email}</p>
        </section>
      ) : null}

      <section className="space-y-4" aria-labelledby="account-preferences-heading">
        <h2 id="account-preferences-heading" className="text-base font-semibold">
          {t('preferences.title')}
        </h2>
        <AccountPreferencesForm profile={loaded.profile} />
      </section>

      <form action={signOutAction}>
        <input type="hidden" name="returnTo" value={`/${locale}/auth/sign-in`} />
        <Button type="submit" variant="outline" className="min-h-11">
          {t('signOut')}
        </Button>
      </form>
    </AccountShell>
  );
}
