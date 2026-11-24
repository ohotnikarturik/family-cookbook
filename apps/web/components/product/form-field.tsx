import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';

import { Hint } from '@/components/product/hint';
import { RequiredMark } from '@/components/product/required-mark';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  id: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** Shows a visible "(required)" after the label; the control carries `required` itself. */
  required?: boolean;
  children: ReactNode;
  className?: string;
}>;

export function FormField({ id, label, hint, error, required, children, className }: Props) {
  const describedBy =
    [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') ||
    undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
        ...(error ? { 'aria-invalid': true } : {}),
      })
    : children;

  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <RequiredMark /> : null}
      </Label>
      {control}
      {hint ? <Hint id={`${id}-hint`}>{hint}</Hint> : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
