import { searchRecipes } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { getRecipeCardLabels } from '@/components/recipe/recipe-card-labels';
import { AnnounceRecipeResults } from '@/components/recipe/recipe-browse-shell';
import { RecipeList } from '@/components/recipe/recipe-list';
import { RecipePagination } from '@/components/recipe/recipe-pagination';
import { LoadingState } from '@/components/product/loading-state';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { parseRecipeSearchFromUrl } from '@/lib/recipe-search-params';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default function RecipesPage(props: Props) {
  return (
    <Suspense fallback={<RecipesFallback />}>
      <RecipesContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function RecipesFallback() {
  return <LoadingState />;
}

async function RecipesContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const cardLabels = await getRecipeCardLabels(locale);
  const sp = await searchParams;

  const parsed = parseRecipeSearchFromUrl(familyId, sp);
  if (parsed.input === null) {
    return (
      <section className="space-y-4">
        <RecipeBrowseStates
          variant="invalidFilters"
          title={t('status.invalidFiltersTitle')}
          description={t('status.invalidFilters')}
        />
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('filters.clear')}</Link>
        </Button>
      </section>
    );
  }

  const supabase = await createServerSupabaseClient();
  const result = await searchRecipes(supabase, parsed.input);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes`);
  }
  if (result.status === 'forbidden') {
    // The layout already shows the page heading.
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (result.status === 'validation_error') {
    return (
      <section className="space-y-4">
        <RecipeBrowseStates
          variant="invalidFilters"
          title={t('status.invalidFiltersTitle')}
          description={t('status.invalidFilters')}
        />
        <Button type="button" variant="outline" className="min-h-11" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('filters.clear')}</Link>
        </Button>
      </section>
    );
  }
  if (result.status === 'rate_limited') {
    return (
      <section className="space-y-4">
        <RecipeBrowseStates
          variant="error"
          title={t('status.rateLimitedTitle')}
          description={t('status.rateLimited')}
        />
      </section>
    );
  }
  if (result.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <RecipeBrowseStates
          variant="error"
          title={t('status.errorTitle')}
          description={t('status.error')}
        />
      </section>
    );
  }

  const { items, nextCursor } = result.result;
  const input = parsed.input;
  const hasActiveFilters = Boolean(
    input.anyText ||
      input.ingredient ||
      input.category ||
      input.tag ||
      input.language ||
      input.createdBy ||
      input.includeArchived,
  );
  const countText = t('list.count', { count: result.result.totalCount ?? items.length });

  // Heading, search box, filters and chips are in the layout, which stays mounted between searches.
  return (
    <div className="space-y-6">
      <AnnounceRecipeResults message={countText} />
      <p className="text-sm text-muted-foreground">{countText}</p>
      <RecipeList
        familyId={familyId}
        items={items}
        uiLocale={locale}
        listLabel={t('list.resultsLabel')}
        emptyState={
          hasActiveFilters ? (
            <RecipeBrowseStates
              variant="empty"
              title={t('status.emptyFilteredTitle')}
              description={t('status.emptyFiltered')}
              action={
                <Button type="button" variant="outline" className="min-h-11" asChild>
                  <Link href={`/f/${familyId}/recipes`}>{t('filters.clear')}</Link>
                </Button>
              }
            />
          ) : (
            <RecipeBrowseStates
              variant="empty"
              title={t('status.emptyTitle')}
              description={t('status.empty')}
            />
          )
        }
        cardLabels={cardLabels}
      />
      {items.length > 0 ? (
        <RecipePagination
          familyId={familyId}
          searchInput={parsed.input}
          nextCursor={nextCursor}
          navLabel={t('pagination.label')}
          firstPageLabel={t('pagination.first')}
          nextPageLabel={t('pagination.next')}
          resultsSummary={t('pagination.count', { count: items.length })}
        />
      ) : null}
    </div>
  );
}
