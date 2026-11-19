'use client';

import { useId, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { nativeSelectClassName } from '@/components/ui/native-select';
import { useRouter } from '@/i18n/navigation';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  /** Languages still free to add, with names in the UI language (computed on the server). */
  languages: readonly Readonly<{ tag: string; label: string }>[];
}>;

/** One "Add translation" button that opens a language select and goes to that editor. */
export function AddTranslationDialog({ familyId, recipeId, languages }: Props) {
  const t = useTranslations('recipes.translationEditor');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState(languages[0]?.tag ?? '');
  const fieldId = useId();
  // The list can change under an open page (someone else added a translation): never keep a
  // language that is no longer offered.
  const selected = languages.some((item) => item.tag === language)
    ? language
    : (languages[0]?.tag ?? '');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selected === '') {
      return;
    }
    setOpen(false);
    router.push(`/f/${familyId}/recipes/${recipeId}/translations/${encodeURIComponent(selected)}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="min-h-11 w-full sm:w-auto">
          {t('addTranslation')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addDialogTitle')}</DialogTitle>
          <DialogDescription>{t('addDialogDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={fieldId}>{t('languageField')}</Label>
            <select
              id={fieldId}
              value={selected}
              onChange={(event) => setLanguage(event.target.value)}
              className={nativeSelectClassName}
            >
              {languages.map((item) => (
                <option key={item.tag} value={item.tag}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setOpen(false)}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" className="min-h-11 w-full sm:w-auto">
              {t('continue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
