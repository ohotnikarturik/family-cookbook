import type { RecipeSummary } from '@family-cookbook/contracts';
import { ChefHat } from 'lucide-react';

import { RecipeCardCover } from '@/components/recipe/recipe-card-cover';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  recipe: RecipeSummary;
  updatedLabel: string;
  archivedLabel: string;
  imageLoadingLabel: string;
  metaLabel?: string | null;
  contentLang?: string;
  headingLevel?: 'h2' | 'h3';
}>;

/**
 * Phones: a compact row with a square thumbnail on the left. From `sm` up a card with a photo
 * shows a 4:3 cover above the text; without a photo the tinted banner has the same 4:3 shape, so
 * every card in the grid is the same size.
 */
export function RecipeCard({
  familyId,
  recipe,
  updatedLabel,
  archivedLabel,
  imageLoadingLabel,
  metaLabel,
  contentLang,
  headingLevel = 'h2',
}: Props) {
  const Heading = headingLevel;
  const hasPhoto = Boolean(recipe.coverAssetId);
  const detailLine = [recipe.category, metaLabel].filter(Boolean).join(' · ');
  return (
    <li className="min-h-full">
      <article
        className={cn(
          'h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors',
          'hover:border-primary/40 focus-within:border-primary/40',
        )}
      >
        <Link
          href={`/f/${familyId}/recipes/${recipe.id}`}
          className={cn(
            'flex h-full min-h-11 flex-row items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
            'sm:flex-col sm:items-stretch sm:gap-0 sm:p-0',
          )}
        >
          {hasPhoto ? (
            <div
              className={cn(
                'size-[4.5rem] shrink-0 overflow-hidden rounded-lg',
                'sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none',
              )}
            >
              <RecipeCardCover
                familyId={familyId}
                recipeId={recipe.id}
                coverAssetId={recipe.coverAssetId ?? null}
                title={recipe.title}
                loadingLabel={imageLoadingLabel}
                decorative
                className="aspect-auto h-full w-full"
              />
            </div>
          ) : (
            <span
              className={cn(
                'flex size-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary',
                'sm:aspect-[4/3] sm:size-auto sm:w-full sm:rounded-none',
              )}
              aria-hidden
            >
              <ChefHat className="size-7" />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1 sm:flex-none sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
              <Heading
                className="line-clamp-2 font-serif-display text-lg font-semibold leading-snug text-foreground"
                lang={contentLang}
              >
                {recipe.title}
              </Heading>
              {recipe.status === 'archived' ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {archivedLabel}
                </span>
              ) : null}
            </div>
            {detailLine ? <p className="text-sm text-foreground">{detailLine}</p> : null}
            <p className="text-sm text-muted-foreground">{updatedLabel}</p>
          </div>
        </Link>
      </article>
    </li>
  );
}
