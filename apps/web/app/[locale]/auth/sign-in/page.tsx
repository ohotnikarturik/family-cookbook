import { SignInForm } from '@/components/auth/sign-in-form';
import { LoadingState } from '@/components/product/loading-state';
import { AuthShell } from '@/components/shell/auth-shell';
import { locales, type AppLocale } from '@/i18n/routing';
import { sanitizeAuthRedirect } from '@family-cookbook/data-access/auth/redirect';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

type Props = Readonly<{
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
}>;

export default function SignInPage(props: Props) {
  return (
    <Suspense fallback={<SignInFallback />}>
      <SignInContent {...props} />
    </Suspense>
  );
}

function SignInFallback() {
  return (
    <AuthShell>
      <LoadingState />
    </AuthShell>
  );
}

async function SignInContent({ params, searchParams }: Props) {
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: 'auth' });

  const nextPath =
    typeof sp.next === 'string' && sp.next !== ''
      ? sanitizeAuthRedirect(sp.next, `/${locale}/account`)
      : '';

  return (
    <AuthShell>
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <SignInForm locale={locale} nextPath={nextPath} callbackError={sp.error === 'callback'} />
    </AuthShell>
  );
}
