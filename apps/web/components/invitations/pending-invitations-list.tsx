'use client';

import type { PendingInvitation } from '@family-cookbook/contracts';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';
import { useFormatter, useTranslations } from 'next-intl';

import { revokeInvitationAction, type RevokeInvitationState } from '@/app/actions/invitations';
import { Button } from '@/components/ui/button';

type Props = Readonly<{
  familyId: string;
  invitations: PendingInvitation[];
}>;

export function PendingInvitationsList({ familyId, invitations }: Props) {
  const t = useTranslations('invitations');
  const trRoles = useTranslations('family.roles');
  const format = useFormatter();

  if (invitations.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('list.empty')}</p>;
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-sm">
      {invitations.map((invite) => (
        <li
          key={invite.id}
          className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-medium break-all text-foreground">{invite.email}</p>
            <p className="text-muted-foreground">
              {trRoles(invite.role)} ·{' '}
              {t(invite.expired ? 'list.expired' : 'list.expires', {
                date: format.dateTime(new Date(invite.expiresAt), { dateStyle: 'medium' }),
              })}
            </p>
          </div>
          <RevokeInvitationForm familyId={familyId} invitationId={invite.id} />
        </li>
      ))}
    </ul>
  );
}

function RevokeInvitationForm({
  familyId,
  invitationId,
}: {
  familyId: string;
  invitationId: string;
}) {
  const t = useTranslations('invitations');
  const router = useRouter();
  const [state, action, pending] = useActionState<RevokeInvitationState, FormData>(
    revokeInvitationAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="familyId" value={familyId} readOnly />
      <input type="hidden" name="invitationId" value={invitationId} readOnly />
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" className="min-h-11" disabled={pending}>
        {pending ? t('list.revoking') : t('list.revoke')}
      </Button>
    </form>
  );
}
