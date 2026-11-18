'use client';

import type { RecipeStatus } from '@family-cookbook/contracts';
import { useActionState, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  archiveRecipeAction,
  restoreRecipeAction,
  type RecipeLifecycleActionState,
} from '@/app/actions/recipe-lifecycle';
import { textLinkClassName } from '@/components/product/text-link';
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

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  expectedVersion: number;
  status: RecipeStatus;
  showTrigger?: boolean;
  archiveOpen?: boolean;
  onArchiveOpenChange?: (open: boolean) => void;
}>;

export function RecipeLifecycleControls({
  familyId,
  recipeId,
  expectedVersion,
  status,
  showTrigger = true,
  archiveOpen: archiveOpenProp,
  onArchiveOpenChange,
}: Props) {
  const t = useTranslations('recipes.lifecycle');
  const [archiveOpenInternal, setArchiveOpenInternal] = useState(false);
  const archiveOpen = archiveOpenProp ?? archiveOpenInternal;
  const setArchiveOpen = onArchiveOpenChange ?? setArchiveOpenInternal;

  const [archiveState, archiveAction, archivePending] = useActionState<
    RecipeLifecycleActionState | null,
    FormData
  >(archiveRecipeAction, null);
  const [restoreState, restoreAction, restorePending] = useActionState<
    RecipeLifecycleActionState | null,
    FormData
  >(restoreRecipeAction, null);

  if (status === 'archived') {
    return (
      <div className="flex flex-col gap-2">
        <form action={restoreAction} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="hidden" name="familyId" value={familyId} />
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="expectedVersion" value={expectedVersion} />
          <Button
            type="submit"
            variant="default"
            className="min-h-11 w-full sm:w-auto"
            disabled={restorePending}
          >
            {restorePending ? t('restoring') : t('restore')}
          </Button>
        </form>
        <LifecycleError state={restoreState} familyId={familyId} recipeId={recipeId} />
      </div>
    );
  }

  return (
    <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
      {showTrigger ? (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto">
            {t('archive')}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('archiveDialogTitle')}</DialogTitle>
          <DialogDescription>{t('archiveDialogDescription')}</DialogDescription>
        </DialogHeader>
        <form action={archiveAction} className="space-y-4">
          <input type="hidden" name="familyId" value={familyId} />
          <input type="hidden" name="recipeId" value={recipeId} />
          <input type="hidden" name="expectedVersion" value={expectedVersion} />
          {/* The dialog itself is the confirmation: pressing "Archive" sends confirm=true. */}
          <input type="hidden" name="confirm" value="true" />
          <LifecycleError state={archiveState} familyId={familyId} recipeId={recipeId} />
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-full sm:w-auto"
              onClick={() => setArchiveOpen(false)}
              disabled={archivePending}
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto"
              disabled={archivePending}
            >
              {archivePending ? t('archiving') : t('archiveSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LifecycleError({
  state,
  familyId,
  recipeId,
}: Readonly<{
  state: RecipeLifecycleActionState | null;
  familyId: string;
  recipeId: string;
}>): ReactNode {
  const t = useTranslations('recipes.lifecycle');
  const locale = useLocale();
  if (state?.ok !== false) {
    return null;
  }
  return (
    <div role="alert" className="text-sm text-destructive">
      <p>{state.message}</p>
      {state.code === 'version_conflict' ? (
        <p className="mt-1 text-muted-foreground">
          {t('errors.reloadHint')}{' '}
          <a href={`/${locale}/f/${familyId}/recipes/${recipeId}`} className={textLinkClassName}>
            {t('errors.reload')}
          </a>
        </p>
      ) : null}
    </div>
  );
}
