import { signOutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { profileBootstrapHintsFromCookies } from '@/lib/auth-hints';
import { ensureProfileForCurrentUser } from '@family-cookbook/application';
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </main>
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, preferred_language, theme_preference')
    .eq('user_id', sessionUser.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? sessionUser.email ?? t('unknownMember');

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16 font-sans">
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section
        className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        aria-labelledby="account-summary-heading"
      >
        <h2 id="account-summary-heading" className="text-base font-semibold">
          {t('signedInAs')}
        </h2>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="text-muted-foreground">{t('displayName')}</dt>
            <dd className="font-medium text-foreground">{displayName}</dd>
          </div>
          {sessionUser.email ? (
            <div>
              <dt className="text-muted-foreground">{t('email')}</dt>
              <dd className="font-mono text-foreground">{sessionUser.email}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <form action={signOutAction}>
        <input type="hidden" name="returnTo" value={`/${locale}/auth/sign-in`} />
        <Button type="submit" variant="outline">
          {t('signOut')}
        </Button>
      </form>

      <Link
        href="/"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('backHome')}
      </Link>
    </main>
  );
}
