'use client';

import type { UpdateFamilyInput } from '@family-cookbook/contracts';
import { useActionState, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  updateFamilySettingsAction,
  type FamilySettingsActionState,
} from '@/app/actions/family-settings';
import { RequiredMark } from '@/components/product/required-mark';
import { DisabledReason } from '@/components/product/disabled-reason';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { locales } from '@/i18n/routing';
import { useFormBaseline } from '@/lib/form-dirty';
import { languageLabel } from '@/lib/language-label';
import { submitWithoutReset } from '@/lib/submit-without-reset';

type Props = Readonly<{
  familyId: string;
  name: string;
  defaultLanguage: UpdateFamilyInput['defaultLanguage'];
  canEdit: boolean;
}>;

export function FamilySettingsForm({ familyId, name, defaultLanguage, canEdit }: Props) {
  const locale = useLocale();
  const t = useTranslations('family.settings');
  const tCommon = useTranslations('common.disabledReason');
  const tLocale = useTranslations('locale.languages');
  const [state, action, pending] = useActionState<FamilySettingsActionState | null, FormData>(
    updateFamilySettingsAction,
    null,
  );

  const [nameValue, setNameValue] = useState(name);
  const [languageValue, setLanguageValue] = useState<string>(defaultLanguage);
  const { dirty } = useFormBaseline(
    { name, defaultLanguage: defaultLanguage as string },
    { name: nameValue, defaultLanguage: languageValue },
    state?.ok === true ? state : null,
  );

  const nameId = useId();
  const langId = useId();

  if (!canEdit) {
    return (
      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <dl className="space-y-4">
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">{t('nameLabel')}</dt>
            <dd className="text-base font-medium text-foreground">{name}</dd>
          </div>
          <div className="space-y-1">
            <dt className="text-sm text-muted-foreground">{t('defaultLanguageLabel')}</dt>
            <dd className="text-base font-medium text-foreground">
              {languageLabel(defaultLanguage, locale)}
            </dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">{t('readOnlyNote')}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="familyId" value={familyId} />
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
          className="min-h-11"
          aria-invalid={state?.ok === false}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={langId}>{t('defaultLanguageLabel')}</Label>
        <select
          id={langId}
          name="defaultLanguage"
          value={languageValue}
          onChange={(event) => setLanguageValue(event.target.value)}
          disabled={pending}
          className="flex min-h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {state.message}
        </p>
      ) : null}
      {state?.ok === true && !dirty ? (
        <p className="text-sm text-muted-foreground" role="status">
          {t('saved')}
        </p>
      ) : null}
      <div className="space-y-2">
        <Button type="submit" disabled={pending || !dirty} className="min-h-11 w-full sm:w-auto">
          {pending ? t('saving') : t('save')}
        </Button>
        <DisabledReason show={!dirty && !pending}>{tCommon('unchanged')}</DisabledReason>
      </div>
    </form>
  );
}
