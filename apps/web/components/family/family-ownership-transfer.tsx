'use client';

import type { FamilyRole } from '@family-cookbook/contracts';
import { useActionState, useId, useState } from 'react';

import {
  transferFamilyOwnershipAction,
  type FamilyOwnershipTransferActionState,
} from '@/app/actions/family-ownership-transfer';
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

type Candidate = Readonly<{
  userId: string;
  label: string;
}>;

type FormerOwnerRole = Exclude<FamilyRole, 'owner'>;

type TransferLabels = Readonly<{
  sectionTitle: string;
  sectionDescription: string;
  openDialog: string;
  dialogTitle: string;
  dialogDescription: string;
  newOwnerField: string;
  formerRoleField: string;
  confirmLabel: string;
  submit: string;
  submitting: string;
  cancel: string;
  chooseMember: string;
  roleLabels: Readonly<Record<FormerOwnerRole, string>>;
}>;

type Props = Readonly<{
  familyId: string;
  candidates: readonly Candidate[];
  formerOwnerRoles: readonly FormerOwnerRole[];
  labels: TransferLabels;
}>;

export function FamilyOwnershipTransferSection({
  familyId,
  candidates,
  formerOwnerRoles,
  labels,
}: Props) {
  const [open, setOpen] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [newOwnerUserId, setNewOwnerUserId] = useState('');
  const confirmId = useId();
  const newOwnerFieldId = useId();
  const formerRoleFieldId = useId();
  const headingId = useId();

  const [state, action, pending] = useActionState<
    FamilyOwnershipTransferActionState | null,
    FormData
  >(transferFamilyOwnershipAction, null);

  if (candidates.length === 0) {
    return null;
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmChecked(false);
      setNewOwnerUserId('');
    }
  }

  const canSubmit = confirmChecked && newOwnerUserId !== '' && !pending;
  const errorMessage = state?.ok === false ? state.message : null;

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="space-y-1">
        <h3 id={headingId} className="text-base font-semibold text-foreground">
          {labels.sectionTitle}
        </h3>
        <p className="text-sm text-muted-foreground">{labels.sectionDescription}</p>
      </div>
      {!open && errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
            {labels.openDialog}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.dialogTitle}</DialogTitle>
            <DialogDescription>{labels.dialogDescription}</DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <input type="hidden" name="familyId" value={familyId} />
            <input type="hidden" name="confirm" value={confirmChecked ? 'true' : 'false'} />
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor={newOwnerFieldId}>{labels.newOwnerField}</Label>
              <select
                id={newOwnerFieldId}
                name="newOwnerUserId"
                required
                value={newOwnerUserId}
                disabled={pending}
                onChange={(event) => setNewOwnerUserId(event.target.value)}
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{labels.chooseMember}</option>
                {candidates.map((candidate) => (
                  <option key={candidate.userId} value={candidate.userId}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={formerRoleFieldId}>{labels.formerRoleField}</Label>
              <select
                id={formerRoleFieldId}
                name="formerOwnerRole"
                defaultValue="admin"
                disabled={pending}
                className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {formerOwnerRoles.map((role) => (
                  <option key={role} value={role}>
                    {labels.roleLabels[role]}
                  </option>
                ))}
              </select>
            </div>
            <label htmlFor={confirmId} className="flex min-h-11 cursor-pointer items-start gap-3">
              <input
                id={confirmId}
                type="checkbox"
                className="mt-3 size-5 shrink-0 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                checked={confirmChecked}
                disabled={pending}
                onChange={(event) => setConfirmChecked(event.target.checked)}
              />
              <span className="pt-2 text-sm leading-snug text-foreground">
                {labels.confirmLabel}
              </span>
            </label>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {labels.cancel}
              </Button>
              <Button type="submit" className="min-h-11" disabled={!canSubmit}>
                {pending ? labels.submitting : labels.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
