'use client';

import type { UpdateFamilyInput } from '@family-cookbook/contracts';
import { useActionState, useId } from 'react';
import { useTranslations } from 'next-intl';

import {
  updateFamilySettingsAction,
  type FamilySettingsActionState,
} from '@/app/actions/family-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { locales } from '@/i18n/routing';

type Props = Readonly<{
  familyId: string;
  name: string;
  defaultLanguage: UpdateFamilyInput['defaultLanguage'];
  canEdit: boolean;
}>;

export function FamilySettingsForm({ familyId, name, defaultLanguage, canEdit }: Props) {
  const t = useTranslations('family.settings');
  const tLocale = useTranslations('locale.languages');
  const [state, action, pending] = useActionState<FamilySettingsActionState | null, FormData>(
    updateFamilySettingsAction,
    null,
  );

  const nameId = useId();
  const langId = useId();

  if (!canEdit) {
    return (
      <dl className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div className="space-y-1">
          <dt className="text-sm text-muted-foreground">{t('nameLabel')}</dt>
          <dd className="text-base font-medium text-foreground">{name}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-sm text-muted-foreground">{t('defaultLanguageLabel')}</dt>
          <dd className="text-base font-medium text-foreground">{tLocale(defaultLanguage)}</dd>
        </div>
        <p className="text-sm text-muted-foreground">{t('readOnlyNote')}</p>
      </dl>
    );
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <input type="hidden" name="familyId" value={familyId} />
      <div className="space-y-2">
        <Label htmlFor={nameId}>{t('nameLabel')}</Label>
        <Input
          id={nameId}
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={120}
          defaultValue={name}
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
          defaultValue={defaultLanguage}
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
