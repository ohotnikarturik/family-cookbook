'use client';

import type { FamilySummary } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { switchFamilyAction } from '@/app/actions/family';

type Props = Readonly<{
  families: readonly FamilySummary[];
  currentFamilyId: string;
  /** Stable id for the select (a11y + e2e). */
  selectId?: string;
}>;

export function FamilySwitcher({ families, currentFamilyId, selectId = 'family-switcher' }: Props) {
  const t = useTranslations('family');
  const [pending, startTransition] = useTransition();

  if (families.length <= 1) {
    return null;
  }

  return (
    <form
      className="flex min-w-0 max-w-[11rem] items-center sm:max-w-xs"
      action={(formData) => {
        startTransition(async () => {
          await switchFamilyAction(formData);
        });
      }}
    >
      <select
        id={selectId}
        name="familyId"
        aria-label={t('switcher.label')}
        defaultValue={currentFamilyId}
        disabled={pending}
        aria-busy={pending || undefined}
        className="h-11 w-full min-w-0 rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        onChange={(event) => {
          event.currentTarget.form?.requestSubmit();
        }}
      >
        {families.map((family) => (
          <option key={family.id} value={family.id}>
            {family.name}
          </option>
        ))}
      </select>
      <p className="sr-only" aria-live="polite">
        {pending ? t('switcher.switching') : null}
      </p>
    </form>
  );
}
