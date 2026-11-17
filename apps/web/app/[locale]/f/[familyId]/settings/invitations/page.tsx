import {
  canManageInvitations,
  listFamilyInvitations,
  resolveAccessibleFamily,
} from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getSessionUser } from '@family-cookbook/data-access';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { invitableRolesForActor } from '@/lib/invitable-roles';
import { InviteMemberForm } from '@/components/invitations/invite-member-form';
import { FamilySettingsSubnav } from '@/components/shell/family-settings-subnav';
import { PendingInvitationsList } from '@/components/invitations/pending-invitations-list';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyInvitationsPage(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <InvitationsContent params={props.params} />
    </Suspense>
  );
}

async function InvitationsContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'invitations' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings/invitations`);
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok' || !canManageInvitations(workspace.workspace.role)) {
    notFound();
  }

  const listed = await listFamilyInvitations(supabase, familyId);

  return (
    <div className="space-y-8">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <FamilySettingsSubnav familyId={familyId} showInvitations />
      <InviteMemberForm
        familyId={familyId}
        invitableRoles={invitableRolesForActor(workspace.workspace.role)}
      />
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h2 id="pending-invites-heading" className="text-lg font-semibold">
          {t('list.heading')}
        </h2>
        {listed.status === 'ok' ? (
          <PendingInvitationsList familyId={familyId} invitations={listed.invitations} />
        ) : (
          <p className="text-sm text-destructive" role="alert">
            {t('errors.loadFailed')}
          </p>
        )}
      </section>
    </div>
  );
}
