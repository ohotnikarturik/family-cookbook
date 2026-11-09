import { listMyFamilies } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { UiPreferencesControls } from '@/components/preferences/ui-preferences-controls';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export default function FamiliesPage(props: Props) {
  return (
    <Suspense fallback={<FamiliesFallback />}>
      <FamiliesContent params={props.params} />
    </Suspense>
  );
}

function FamiliesFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-16">
      <div className="h-10 w-56 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

async function FamiliesContent({ params }: Props) {
  await connection();
  const { locale: localeParam } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family' });
  const tRoles = await getTranslations({ locale, namespace: 'family.roles' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/families`);
  }

  const listed = await listMyFamilies(supabase);
  if (listed.status !== 'ok') {
    redirect(`/${locale}/auth/sign-in`);
  }

  if (listed.families.length === 0) {
    redirect(`/${locale}/onboarding`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-8 px-6 py-16 font-sans">
      <UiPreferencesControls />
      <div className="space-y-2">
        <h1 className="font-serif-display text-3xl font-semibold tracking-tight text-foreground">
          {t('list.title')}
        </h1>
        <p className="text-muted-foreground">{t('list.subtitle')}</p>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
        {listed.families.map((family) => (
          <li key={family.id}>
            <Link
              href={`/f/${family.id}`}
              className="flex min-h-11 flex-col gap-0.5 px-5 py-4 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="font-medium text-foreground">{family.name}</span>
              <span className="text-sm text-muted-foreground">{tRoles(family.role)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/account"
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('list.backAccount')}
      </Link>
    </main>
  );
}
