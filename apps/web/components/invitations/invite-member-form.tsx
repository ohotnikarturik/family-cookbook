'use client';

import type { FamilyRole } from '@family-cookbook/contracts';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';

import { createInvitationAction, type CreateInvitationState } from '@/app/actions/invitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = Readonly<{
  familyId: string;
  invitableRoles: FamilyRole[];
}>;

export function InviteMemberForm({ familyId, invitableRoles }: Props) {
  const tr = useTranslations('invitations');
  const trRoles = useTranslations('family.roles');
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateInvitationState, FormData>(
    createInvitationAction,
    null,
  );

  useEffect(() => {
    if (state !== null) {
      router.refresh();
    }
  }, [state, router]);

  const emailId = useId();
  const roleId = useId();

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="familyId" value={familyId} readOnly />
      <div className="space-y-2">
        <Label htmlFor={emailId}>{tr('form.emailLabel')}</Label>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
          aria-invalid={state?.ok === false}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={roleId}>{tr('form.roleLabel')}</Label>
        <select
          id={roleId}
          name="role"
          required
          disabled={pending}
          defaultValue="viewer"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {invitableRoles.map((role) => (
            <option key={role} value={role}>
              {trRoles(role)}
            </option>
          ))}
        </select>
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm text-foreground" role="status">
          {tr('form.sent')}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
        {pending ? tr('form.sending') : tr('form.submit')}
      </Button>
    </form>
  );
}
