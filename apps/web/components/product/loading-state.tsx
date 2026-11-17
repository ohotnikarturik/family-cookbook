'use client';

import { useTranslations } from 'next-intl';

import { Skeleton } from '@/components/ui/skeleton';

/** The one loading placeholder for pages and Suspense fallbacks: visible text, announced politely. */
export function LoadingState() {
  const t = useTranslations('common');
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="space-y-3">
      <p className="text-sm text-muted-foreground">{t('loading')}</p>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  );
}
