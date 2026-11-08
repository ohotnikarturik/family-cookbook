'use client';

import { useTranslations } from 'next-intl';

import { LoadingStrip } from '@/components/product/status-row';

export function RecipeLoading({
  namespace = 'recipes.status',
}: Readonly<{ namespace?: 'recipes.status' | 'family.dashboard' }>) {
  const t = useTranslations(namespace);
  return <LoadingStrip label={t('loading')} />;
}
