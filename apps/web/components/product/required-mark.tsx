'use client';

import { useTranslations } from 'next-intl';

/**
 * Visible "(required)" after a label. It is hidden from screen readers on purpose: the input
 * already has the `required` attribute, so a screen reader announces it once.
 */
export function RequiredMark() {
  const t = useTranslations('common');
  return (
    <span aria-hidden className="ms-1 text-sm font-normal text-muted-foreground">
      ({t('required')})
    </span>
  );
}
