import { listFamilyMembers, resolveAccessibleFamily } from '@family-cookbook/application';
import { resolveMemberDisplayLabel } from '@family-cookbook/domain';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { FamilyMemberList } from '@/components/family/family-member-list';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyMembersPage(props: Props) {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted" />}>
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
    return (
      <MembersFailedState
        familyId={familyId}
        title={t('title')}
        message={t('errors.loadFailed')}
        backLabel={t('backDashboard')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </header>
      <FamilyMemberList
        members={listed.members.map((member) => ({
          userId: member.userId,
          label: resolveMemberDisplayLabel({
            displayName: member.displayName,
            memberUserId: member.userId,
            actorUserId: sessionUser.id,
            youLabel: t('you'),
            neutralLabel: t('neutralName'),
          }),
          roleLabel: tRoles(member.role),
          suspended: member.status === 'suspended',
        }))}
        emptyLabel={t('empty')}
        suspendedLabel={t('suspendedBadge')}
      />
      <p className="text-sm text-muted-foreground">{t('privacyNote')}</p>
      <Link
        href={`/f/${familyId}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {t('backDashboard')}
      </Link>
    </div>
  );
}

function MembersFailedState({
  familyId,
  title,
  message,
  backLabel,
}: Readonly<{ familyId: string; title: string; message: string; backLabel: string }>) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-destructive" role="alert">
        {message}
      </p>
      <Link
        href={`/f/${familyId}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {backLabel}
      </Link>
    </div>
  );
}
