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
import { PendingInvitationsList } from '@/components/invitations/pending-invitations-list';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyInvitationsPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
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
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>
      <InviteMemberForm
        familyId={familyId}
        invitableRoles={invitableRolesForActor(workspace.workspace.role)}
      />
      <section className="space-y-3" aria-labelledby="pending-invites-heading">
        <h3 id="pending-invites-heading" className="text-base font-semibold">
          {t('list.heading')}
        </h3>
        {listed.status === 'ok' ? (
          <PendingInvitationsList familyId={familyId} invitations={listed.invitations} />
        ) : (
          <p className="text-sm text-destructive" role="alert">
            {t('errors.loadFailed')}
          </p>
        )}
      </section>
      <Link
        href={`/f/${familyId}`}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('backDashboard')}
      </Link>
    </div>
  );
}
