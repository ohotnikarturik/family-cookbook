import type { SearchRecipesInput } from '@family-cookbook/contracts';

import { Link } from '@/i18n/navigation';
import { buildRecipeSearchQuery } from '@/lib/build-recipe-search-query';
import { cn } from '@/lib/utils';

type Props = Readonly<{
  familyId: string;
  /** Current search, so a chip keeps the search text and other filters. */
  searchInput: SearchRecipesInput;
  categories: readonly string[];
  label: string;
  allLabel: string;
  /** Read out after the active chip's name, e.g. "selected". */
  selectedLabel: string;
}>;

const chipClass =
  'inline-flex min-h-11 items-center rounded-full border px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

/** One-tap category browsing. The active chip has a filled look and hidden "selected" text; it
 * does not use `aria-current`, which belongs to the one highlighted main-navigation item. */
export function RecipeCategoryChips({
  familyId,
  searchInput,
  categories,
  label,
  allLabel,
  selectedLabel,
}: Props) {
  if (categories.length === 0) {
    return null;
  }
  const active = searchInput.category?.trim().toLowerCase();
  const base = { ...searchInput, cursor: undefined };

  function href(category: string | undefined) {
    return `/f/${familyId}/recipes${buildRecipeSearchQuery(base, { category })}`;
  }

  return (
    <nav aria-label={label}>
      <ul className="flex list-none flex-wrap gap-2 p-0">
        <li>
          <Link
            href={href(undefined)}
            className={cn(
              chipClass,
              active === undefined
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground hover:bg-muted',
            )}
          >
            {allLabel}
            {active === undefined ? <span className="sr-only">{selectedLabel}</span> : null}
          </Link>
        </li>
        {categories.map((category) => {
          const isActive = active === category.toLowerCase();
          return (
            <li key={category}>
              <Link
                href={href(category)}
                className={cn(
                  chipClass,
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted',
                )}
              >
                {category}
                {isActive ? <span className="sr-only">{selectedLabel}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
