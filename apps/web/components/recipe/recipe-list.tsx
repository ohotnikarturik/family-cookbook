import type { RecipeSummary } from '@family-cookbook/contracts';
import type { ReactNode } from 'react';

import { RecipeCard } from '@/components/recipe/recipe-card';
import { recipeContentLang } from '@/lib/format-recipe-meta';

type Props = Readonly<{
  familyId: string;
  items: RecipeSummary[];
  uiLocale: string;
  listLabel: string;
  cardLabels: {
    updatedLabelFor: (recipe: RecipeSummary) => string;
    archivedLabel: string;
    categoryFallback: string;
    imageLoadingLabel: string;
    metaLabelFor: (recipe: RecipeSummary) => string | null;
  };
  emptyState?: ReactNode;
}>;

export function RecipeList({
  familyId,
  items,
  uiLocale,
  listLabel,
  cardLabels,
  emptyState,
}: Props) {
  if (items.length === 0 && emptyState) {
    return <div>{emptyState}</div>;
  }

  return (
    <ul
      aria-label={listLabel}
      className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
    >
      {items.map((recipe) => {
        const contentLang = recipeContentLang(recipe, uiLocale);
        return (
          <RecipeCard
            key={recipe.id}
            familyId={familyId}
            recipe={recipe}
            updatedLabel={cardLabels.updatedLabelFor(recipe)}
            archivedLabel={cardLabels.archivedLabel}
            categoryFallback={cardLabels.categoryFallback}
            imageLoadingLabel={cardLabels.imageLoadingLabel}
            metaLabel={cardLabels.metaLabelFor(recipe)}
            headingLevel="h3"
            {...(contentLang ? { contentLang } : {})}
          />
        );
      })}
    </ul>
  );
}
