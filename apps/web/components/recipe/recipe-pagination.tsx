import type { SearchRecipesInput } from '@family-cookbook/contracts';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { buildRecipeSearchQuery } from '@/lib/build-recipe-search-query';

type Props = Readonly<{
  familyId: string;
  searchInput: SearchRecipesInput;
  nextCursor: string | null;
  navLabel: string;
  firstPageLabel: string;
  nextPageLabel: string;
  resultsSummary: string;
}>;

export function RecipePagination({
  familyId,
  searchInput,
  nextCursor,
  navLabel,
  firstPageLabel,
  nextPageLabel,
  resultsSummary,
}: Props) {
  const filters = { ...searchInput };
  delete filters.cursor;
  const firstHref = searchInput.cursor
    ? `/f/${familyId}/recipes${buildRecipeSearchQuery(filters)}`
    : null;
  const nextHref =
    nextCursor === null
      ? null
      : `/f/${familyId}/recipes${buildRecipeSearchQuery(searchInput, { cursor: nextCursor })}`;

  return (
    <nav
      aria-label={navLabel}
      className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">{resultsSummary}</p>
      {firstHref || nextHref ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {firstHref ? (
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={firstHref}>{firstPageLabel}</Link>
            </Button>
          ) : null}
          {nextHref ? (
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={nextHref}>{nextPageLabel}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
