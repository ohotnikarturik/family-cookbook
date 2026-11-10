import { listMyFamilies, resolveAccessibleFamily } from '@family-cookbook/application';
import { canCreateRecipe } from '@family-cookbook/permissions';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { FamilyAppShell } from '@/components/shell/family-app-shell';
import { UnavailablePage } from '@/components/product/unavailable-page';
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
    <div className="mx-auto min-h-screen max-w-5xl space-y-6 px-6 py-8">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-48 w-full rounded-xl" />
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
  const showAddRecipe = canCreateRecipe(workspace.workspace.role);

  return (
    <FamilyAppShell
      locale={locale}
      familyId={workspace.workspace.id}
      familyName={workspace.workspace.name}
      families={families}
      showAddRecipe={showAddRecipe}
      skipToContentLabel={t('shell.skipToContent')}
    >
      {children}
    </FamilyAppShell>
  );
}
