'use client';

import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  className?: string;
}>;

/** Compact language and theme row for auth and marketing pages. */
export function AuthFooterPreferences({ className }: Props) {
  const t = useTranslations('uiPreferences');

  return (
    <footer
      aria-label={t('legend')}
      className={cn(
        'flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <p className="sr-only">{t('hint')}</p>
      <LanguageSwitcher variant="compact" className="min-w-[10rem] flex-1 sm:max-w-xs" />
      <ThemeSwitcher variant="compact" className="flex-1 sm:max-w-md" />
    </footer>
  );
}
