import type { RecipeSummary } from '@family-cookbook/contracts';
import { Clock } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  recipe: RecipeSummary;
  updatedLabel: string;
  archivedLabel: string;
  categoryFallback: string;
  contentLang?: string;
  headingLevel?: 'h3' | 'h4';
}>;

export function RecipeCard({
  familyId,
  recipe,
  updatedLabel,
  archivedLabel,
  categoryFallback,
  contentLang,
  headingLevel = 'h3',
}: Props) {
  const Heading = headingLevel;
  return (
    <li>
      <article
        className={cn(
          'rounded-xl border border-border bg-card p-4 shadow-sm transition-colors',
          'hover:border-primary/40 focus-within:border-primary/40',
        )}
      >
        <Link
          href={`/f/${familyId}/recipes/${recipe.id}`}
          className="flex min-h-11 flex-col gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
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
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="size-4 shrink-0" aria-hidden />
            <span>{updatedLabel}</span>
          </p>
        </Link>
      </article>
    </li>
  );
}
