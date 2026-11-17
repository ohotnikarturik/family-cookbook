import {
  canManageInvitations,
  listFamilyMembers,
  resolveAccessibleFamily,
} from '@family-cookbook/application';
import { resolveMemberDisplayLabel } from '@family-cookbook/domain';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import {
  assignableMemberRolesForActor,
  canAdministrateTargetMember,
  canManageFamilyMembers,
  canReceiveFamilyOwnership,
  canTransferFamilyOwnership,
} from '@family-cookbook/permissions';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { FamilyMemberAdminSection } from '@/components/family/family-member-directory';
import { FamilySettingsSubnav } from '@/components/shell/family-settings-subnav';
import { FamilyMemberList } from '@/components/family/family-member-list';
import { FamilyOwnershipTransferSection } from '@/components/family/family-ownership-transfer';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyMembersPage(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <MembersContent params={props.params} />
    </Suspense>
  );
}

async function MembersContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family.members' });
  const tRoles = await getTranslations({ locale, namespace: 'family.roles' });
  const tAdmin = await getTranslations({ locale, namespace: 'family.members.admin' });
  const tTransfer = await getTranslations({ locale, namespace: 'family.members.transfer' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  if (!sessionUser) {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings/members`);
  }

  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }

  const listed = await listFamilyMembers(supabase, { familyId });
  if (listed.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/settings/members`);
  }
  if (listed.status !== 'ok') {
    return <MembersFailedState title={t('title')} message={t('errors.loadFailed')} />;
  }

  const memberRows = listed.members.map((member) => ({
    userId: member.userId,
    label: resolveMemberDisplayLabel({
      displayName: member.displayName,
      memberUserId: member.userId,
      actorUserId: sessionUser.id,
      youLabel: t('you'),
      neutralLabel: t('neutralName'),
    }),
    roleLabel: tRoles(member.role),
    role: member.role,
    status: member.status,
    suspended: member.status === 'suspended',
  }));
  const actorRole = workspace.workspace.role;
  const manageableMembers = canManageFamilyMembers(actorRole)
    ? memberRows.filter((member) => canAdministrateTargetMember(actorRole, sessionUser.id, member))
    : [];
  const transferCandidates = canTransferFamilyOwnership(actorRole)
    ? memberRows
        .filter((member) =>
          canReceiveFamilyOwnership(sessionUser.id, {
            userId: member.userId,
            role: member.role,
            status: member.status,
          }),
        )
        .map((member) => ({ userId: member.userId, label: member.label }))
    : [];
  const formerOwnerRoles = assignableMemberRolesForActor('owner').filter(
    (role): role is 'admin' | 'editor' | 'contributor' | 'viewer' => role !== 'owner',
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <FamilySettingsSubnav familyId={familyId} showInvitations={canManageInvitations(actorRole)} />
      <FamilyMemberList
        members={memberRows}
        emptyLabel={t('empty')}
        suspendedLabel={t('suspendedBadge')}
      />
      {transferCandidates.length > 0 ? (
        <FamilyOwnershipTransferSection
          familyId={familyId}
          candidates={transferCandidates}
          formerOwnerRoles={formerOwnerRoles}
          labels={{
            sectionTitle: tTransfer('sectionTitle'),
            sectionDescription: tTransfer('sectionDescription'),
            openDialog: tTransfer('openDialog'),
            dialogTitle: tTransfer('dialogTitle'),
            dialogDescription: tTransfer('dialogDescription'),
            newOwnerField: tTransfer('newOwnerField'),
            formerRoleField: tTransfer('formerRoleField'),
            confirmLabel: tTransfer('confirmLabel'),
            chooseMember: tTransfer('chooseMember'),
            submit: tTransfer('submit'),
            submitting: tTransfer('submitting'),
            cancel: tTransfer('cancel'),
            roleLabels: {
              admin: tRoles('admin'),
              editor: tRoles('editor'),
              contributor: tRoles('contributor'),
              viewer: tRoles('viewer'),
            },
          }}
        />
      ) : null}
      {manageableMembers.length > 0 ? (
        <FamilyMemberAdminSection
          familyId={familyId}
          members={manageableMembers.map((member) => ({
            userId: member.userId,
            label: member.label,
            role: member.role,
            status: member.status,
          }))}
          assignableRoles={assignableMemberRolesForActor(actorRole)}
          sectionTitle={tAdmin('sectionTitle')}
          adminLabels={{
            roleField: tAdmin('roleField'),
            saveRole: tAdmin('saveRole'),
            savingRole: tAdmin('savingRole'),
            suspend: tAdmin('suspend'),
            suspending: tAdmin('suspending'),
            reactivate: tAdmin('reactivate'),
            reactivating: tAdmin('reactivating'),
            manageMember: tAdmin('manageMember'),
            roleLabels: {
              owner: tRoles('owner'),
              admin: tRoles('admin'),
              editor: tRoles('editor'),
              contributor: tRoles('contributor'),
              viewer: tRoles('viewer'),
            },
          }}
        />
      ) : null}
      <p className="text-sm text-muted-foreground">{t('privacyNote')}</p>
    </div>
  );
}

function MembersFailedState({ title, message }: Readonly<{ title: string; message: string }>) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <p className="text-sm text-destructive" role="alert">
        {message}
      </p>
    </div>
  );
}
