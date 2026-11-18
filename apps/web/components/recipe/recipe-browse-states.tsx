import type { ReactNode } from 'react';

import { StatusRow } from '@/components/product/status-row';

type Props = Readonly<{
  variant: 'empty' | 'forbidden' | 'error' | 'invalidFilters';
  title?: string;
  description: string;
  /** Optional next step under the message, e.g. a "Clear filters" link. */
  action?: ReactNode;
}>;

export function RecipeBrowseStates({ variant, title, description, action }: Props) {
  const tone =
    variant === 'forbidden' ? 'warning' : variant === 'error' ? 'destructive' : 'neutral';
  return (
    <div className="space-y-3">
      <StatusRow tone={tone} description={description} {...(title ? { title } : {})} />
      {action}
    </div>
  );
}
