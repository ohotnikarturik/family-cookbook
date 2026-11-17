import { canManageInvitations, resolveAccessibleFamily } from '@family-cookbook/application';
import { canChangeFamilySettings } from '@family-cookbook/permissions';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { FamilySettingsForm } from '@/components/family/family-settings-form';
import { FamilySettingsSubnav } from '@/components/shell/family-settings-subnav';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilySettingsPage(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <SettingsContent params={props.params} />
    </Suspense>
  );
}

async function SettingsContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family.settings' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings`);
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings`);
  }
  if (workspace.status !== 'ok') {
    notFound();
  }

  const canEdit = canChangeFamilySettings(workspace.workspace.role);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <FamilySettingsSubnav
        familyId={familyId}
        showInvitations={canManageInvitations(workspace.workspace.role)}
      />
      <FamilySettingsForm
        familyId={familyId}
        name={workspace.workspace.name}
        defaultLanguage={workspace.workspace.defaultLanguage}
        canEdit={canEdit}
      />
    </div>
  );
}
