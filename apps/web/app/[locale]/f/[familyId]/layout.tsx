import {
  canManageInvitations,
  listMyFamilies,
  resolveAccessibleFamily,
} from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { FamilySwitcher } from '@/components/family/family-switcher';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string; familyId: string }>;
}>;

export default function FamilyLayout(props: Props) {
  return (
    <Suspense fallback={<FamilyLayoutFallback />}>
      <FamilyLayoutShell params={props.params}>{props.children}</FamilyLayoutShell>
    </Suspense>
  );
}

function FamilyLayoutFallback() {
  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8">
      <div className="mb-8 h-12 animate-pulse rounded-md bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

async function FamilyLayoutShell({ children, params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}`);
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}`);
  }
  if (workspace.status !== 'ok') {
    return <UnavailablePage locale={locale} />;
  }

  const listed = await listMyFamilies(supabase);
  const families = listed.status === 'ok' ? listed.families : [];

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-6 py-8 font-sans">
      <header className="mb-8 space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{t('shell.kicker')}</p>
            <h1 className="font-serif-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {workspace.workspace.name}
            </h1>
          </div>
          <FamilySwitcher families={families} currentFamilyId={workspace.workspace.id} />
        </div>
        <nav aria-label={t('shell.navLabel')} className="flex flex-wrap gap-4 text-sm">
          <Link
            href={`/f/${workspace.workspace.id}/recipes`}
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('shell.recipes')}
          </Link>
          <Link
            href={`/f/${workspace.workspace.id}/settings`}
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('shell.settings')}
          </Link>
          <Link
            href={`/f/${workspace.workspace.id}/settings/members`}
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('shell.members')}
          </Link>
          {canManageInvitations(workspace.workspace.role) ? (
            <Link
              href={`/f/${workspace.workspace.id}/settings/invitations`}
              className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t('shell.invitations')}
            </Link>
          ) : null}
          <Link
            href="/families"
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('shell.allFamilies')}
          </Link>
          <Link
            href="/account"
            className="inline-flex min-h-11 items-center font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t('shell.account')}
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
