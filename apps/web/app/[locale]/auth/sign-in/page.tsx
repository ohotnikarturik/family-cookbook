import { SignInForm } from '@/components/auth/sign-in-form';
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </main>
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
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16 font-sans">
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>
      <SignInForm locale={locale} nextPath={nextPath} callbackError={sp.error === 'callback'} />
    </main>
  );
}
