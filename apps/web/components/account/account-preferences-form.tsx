'use client';

import type { OwnProfile } from '@family-cookbook/contracts';
import { useActionState, useId, useState } from 'react';
import { useTranslations } from 'next-intl';

import {
  updateAccountProfileAction,
  type AccountProfileActionState,
} from '@/app/actions/account-profile';
import { RequiredMark } from '@/components/product/required-mark';
import { DisabledReason } from '@/components/product/disabled-reason';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFormBaseline } from '@/lib/form-dirty';
import { submitWithoutReset } from '@/lib/submit-without-reset';

type Props = Readonly<{
  profile: OwnProfile;
}>;

/**
 * The display name is the only field that needs a Save button. Language and appearance apply as
 * soon as they are chosen, with the same switchers as the header.
 */
export function AccountPreferencesForm({ profile }: Props) {
  const t = useTranslations('account.preferences');
  const tCommon = useTranslations('common.disabledReason');
  const [state, action, pending] = useActionState<AccountProfileActionState | null, FormData>(
    updateAccountProfileAction,
    null,
  );
  const [displayName, setDisplayName] = useState(profile.displayName);
  const { dirty } = useFormBaseline(
    profile.displayName,
    displayName,
    state?.ok === true ? state : null,
  );

  const nameId = useId();

  return (
    <form
      onSubmit={submitWithoutReset(action)}
      className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor={nameId}>
          {t('displayNameLabel')}
          <RequiredMark />
        </Label>
        <Input
          id={nameId}
          name="displayName"
          type="text"
          required
          minLength={1}
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="name"
          disabled={pending}
          className="min-h-11"
          aria-invalid={state?.ok === false}
        />
        <p className="text-sm text-muted-foreground">{t('displayNameHint')}</p>
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
