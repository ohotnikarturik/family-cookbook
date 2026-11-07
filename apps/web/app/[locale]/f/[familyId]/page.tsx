import { resolveAccessibleFamily } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyDashboardPage(props: Props) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent params={props.params} />
    </Suspense>
  );
}

function DashboardFallback() {
  return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
}

async function DashboardContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family' });
  const tRoles = await getTranslations({ locale, namespace: 'family.roles' });

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }

  const { workspace: family } = workspace;

  return (
    <section
      aria-labelledby="family-dashboard-heading"
      className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
    >
      <h2 id="family-dashboard-heading" className="text-lg font-semibold text-foreground">
        {t('dashboard.title')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('dashboard.yourRole')}</dt>
          <dd className="font-medium text-foreground">{tRoles(family.role)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('dashboard.memberCount')}</dt>
          <dd className="font-medium text-foreground">{family.memberCount}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">{t('dashboard.scopeNote')}</dt>
          <dd className="text-foreground">{t('dashboard.scopeProof', { name: family.name })}</dd>
        </div>
      </dl>
    </section>
  );
}
