import { startTransition, type FormEvent } from 'react';

/**
 * Submit handler for a form whose fields must keep what the user chose after saving.
 *
 * React 19 resets the fields of a `<form action={fn}>` to their HTML defaults once the action
 * finishes. For a select that means the first option, and for an input the old default until the
 * refreshed page arrives, so a saved choice flashed back to something else. Calling the action
 * from `onSubmit` inside a transition keeps the pending state and skips the reset.
 */
export function submitWithoutReset(action: (formData: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  };
}
