import { CreateFamilyForm } from '@/components/family/create-family-form';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { listMyFamilies } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default function OnboardingPage(props: Props) {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingContent params={props.params} />
    </Suspense>
  );
}

function OnboardingFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 px-6 py-16">
      <div className="h-10 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

async function OnboardingContent({ params }: Props) {
  await connection();
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'onboarding' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/onboarding`);
  }

  const listed = await listMyFamilies(supabase);
  if (listed.status === 'ok' && listed.families.length > 0) {
    redirect(`/${locale}/families`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-8 px-6 py-16 font-sans">
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
        <p className="text-sm text-muted-foreground">{t('inviteLaterHint')}</p>
      </div>
      <CreateFamilyForm />
      <Link
        href="/invite/accept"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('haveInviteLink')}
      </Link>
      <Link
        href="/account"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('backAccount')}
      </Link>
    </main>
  );
}
