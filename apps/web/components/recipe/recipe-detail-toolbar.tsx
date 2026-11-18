'use client';

import type { RecipeStatus } from '@family-cookbook/contracts';
import { MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { RecipeLifecycleControls } from '@/components/recipe/recipe-lifecycle-controls';
import { TextLink } from '@/components/product/text-link';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  expectedVersion: number;
  status: RecipeStatus;
  showEdit: boolean;
  showHistory: boolean;
}>;

export function RecipeDetailToolbar({
  familyId,
  recipeId,
  expectedVersion,
  status,
  showEdit,
  showHistory,
}: Props) {
  const t = useTranslations('recipes');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const editHref = `/f/${familyId}/recipes/${recipeId}/edit`;
  const historyHref = `/f/${familyId}/recipes/${recipeId}/history`;
  const translationsHref = `/f/${familyId}/recipes/${recipeId}/translations`;
  const showArchive = showEdit && status === 'active';
  const showRestore = showEdit && status === 'archived';
  const showMenu = showHistory || showEdit;

  if (!showMenu) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
      {showRestore ? (
        <RecipeLifecycleControls
          familyId={familyId}
          recipeId={recipeId}
          expectedVersion={expectedVersion}
          status={status}
        />
      ) : null}
      {showEdit ? (
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={editHref}>{t('editor.editRecipe')}</Link>
        </Button>
      ) : null}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" className="min-h-11">
            <MoreHorizontal className="size-4" aria-hidden />
            {t('detail.more')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {showHistory ? (
            <DropdownMenuItem asChild>
              <TextLink href={historyHref}>{t('history.viewHistory')}</TextLink>
            </DropdownMenuItem>
          ) : null}
          {showEdit ? (
            <DropdownMenuItem asChild>
              <TextLink href={translationsHref}>{t('detail.translation.manage')}</TextLink>
            </DropdownMenuItem>
          ) : null}
          {showArchive ? (
            <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
              {t('lifecycle.archive')}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {showArchive ? (
        <RecipeLifecycleControls
          familyId={familyId}
          recipeId={recipeId}
          expectedVersion={expectedVersion}
          status={status}
          showTrigger={false}
          archiveOpen={archiveOpen}
          onArchiveOpenChange={setArchiveOpen}
        />
      ) : null}
    </div>
  );
}
