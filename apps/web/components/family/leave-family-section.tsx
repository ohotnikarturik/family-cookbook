'use client';

import { useActionState, useId, useState } from 'react';

import { leaveFamilyAction, type LeaveFamilyActionState } from '@/app/actions/family-leave';
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

type LeaveLabels = Readonly<{
  sectionTitle: string;
  sectionDescription: string;
  openDialog: string;
  dialogTitle: string;
  dialogDescription: string;
  submit: string;
  submitting: string;
  cancel: string;
}>;

type Props = Readonly<{
  familyId: string;
  labels: LeaveLabels;
}>;

/** Shown only to members the server says may leave; the RPC stays the authority. */
export function LeaveFamilySection({ familyId, labels }: Props) {
  const [open, setOpen] = useState(false);
  const headingId = useId();
  const [state, action, pending] = useActionState<LeaveFamilyActionState | null, FormData>(
    leaveFamilyAction,
    null,
  );

  const errorMessage = state?.ok === false ? state.message : null;

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="space-y-1">
        <h2 id={headingId} className="text-base font-semibold text-foreground">
          {labels.sectionTitle}
        </h2>
        <p className="text-sm text-muted-foreground">{labels.sectionDescription}</p>
      </div>
      {!open && errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
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
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                {labels.cancel}
              </Button>
              <Button type="submit" variant="secondary" className="min-h-11" disabled={pending}>
                {pending ? labels.submitting : labels.submit}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
