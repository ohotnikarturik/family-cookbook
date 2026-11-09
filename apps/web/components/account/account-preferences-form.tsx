'use client';

import type { OwnProfile } from '@family-cookbook/contracts';
import { useActionState, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';

import {
  updateAccountProfileAction,
  type AccountProfileActionState,
} from '@/app/actions/account-profile';
import { useTheme } from '@/components/theme/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { locales } from '@/i18n/routing';
import { type ThemePreference } from '@/lib/theme';

type Props = Readonly<{
  profile: OwnProfile;
}>;

const themeOptions: ThemePreference[] = ['system', 'light', 'dark'];

export function AccountPreferencesForm({ profile }: Props) {
  const t = useTranslations('account.preferences');
  const tLocale = useTranslations('locale.languages');
  const tTheme = useTranslations('theme');
  const [state, action, pending] = useActionState<AccountProfileActionState | null, FormData>(
    updateAccountProfileAction,
    null,
  );
  const { syncPreference } = useTheme();

  useEffect(() => {
    if (state?.ok !== true) return;
    syncPreference(state.themePreference);
  }, [state, syncPreference]);

  const nameId = useId();
  const langId = useId();

  return (
    <form
      action={action}
      className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor={nameId}>{t('displayNameLabel')}</Label>
        <Input
          id={nameId}
          name="displayName"
          type="text"
          required
          minLength={1}
          maxLength={80}
          defaultValue={profile.displayName}
          autoComplete="name"
          disabled={pending}
          className="min-h-11"
          aria-invalid={state?.ok === false}
        />
        <p className="text-sm text-muted-foreground">{t('displayNameHint')}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={langId}>{t('languageLabel')}</Label>
        <select
          id={langId}
          name="preferredLanguage"
          defaultValue={profile.preferredLanguage}
          disabled={pending}
          className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locales.map((code) => (
            <option key={code} value={code}>
              {tLocale(code)}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">{t('languageHint')}</p>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">{t('themeLabel')}</legend>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {themeOptions.map((value) => (
            <Label
              key={value}
              htmlFor={`pref-theme-${value}`}
              className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 font-normal has-[:checked]:border-primary"
            >
              <input
                id={`pref-theme-${value}`}
                type="radio"
                name="themePreference"
                value={value}
                defaultChecked={profile.themePreference === value}
                disabled={pending}
                className="size-5 shrink-0 accent-primary"
              />
              {value === 'system' ? tTheme('system') : value === 'light' ? tTheme('light') : tTheme('dark')}
            </Label>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{t('themeHint')}</p>
      </fieldset>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      {state?.ok === true ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('saved')}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="min-h-11 w-full sm:w-auto">
        {pending ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
