'use client';

import type { FamilyRole, MembershipStatus } from '@family-cookbook/contracts';
import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  setFamilyMemberRoleAction,
  setFamilyMemberStatusAction,
  type FamilyMemberAdminActionState,
} from '@/app/actions/family-member-admin';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { nativeSelectClassName } from '@/components/ui/native-select';
import { submitWithoutReset } from '@/lib/submit-without-reset';

type Props = Readonly<{
  familyId: string;
  member: Readonly<{
    userId: string;
    label: string;
    role: FamilyRole;
    status: MembershipStatus;
    /** Computed on the server; this component only renders what it is given. */
    roleOptions: readonly FamilyRole[];
  }>;
}>;

type ActionState = FamilyMemberAdminActionState | null;

/**
 * "Change" button for one manageable member row: a dialog with the role select (with a
 * plain description of the selected role) and suspend / reactivate. Both forms post to the
 * existing server actions; the server and RLS decide whether the change is allowed.
 */
export function FamilyMemberChangeDialog({ familyId, member }: Props) {
  const t = useTranslations('family.members.admin');
  const tRoles = useTranslations('family.roles');
  const tRoleDescriptions = useTranslations('family.roleDescriptions');
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<FamilyRole>(member.role);
  const [saved, setSaved] = useState(false);
  const roleFieldId = useId();
  const roleDescriptionId = useId();

  function closeAfter(action: (prev: ActionState, formData: FormData) => Promise<ActionState>) {
    return async (prev: ActionState, formData: FormData): Promise<ActionState> => {
      const result = await action(prev, formData);
      if (result?.ok === true) {
        setSaved(true);
        setOpen(false);
      }
      return result;
    };
  }

  const [roleState, roleAction, rolePending] = useActionState<ActionState, FormData>(
    closeAfter(setFamilyMemberRoleAction),
    null,
  );
  const [statusState, statusAction, statusPending] = useActionState<ActionState, FormData>(
    closeAfter(setFamilyMemberStatusAction),
    null,
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setSelectedRole(member.role);
      setSaved(false);
    }
  }

  const pending = rolePending || statusPending;
  const roleLocked = member.status !== 'active';
  const active = member.status === 'active';
  const error =
    roleState?.ok === false
      ? roleState.message
      : statusState?.ok === false
        ? statusState.message
        : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 px-4"
            aria-label={t('changeLabel', { name: member.label })}
          >
            {t('change')}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogTitle', { name: member.label })}</DialogTitle>
            <DialogDescription>{t('dialogDescription', { name: member.label })}</DialogDescription>
          </DialogHeader>

          <form onSubmit={submitWithoutReset(roleAction)} className="space-y-3">
            <input type="hidden" name="familyId" value={familyId} />
            <input type="hidden" name="memberUserId" value={member.userId} />
            <div className="space-y-2">
              <Label htmlFor={roleFieldId}>{t('roleField')}</Label>
              <select
                id={roleFieldId}
                name="newRole"
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value as FamilyRole)}
                disabled={pending || roleLocked}
                aria-describedby={roleDescriptionId}
                className={nativeSelectClassName}
              >
                {member.roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {tRoles(role)}
                  </option>
                ))}
              </select>
              <p id={roleDescriptionId} className="text-sm text-muted-foreground">
                {roleLocked ? t('roleLocked') : tRoleDescriptions(selectedRole)}
              </p>
            </div>
            <Button
              type="submit"
              className="min-h-11 w-full whitespace-normal sm:w-auto"
              disabled={pending || roleLocked || selectedRole === member.role}
            >
              {rolePending ? t('savingRole') : t('saveRole')}
            </Button>
          </form>

          <form action={statusAction} className="space-y-3 border-t border-border pt-4">
            <input type="hidden" name="familyId" value={familyId} />
            <input type="hidden" name="memberUserId" value={member.userId} />
            <input type="hidden" name="newStatus" value={active ? 'suspended' : 'active'} />
            <p className="text-sm text-muted-foreground">
              {active ? t('suspendHelp') : t('reactivateHelp')}
            </p>
            <Button
              type="submit"
              variant={active ? 'outline' : 'secondary'}
              className="min-h-11 w-full whitespace-normal sm:w-auto"
              disabled={pending}
            >
              {statusPending
                ? active
                  ? t('suspending')
                  : t('reactivating')
                : active
                  ? t('suspend')
                  : t('reactivate')}
            </Button>
          </form>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status" className="text-sm text-muted-foreground">
        {saved ? t('saved') : null}
      </p>
    </div>
  );
}
