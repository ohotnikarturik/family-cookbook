'use client';

import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import { createFamilyAction, type CreateFamilyState } from '@/app/actions/family';
import { RequiredMark } from '@/components/product/required-mark';
import { DisabledReason } from '@/components/product/disabled-reason';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { locales } from '@/i18n/routing';

export function CreateFamilyForm() {
  const t = useTranslations('onboarding');
  const tLocale = useTranslations('locale.languages');
  const tCommon = useTranslations('common.disabledReason');
  const [state, action, pending] = useActionState<CreateFamilyState, FormData>(
    createFamilyAction,
    null,
  );

  const [nameValue, setNameValue] = useState('');
  const nameId = useId();
  const langId = useId();

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          {t('nameLabel')}
          <RequiredMark />
        </Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={120}
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
          autoComplete="organization"
          disabled={pending}
          aria-invalid={state?.ok === false}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={langId}>{t('defaultLanguageLabel')}</Label>
        <select
          id={langId}
          name="defaultLanguage"
          defaultValue="en"
          disabled={pending}
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {locales.map((code) => (
            <option key={code} value={code}>
              {tLocale(code)}
            </option>
          ))}
        </select>
        <p className="text-sm text-muted-foreground">{t('defaultLanguageHint')}</p>
      </div>
      {state?.ok === false ? (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Button
          type="submit"
          disabled={pending || nameValue.trim() === ''}
          className="min-h-11 w-full sm:w-auto"
        >
          {pending ? t('creating') : t('submit')}
        </Button>
        <DisabledReason show={nameValue.trim() === '' && !pending}>
          {tCommon('familyNameNeeded')}
        </DisabledReason>
      </div>
    </form>
  );
}
