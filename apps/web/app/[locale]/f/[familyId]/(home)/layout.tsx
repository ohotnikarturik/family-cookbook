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
import { Suspense, type ReactNode } from 'react';

import { HomeSearchForm } from '@/components/home/home-search-form';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { RecipeCategoryChips } from '@/components/recipe/recipe-category-chips';
import { ResultsAnnouncer } from '@/components/recipe/recipe-results-announcer';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string; familyId: string }>;
}>;

/** Home shows a few categories as shortcuts; the full list lives on Recipes. */
const HOME_CATEGORY_LIMIT = 10;

/**
 * Home keeps its heading, search box and category chips here, not in the page: Next.js rebuilds a
 * page whenever its search params change, but keeps the layout. So typing never loses focus; only
 * the section below (recent recipes or search results) is replaced. Recipes works the same way.
 */
export default function HomeLayout(props: Props) {
  return (
    <Suspense fallback={<LoadingState />}>
      <HomeControls params={props.params}>{props.children}</HomeControls>
    </Suspense>
  );
}

async function HomeControls({ children, params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family.dashboard' });
  const tRecipes = await getTranslations({ locale, namespace: 'recipes' });

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }
  const { name: familyName, role } = workspace.workspace;

  // One archived recipe is enough for a cookbook that is not new (see the page). Both calls may
  // fail without breaking Home: it then shows search and no categories.
  const [any, browse] = await Promise.all([
    searchRecipes(supabase, { familyId, includeArchived: true, limit: 1 }),
    listRecipeBrowseOptions(supabase, { familyId }),
  ]);
  const isEmpty = any.status === 'ok' && any.result.items.length === 0;
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
          !isEmpty && canCreateRecipe(role) ? (
            <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={`${recipesHref}/new`}>{t('addRecipe')}</Link>
            </Button>
          ) : null
        }
      />

      {isEmpty ? (
        children
      ) : (
        <ResultsAnnouncer>
          <div className="space-y-4">
            <HomeSearchForm
              familyId={familyId}
              label={t('search.label')}
              placeholder={t('search.placeholder')}
              hint={t('search.hint')}
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
          {children}
        </ResultsAnnouncer>
      )}
    </div>
  );
}
