'use client';

import { useActionState, useId } from 'react';
import { useTranslations } from 'next-intl';

import { submitSampleDisplayNameAction } from '@/app/actions/sample-profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SampleDisplayNameForm() {
  const t = useTranslations('home.sampleForm');
  const [state, formAction, pending] = useActionState(submitSampleDisplayNameAction, null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  return (
    <form
      action={formAction}
      className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="space-y-2">
        <Label htmlFor={fieldId}>{t('label')}</Label>
        <Input
          id={fieldId}
          name="displayName"
          type="text"
          autoComplete="name"
          disabled={pending}
          placeholder={t('placeholder')}
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? errorId : undefined}
        />
        {state?.ok === false ? (
          <p id={errorId} className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state?.ok === true ? (
          <p className="text-sm text-success" role="status">
            {t('success')}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={pending}>
        {t('submit')}
      </Button>
    </form>
  );
}
