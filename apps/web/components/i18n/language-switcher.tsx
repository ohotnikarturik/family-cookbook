'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useId, useTransition } from 'react';

import { setLocalePreferenceAction } from '@/app/actions/locale';
import { Label } from '@/components/ui/label';
import { usePathname, useRouter } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { localeSwitchTargetPath } from '@/lib/locale-switch-path';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: Readonly<{ className?: string }>) {
  return (
    <Suspense fallback={<LanguageSwitcherFallback className={className} />}>
      <LanguageSwitcherInner className={className} />
    </Suspense>
  );
}

function LanguageSwitcherFallback({ className }: Readonly<{ className?: string | undefined }>) {
  const t = useTranslations('locale');
  const fieldId = useId();

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId}>{t('label')}</Label>
      <select
        id={fieldId}
        name="ui-language"
        disabled
        aria-busy
        className="flex h-11 w-full max-w-xs rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
      />
    </div>
  );
}

function LanguageSwitcherInner({ className }: Readonly<{ className?: string | undefined }>) {
  const t = useTranslations('locale');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const fieldId = useId();

  function onChange(next: AppLocale) {
    startTransition(async () => {
      await setLocalePreferenceAction(next);
      router.replace(localeSwitchTargetPath(pathname, searchParams), { locale: next });
    });
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={fieldId}>{t('label')}</Label>
      <select
        id={fieldId}
        name="ui-language"
        value={locale}
        disabled={pending}
        onChange={(e) => onChange(e.target.value as AppLocale)}
        className="flex h-11 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background"
        aria-busy={pending}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {t(`languages.${l}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
