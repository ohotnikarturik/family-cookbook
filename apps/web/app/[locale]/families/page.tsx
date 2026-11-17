import { listMyFamilies } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { AccountShell } from '@/components/shell/account-shell';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { resolveSignedInLandingPath } from '@/lib/post-auth-path';

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
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8 font-sans">
      <LoadingState />
    </div>
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

  const homeHref = await resolveSignedInLandingPath(supabase, locale);

  return (
    <AccountShell locale={locale} homeHref={homeHref}>
      <PageHeader title={t('list.title')} description={t('list.subtitle')} />
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
    </AccountShell>
  );
}
