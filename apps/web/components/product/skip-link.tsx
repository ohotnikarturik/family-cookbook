import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = Readonly<{
  href: string;
  children: ReactNode;
  className?: string;
}>;

/**
 * Skip link: clipped off-screen (`sr-only`), full primary control on keyboard focus.
 * Visual styles use `focus-visible:` so `not-sr-only` does not zero out padding.
 */
export function SkipLink({ href, children, className }: Props) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only',
        'focus-visible:not-sr-only',
        'focus-visible:fixed focus-visible:left-4 focus-visible:top-4 focus-visible:z-[100]',
        'focus-visible:inline-block',
        'focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2',
        'focus-visible:text-sm focus-visible:font-medium focus-visible:text-primary-foreground',
        'focus-visible:shadow-md focus-visible:transition-transform',
        'focus-visible:outline-none',
        'focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring',
        'focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background',
        className,
      )}
    >
      {children}
    </a>
  );
}
