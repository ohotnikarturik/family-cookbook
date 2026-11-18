import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = Readonly<{
  /** Id of the inline text, so a control can point at it with `aria-describedby`. */
  id?: string | undefined;
  /** Short inline help shown under a field. */
  children?: ReactNode;
  /**
   * Optional longer explanation behind a "What is this?" style toggle. It is a native
   * `<details>`, so it works by keyboard and touch without JavaScript and never needs hover.
   * Its text is not part of the field description: screen readers reach it by opening it.
   */
  more?: Readonly<{ summary: string; content: ReactNode }> | undefined;
  className?: string | undefined;
}>;

/**
 * Contextual help under a field or inside a dialog. Takes translated strings from the caller,
 * like `FormField`, so it works in Server and Client Components alike.
 */
export function Hint({ id, children, more, className }: Props) {
  return (
    <div className={cn('space-y-1', className)}>
      {children ? (
        <p id={id} className="text-sm text-muted-foreground">
          {children}
        </p>
      ) : null}
      {more ? (
        <details className="group">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-primary underline-offset-4 marker:content-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
            />
            {more.summary}
          </summary>
          <div className="rounded-md bg-surface-sunken px-3 py-2 text-sm text-foreground">
            {more.content}
          </div>
        </details>
      ) : null}
    </div>
  );
}
