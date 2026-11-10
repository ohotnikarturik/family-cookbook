import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { invitationTokenSchema } from '@family-cookbook/contracts';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { signOutAction } from '@/app/actions/auth';
import { AcceptInvitationForm } from '@/components/invitations/accept-invitation-form';
import { TextLink } from '@/components/product/text-link';
import { AuthFooterPreferences } from '@/components/preferences/auth-footer-preferences';
import { Button } from '@/components/ui/button';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}>;

export default function InviteAcceptPage(props: Props) {
  return (
    <Suspense fallback={<AcceptFallback />}>
      <AcceptContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function AcceptFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

async function AcceptContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const sp = await searchParams;
  const tokenRaw = typeof sp.token === 'string' ? sp.token : '';
  const parsedToken = invitationTokenSchema.safeParse(tokenRaw);

  const t = await getTranslations({ locale, namespace: 'inviteAccept' });

  if (!parsedToken.success) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16 font-sans">
        <div className="space-y-2">
          <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('missingToken')}</p>
        </div>
        <TextLink href="/families">{t('backFamilies')}</TextLink>
        <AuthFooterPreferences />
      </main>
    );
  }

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);

  if (!sessionUser) {
    const next = `/${locale}/invite/accept?token=${encodeURIComponent(parsedToken.data)}`;
    redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16 font-sans">
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        {sessionUser.email ? (
          <div className="space-y-3">
            <p className="text-sm break-all text-muted-foreground">
              {t('signedInAs', { email: sessionUser.email })}
            </p>
            <form action={signOutAction}>
              <input
                type="hidden"
                name="returnTo"
                value={`/${locale}/invite/accept?token=${encodeURIComponent(parsedToken.data)}`}
              />
              <Button type="submit" variant="outline">
                {t('signOut')}
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      <AcceptInvitationForm token={parsedToken.data} />
      <TextLink href="/families">{t('backFamilies')}</TextLink>
      <AuthFooterPreferences />
    </main>
  );
}
