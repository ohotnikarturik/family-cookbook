import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { LOCALE_COOKIE, parseAppLocale } from '@/lib/locale';
import { defaultLocale, type AppLocale } from '@/i18n/routing';
import en from '@/messages/en.json';
import fi from '@/messages/fi.json';
import ru from '@/messages/ru.json';
import uk from '@/messages/uk.json';
import { NextIntlClientProvider } from 'next-intl';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { OAuthConsentForm } from './oauth-consent-form';

const messagesByLocale = { en, fi, ru, uk } as const;

type Props = {
  searchParams: Promise<{ authorization_id?: string }>;
};

export default async function OAuthConsentPage(props: Props) {
  const sp = await props.searchParams;
  const authorizationId = sp.authorization_id?.trim();
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: AppLocale = parseAppLocale(localeCookie);
  const messages = messagesByLocale[locale];

  if (!authorizationId) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ConsentShell>
          <p className="text-muted-foreground">{messages.oauthConsent.missingAuthorization}</p>
        </ConsentShell>
      </NextIntlClientProvider>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const next = `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`;
    redirect(`/${locale}/auth/sign-in?next=${encodeURIComponent(next)}`);
  }

  const { data: authDetails, error } =
    await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

  if (error || !authDetails) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ConsentShell>
          <div className="space-y-4">
            <p className="text-muted-foreground">{messages.oauthConsent.errorLoad}</p>
            <Link href="/" className="text-primary underline-offset-4 hover:underline">
              Home
            </Link>
          </div>
        </ConsentShell>
      </NextIntlClientProvider>
    );
  }

  if (!('authorization_id' in authDetails)) {
    const redirectUrl =
      authDetails && typeof authDetails === 'object' && 'redirect_url' in authDetails
        ? String((authDetails as { redirect_url: string }).redirect_url)
        : null;
    if (redirectUrl) {
      redirect(redirectUrl);
    }
  }

  const clientName =
    authDetails && typeof authDetails === 'object' && 'client' in authDetails
      ? String((authDetails as { client?: { name?: string } }).client?.name ?? '')
      : '';
  const scopeRaw =
    authDetails && typeof authDetails === 'object' && 'scope' in authDetails
      ? String((authDetails as { scope?: string }).scope ?? '')
      : '';
  const scopes = scopeRaw
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ConsentShell>
        <OAuthConsentForm authorizationId={authorizationId} clientName={clientName} scopes={scopes} />
      </ConsentShell>
    </NextIntlClientProvider>
  );
}

function ConsentShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      {children}
    </main>
  );
}
