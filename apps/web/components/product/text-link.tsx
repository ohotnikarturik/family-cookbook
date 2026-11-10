import { forwardRef, type ComponentProps } from 'react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

export const textLinkClassName =
  'inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export const TextLink = forwardRef<HTMLAnchorElement, Props>(function TextLink(
  { className, ...props },
  ref,
) {
  return <Link ref={ref} className={cn(textLinkClassName, className)} {...props} />;
});
