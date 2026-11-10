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

type SwitcherVariant = 'default' | 'compact';

export function ThemeSwitcher({
  className,
  variant = 'default',
}: Readonly<{ className?: string; variant?: SwitcherVariant }>) {
  const t = useTranslations('theme');
  const { preference, ready, setPreference } = useTheme();
  const inputSize = variant === 'compact' ? 'size-4' : 'size-6';
  const radioName = variant === 'compact' ? `${THEME_COOKIE}-compact` : THEME_COOKIE;

  return (
    <fieldset className={cn(variant === 'compact' ? 'space-y-1.5' : 'space-y-3', className)}>
      <legend
        className={cn('font-medium text-foreground', variant === 'compact' ? 'text-xs' : 'text-sm')}
      >
        {t('label')}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map(({ value, id }) => (
          <Label
            key={value}
            htmlFor={variant === 'compact' ? `${id}-compact` : id}
            className={cn(
              'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg font-normal',
              variant === 'compact' ? 'px-2 text-xs' : 'gap-3 px-3',
            )}
          >
            <input
              id={variant === 'compact' ? `${id}-compact` : id}
              type="radio"
              name={radioName}
              value={value}
              checked={ready && preference === value}
              onChange={() => setPreference(value)}
              className={cn(
                'shrink-0 accent-primary focus-visible:ring-ring focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-offset-2 focus-visible:outline-none',
                inputSize,
              )}
            />
            {value === 'system' ? t('system') : value === 'light' ? t('light') : t('dark')}
          </Label>
        ))}
      </div>
    </fieldset>
  );
}
