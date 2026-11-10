'use client';

import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  className?: string;
}>;

/** Inline language and theme controls for app chrome (no card wrapper). */
export function CompactUiPreferences({ className }: Props) {
  const t = useTranslations('uiPreferences');

  return (
    <div
      aria-label={t('legend')}
      className={cn('flex min-w-0 flex-wrap items-end gap-x-6 gap-y-3', className)}
    >
      <p className="sr-only">{t('hint')}</p>
      <LanguageSwitcher className="min-w-[10rem] flex-1 sm:flex-none" />
      <ThemeSwitcher className="min-w-[10rem] flex-1 sm:flex-none" />
    </div>
  );
}
