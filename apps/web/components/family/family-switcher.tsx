'use client';

import type { FamilySummary } from '@family-cookbook/contracts';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { switchFamilyAction } from '@/app/actions/family';
import { Label } from '@/components/ui/label';

type Props = Readonly<{
  families: FamilySummary[];
  currentFamilyId: string;
}>;

export function FamilySwitcher({ families, currentFamilyId }: Props) {
  const t = useTranslations('family');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (families.length <= 1) {
    const only = families[0];
    if (!only) {
      return null;
    }
    return (
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{only.name}</span>
      </p>
    );
  }

  return (
    <form
      className="flex min-w-0 flex-col gap-2 sm:max-w-xs"
      action={(formData) => {
        startTransition(async () => {
          await switchFamilyAction(formData);
          router.refresh();
        });
      }}
    >
      <Label htmlFor="family-switcher">{t('switcher.label')}</Label>
      <select
        id="family-switcher"
        name="familyId"
        defaultValue={currentFamilyId}
        disabled={pending}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
