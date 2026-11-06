'use client';

import { useTranslations } from 'next-intl';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { THEME_COOKIE, type ThemePreference } from '@/lib/theme';

import { useTheme } from './ThemeProvider';

const options: { value: ThemePreference; id: string }[] = [
  { value: 'system', id: 'theme-system' },
  { value: 'light', id: 'theme-light' },
  { value: 'dark', id: 'theme-dark' },
];

export function ThemeSwitcher({ className }: Readonly<{ className?: string }>) {
  const t = useTranslations('theme');
  const { preference, ready, setPreference } = useTheme();

  return (
    <fieldset className={cn('space-y-3', className)}>
      <legend className="text-sm font-medium text-foreground">{t('label')}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value, id }) => (
          <Label
            key={value}
            htmlFor={id}
            className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 font-normal"
          >
            <input
              id={id}
              type="radio"
              name={THEME_COOKIE}
              value={value}
              checked={ready && preference === value}
              onChange={() => setPreference(value)}
              className="size-6 shrink-0 accent-primary focus-visible:ring-ring focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-offset-2 focus-visible:outline-none"
            />
            {value === 'system' ? t('system') : value === 'light' ? t('light') : t('dark')}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
