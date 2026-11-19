import { resolveAccessibleFamily, searchRecipes } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { HomeFirstSteps } from '@/components/home/home-first-steps';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { getRecipeCardLabels } from '@/components/recipe/recipe-card-labels';
import { AnnounceRecipeResults } from '@/components/recipe/recipe-results-announcer';
import { RecipeList } from '@/components/recipe/recipe-list';
import { LoadingState } from '@/components/product/loading-state';
import { TextLink } from '@/components/product/text-link';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { homeFirstSteps } from '@/lib/home-first-steps';
import { parseRecipeSearchFromUrl } from '@/lib/recipe-search-params';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

/** Home shows this many recent recipes, or this many matches while searching. */
const HOME_LIST_LIMIT = 6;

export default function FamilyDashboardPage(props: Props) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function DashboardFallback() {
  return <LoadingState />;
}

async function DashboardContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family.dashboard' });
  const tRecipes = await getTranslations({ locale, namespace: 'recipes' });
  const cardLabels = await getRecipeCardLabels(locale);

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }
  const { role } = workspace.workspace;
  const recipesHref = `/f/${familyId}/recipes`;

  // Heading, search box and chips are in the layout, which stays mounted between searches. Only
  // the text typed in the box is read here; filters belong to Recipes.
  const sp = await searchParams;
  const parsed = parseRecipeSearchFromUrl(familyId, { query: sp.query });
  const searchText = parsed.input?.anyText;
  if (parsed.input === null || searchText) {
    const result = parsed.input
      ? await searchRecipes(supabase, { ...parsed.input, limit: HOME_LIST_LIMIT })
      : null;
    if (result?.status === 'auth_required') {
      redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}`);
    }
    if (result?.status === 'forbidden') {
      notFound();
    }
    const failure =
      result === null || result.status === 'validation_error'
        ? 'invalidFilters'
        : result.status === 'rate_limited'
          ? 'rateLimited'
          : result.status === 'ok'
            ? null
            : 'error';
    const items = result?.status === 'ok' ? result.result.items : [];
    const total = result?.status === 'ok' ? (result.result.totalCount ?? items.length) : 0;
    const countText = tRecipes('list.count', { count: total });
    const failureCopy =
      failure === 'invalidFilters'
        ? { title: 'status.invalidFiltersTitle', description: 'status.invalidFilters' }
        : failure === 'rateLimited'
          ? { title: 'status.rateLimitedTitle', description: 'status.rateLimited' }
          : { title: 'status.errorTitle', description: 'status.error' };

    return (
      <section aria-labelledby="home-results-heading" className="space-y-4">
        <h2 id="home-results-heading" className="text-lg font-semibold text-foreground">
          {t('search.results.heading')}
        </h2>
        {failure ? (
          <RecipeBrowseStates
            variant={failure === 'error' || failure === 'rateLimited' ? 'error' : 'invalidFilters'}
            title={tRecipes(failureCopy.title)}
            description={tRecipes(failureCopy.description)}
          />
        ) : (
          <>
            <AnnounceRecipeResults message={countText} />
            <p className="text-sm text-muted-foreground">{countText}</p>
            <RecipeList
              familyId={familyId}
              items={items}
              uiLocale={locale}
              listLabel={t('search.results.heading')}
              cardLabels={cardLabels}
              headingLevel="h3"
              emptyState={
                <RecipeBrowseStates
                  variant="empty"
                  title={t('search.results.emptyTitle')}
                  description={t('search.results.emptyDescription')}
                  action={
                    <Button type="button" variant="outline" className="min-h-11" asChild>
                      <Link href={recipesHref}>{t('search.results.browseAll')}</Link>
                    </Button>
                  }
                />
              }
            />
            {total > items.length && searchText ? (
              <TextLink href={`${recipesHref}?query=${encodeURIComponent(searchText)}`}>
                {t('search.results.seeAll', { count: total })}
              </TextLink>
            ) : null}
          </>
        )}
      </section>
    );
  }

  const recent = await searchRecipes(supabase, {
    familyId,
    sort: 'updatedAt',
    limit: HOME_LIST_LIMIT,
  });
  const recentItems = recent.status === 'ok' ? recent.result.items : [];
  const recentFailed = recent.status !== 'ok';
  const noActive = !recentFailed && recentItems.length === 0;
  // A cookbook whose recipes are all archived is not new: keep search and a way to the archive.
  let hasArchived = false;
  if (noActive) {
    const archived = await searchRecipes(supabase, { familyId, includeArchived: true, limit: 1 });
    hasArchived = archived.status === 'ok' && archived.result.items.length > 0;
  }
  if (noActive && !hasArchived) {
    return <EmptyCookbook familyId={familyId} steps={homeFirstSteps(role)} t={t} />;
  }

  return (
    <section aria-labelledby="recent-recipes-heading" className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="recent-recipes-heading" className="text-lg font-semibold text-foreground">
          {t('recentRecipes')}
        </h2>
        {recentFailed ? null : <TextLink href={recipesHref}>{t('seeAllRecipes')}</TextLink>}
      </div>
      {recentFailed ? (
        <RecipeBrowseStates
          variant="error"
          title={tRecipes('status.errorTitle')}
          description={tRecipes('status.error')}
        />
      ) : noActive ? (
        <div className="space-y-3">
          <RecipeBrowseStates
            variant="empty"
            title={t('archivedOnly.title')}
            description={t('archivedOnly.description')}
          />
          <TextLink href={`${recipesHref}?includeArchived=true`}>
            {t('archivedOnly.action')}
          </TextLink>
        </div>
      ) : (
        <RecipeList
          familyId={familyId}
          items={recentItems}
          uiLocale={locale}
          listLabel={t('recentRecipes')}
          cardLabels={cardLabels}
          headingLevel="h3"
        />
      )}
    </section>
  );
}

type DashboardT = Awaited<ReturnType<typeof getTranslations<'family.dashboard'>>>;

function EmptyCookbook({
  familyId,
  steps,
  t,
}: Readonly<{
  familyId: string;
  steps: ReturnType<typeof homeFirstSteps>;
  t: DashboardT;
}>) {
  if (steps.length === 0) {
    return (
      <RecipeBrowseStates
        variant="empty"
        title={t('empty.title')}
        description={t('empty.viewer')}
      />
    );
  }
  return (
    <HomeFirstSteps
      familyId={familyId}
      heading={t('empty.title')}
      intro={t('empty.intro')}
      steps={steps}
      copy={{
        addRecipe: {
          title: t('empty.steps.addRecipe.title'),
          description: t('empty.steps.addRecipe.description'),
          action: t('empty.steps.addRecipe.action'),
        },
        addPhoto: {
          title: t('empty.steps.addPhoto.title'),
          description: t('empty.steps.addPhoto.description'),
        },
        invite: {
          title: t('empty.steps.invite.title'),
          description: t('empty.steps.invite.description'),
          action: t('empty.steps.invite.action'),
        },
      }}
    />
  );
}
