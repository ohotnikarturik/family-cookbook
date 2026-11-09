'use client';

import { useTranslations } from 'next-intl';

import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  className?: string;
}>;

export function UiPreferencesControls({ className }: Props) {
  const t = useTranslations('uiPreferences');

  return (
    <section
      aria-label={t('legend')}
      className={cn(
        'grid gap-6 rounded-xl border border-border bg-card/60 p-4 shadow-sm sm:grid-cols-2',
        className,
      )}
    >
      <p className="sr-only">{t('hint')}</p>
      <LanguageSwitcher />
      <ThemeSwitcher />
    </section>
  );
}
