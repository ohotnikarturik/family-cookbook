'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';

import { acceptInvitationAction, type AcceptInvitationState } from '@/app/actions/invitations';
import { Button } from '@/components/ui/button';

type Props = Readonly<{ token: string }>;

export function AcceptInvitationForm({ token }: Props) {
  const t = useTranslations('inviteAccept');
  const [state, action, pending] = useActionState<AcceptInvitationState, FormData>(
    acceptInvitationAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} readOnly />
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
        {pending ? t('accepting') : t('submit')}
      </Button>
    </form>
  );
}
