import { cn } from '@/lib/utils';

type Props = Readonly<{
  /** Visible only while the button it explains is disabled for this reason. */
  show: boolean;
  children: string;
  className?: string;
}>;

/**
 * Says in plain text why a button is disabled. A disabled button cannot be focused, so the reason
 * is visible text next to it and not only an attribute.
 */
export function DisabledReason({ show, children, className }: Props) {
  if (!show) return null;
  return (
    <p data-disabled-reason className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}
