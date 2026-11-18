import {
  listRecipeBrowseOptions,
  resolveAccessibleFamily,
  searchRecipes,
} from '@family-cookbook/application';
import { canCreateRecipe } from '@family-cookbook/permissions';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { HomeFirstSteps } from '@/components/home/home-first-steps';
import { HomeSearchForm } from '@/components/home/home-search-form';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { getRecipeCardLabels } from '@/components/recipe/recipe-card-labels';
import { RecipeCategoryChips } from '@/components/recipe/recipe-category-chips';
import { RecipeList } from '@/components/recipe/recipe-list';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { TextLink } from '@/components/product/text-link';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';
import { homeFirstSteps } from '@/lib/home-first-steps';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

/** Home shows a few categories as shortcuts; the full list lives on Recipes. */
const HOME_CATEGORY_LIMIT = 10;

export default function FamilyDashboardPage(props: Props) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent params={props.params} />
    </Suspense>
  );
}

function DashboardFallback() {
  return <LoadingState />;
}

async function DashboardContent({ params }: Props) {
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
  const { name: familyName, role } = workspace.workspace;
  const canCreate = canCreateRecipe(role);

  // Both may fail without breaking Home: the categories are then simply not shown.
  const [recent, browse] = await Promise.all([
    searchRecipes(supabase, { familyId, sort: 'updatedAt', limit: 6 }),
    listRecipeBrowseOptions(supabase, { familyId }),
  ]);

  const recentItems = recent.status === 'ok' ? recent.result.items : [];
  const recentFailed = recent.status !== 'ok';
  const isEmpty = !recentFailed && recentItems.length === 0;
  const categories =
    browse.status === 'ok' ? browse.options.categories.slice(0, HOME_CATEGORY_LIMIT) : [];
  const recipesHref = `/f/${familyId}/recipes`;

  return (
    <div className="space-y-8">
      <PageHeader
        title={familyName}
        description={t('greeting')}
        actions={
          // Viewers already have "See all recipes" next to the list and Recipes in the menu.
          !isEmpty && canCreate ? (
            <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={`${recipesHref}/new`}>{t('addRecipe')}</Link>
            </Button>
          ) : null
        }
      />

      {isEmpty ? (
        <EmptyCookbook familyId={familyId} steps={homeFirstSteps(role)} t={t} />
      ) : (
        <>
          <div className="space-y-4">
            <HomeSearchForm
              action={`/${locale}${recipesHref}`}
              label={t('search.label')}
              placeholder={t('search.placeholder')}
              submitLabel={t('search.submit')}
            />
            <RecipeCategoryChips
              familyId={familyId}
              searchInput={{ familyId }}
              categories={categories}
              label={t('categoriesLabel')}
              allLabel={tRecipes('filters.anyCategory')}
              selectedLabel={tRecipes('filters.selected')}
              showAll={false}
            />
          </div>

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
        </>
      )}
    </div>
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
