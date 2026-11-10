import type { RecipeSummary } from '@family-cookbook/contracts';
import { Clock } from 'lucide-react';

import { RecipeCardCover } from '@/components/recipe/recipe-card-cover';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  recipe: RecipeSummary;
  updatedLabel: string;
  archivedLabel: string;
  categoryFallback: string;
  imageLoadingLabel: string;
  metaLabel?: string | null;
  contentLang?: string;
  headingLevel?: 'h3' | 'h4';
}>;

export function RecipeCard({
  familyId,
  recipe,
  updatedLabel,
  archivedLabel,
  categoryFallback,
  imageLoadingLabel,
  metaLabel,
  contentLang,
  headingLevel = 'h3',
}: Props) {
  const Heading = headingLevel;
  return (
    <li className="min-h-full">
      <article
        className={cn(
          'flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors',
          'hover:border-primary/40 focus-within:border-primary/40',
        )}
      >
        <Link
          href={`/f/${familyId}/recipes/${recipe.id}`}
          className="flex min-h-11 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <RecipeCardCover
            familyId={familyId}
            recipeId={recipe.id}
            coverAssetId={recipe.coverAssetId ?? null}
            title={recipe.title}
            loadingLabel={imageLoadingLabel}
            decorative
          />
          <div className="flex flex-1 flex-col gap-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Heading
                className="font-serif-display text-lg font-semibold text-foreground"
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
            <p className="text-sm text-muted-foreground">{recipe.category ?? categoryFallback}</p>
            {metaLabel ? <p className="text-sm text-foreground">{metaLabel}</p> : null}
            <p className="mt-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-4 shrink-0" aria-hidden />
              <span>{updatedLabel}</span>
            </p>
          </div>
        </Link>
      </article>
    </li>
  );
}
