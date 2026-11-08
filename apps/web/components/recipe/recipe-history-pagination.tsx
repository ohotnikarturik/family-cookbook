import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import {
  recipeHistoryHref,
  withHistoryParam,
  type HistoryQuery,
  type HistoryQueryParam,
} from '@/lib/recipe-history/query';

type Props = Readonly<{
  familyId: string;
  recipeId: string;
  paramName: HistoryQueryParam;
  nextCursor: string | null;
  currentCursor: string | undefined;
  preserved: HistoryQuery;
  navLabel: string;
  firstPageLabel: string;
  nextPageLabel: string;
  resultsSummary: string;
}>;

export function RecipeHistoryPagination({
  familyId,
  recipeId,
  paramName,
  nextCursor,
  currentCursor,
  preserved,
  navLabel,
  firstPageLabel,
  nextPageLabel,
  resultsSummary,
}: Props) {
  const firstHref = currentCursor
    ? recipeHistoryHref(familyId, recipeId, withHistoryParam(preserved, paramName, undefined))
    : null;
  const nextHref = nextCursor
    ? recipeHistoryHref(familyId, recipeId, withHistoryParam(preserved, paramName, nextCursor))
    : null;

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
