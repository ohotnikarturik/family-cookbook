'use client';

import type { FamilyRole } from '@family-cookbook/contracts';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { createInvitationAction, type CreateInvitationState } from '@/app/actions/invitations';
import { Hint } from '@/components/product/hint';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = Readonly<{
  familyId: string;
  /** Computed on the server; this component only offers what it is given. */
  invitableRoles: FamilyRole[];
}>;

export function InviteMemberForm({ familyId, invitableRoles }: Props) {
  const tr = useTranslations('invitations');
  const trRoles = useTranslations('family.roles');
  const trRoleDescriptions = useTranslations('family.roleDescriptions');
  const router = useRouter();
  const defaultRole: FamilyRole = invitableRoles.includes('viewer')
    ? 'viewer'
    : (invitableRoles[0] ?? 'viewer');
  const [selectedRole, setSelectedRole] = useState<FamilyRole>(defaultRole);
  const [state, action, pending] = useActionState<CreateInvitationState, FormData>(
    async (prev, formData) => {
      const result = await createInvitationAction(prev, formData);
      // The form resets after a successful send; keep the role description in step with it.
      if (result?.ok === true) {
        setSelectedRole(defaultRole);
      }
      return result;
    },
    null,
  );

  useEffect(() => {
    if (state !== null) {
      router.refresh();
    }
  }, [state, router]);

  const emailId = useId();
  const roleId = useId();
  const roleHintId = `${roleId}-hint`;

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
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value as FamilyRole)}
          aria-describedby={roleHintId}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {invitableRoles.map((role) => (
            <option key={role} value={role}>
              {trRoles(role)}
            </option>
          ))}
        </select>
        <Hint
          id={roleHintId}
          more={{
            summary: tr('form.rolesSummary'),
            content: (
              <dl className="space-y-2">
                {invitableRoles.map((role) => (
                  <div key={role}>
                    <dt className="font-medium">{trRoles(role)}</dt>
                    <dd>{trRoleDescriptions(role)}</dd>
                  </div>
                ))}
              </dl>
            ),
          }}
        >
          {trRoleDescriptions(selectedRole)}
        </Hint>
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
