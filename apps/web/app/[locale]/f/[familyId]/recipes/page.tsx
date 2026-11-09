import {
  listFamilyMembers,
  resolveAccessibleFamily,
  searchRecipes,
} from '@family-cookbook/application';
import { resolveMemberDisplayLabel } from '@family-cookbook/domain';
import { getSessionUser } from '@family-cookbook/data-access';
import { canCreateRecipe } from '@family-cookbook/permissions';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getFormatter, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeList } from '@/components/recipe/recipe-list';
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { RecipePagination } from '@/components/recipe/recipe-pagination';
import { RecipeSearchForm } from '@/components/recipe/recipe-search-form';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { buildRecipeSearchQuery } from '@/lib/build-recipe-search-query';
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
  return <RecipeLoading />;
}

async function RecipesContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const format = await getFormatter({ locale });
  const sp = await searchParams;

  const parsed = parseRecipeSearchFromUrl(familyId, sp);
  if (parsed.input === null) {
    return (
      <section className="space-y-4" aria-labelledby="recipes-heading">
        <RecipesHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          familyId={familyId}
          addRecipeLabel={t('editor.addRecipe')}
          showAddRecipe={false}
        />
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
  const sessionUser = await getSessionUser(supabase);
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  const canAdd = workspace.status === 'ok' ? canCreateRecipe(workspace.workspace.role) : false;
  const result = await searchRecipes(supabase, parsed.input);

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes`);
  }
  if (result.status === 'forbidden') {
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (result.status === 'validation_error') {
    return (
      <section className="space-y-4" aria-labelledby="recipes-heading">
        <RecipesHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          familyId={familyId}
          addRecipeLabel={t('editor.addRecipe')}
          showAddRecipe={canAdd}
        />
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
      <section className="space-y-4" aria-labelledby="recipes-heading">
        <RecipesHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          familyId={familyId}
          addRecipeLabel={t('editor.addRecipe')}
          showAddRecipe={canAdd}
        />
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
      <section className="space-y-4" aria-labelledby="recipes-heading">
        <RecipesHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          familyId={familyId}
          addRecipeLabel={t('editor.addRecipe')}
          showAddRecipe={canAdd}
        />
        <RecipeBrowseStates
          variant="error"
          title={t('status.errorTitle')}
          description={t('status.error')}
        />
      </section>
    );
  }

  const { items, nextCursor } = result.result;
  const tMembers = await getTranslations({ locale, namespace: 'family.members' });
  const membersListed = await listFamilyMembers(supabase, { familyId });
  const contributorOptions =
    membersListed.status === 'ok' && sessionUser
      ? membersListed.members
          .map((member) => {
            const name = resolveMemberDisplayLabel({
              displayName: member.displayName,
              memberUserId: member.userId,
              actorUserId: sessionUser.id,
              youLabel: tMembers('you'),
              neutralLabel: tMembers('neutralName'),
            });
            return {
              userId: member.userId,
              label:
                member.status === 'suspended' ? `${name} (${tMembers('suspendedBadge')})` : name,
            };
          })
          .sort((a, b) => {
            if (a.userId === sessionUser.id) {
              return -1;
            }
            if (b.userId === sessionUser.id) {
              return 1;
            }
            return a.label.localeCompare(b.label, locale);
          })
      : [];

  return (
    <section className="space-y-6" aria-labelledby="recipes-heading">
      <RecipesHeader
        title={t('list.title')}
        subtitle={t('list.subtitle')}
        familyId={familyId}
        addRecipeLabel={t('editor.addRecipe')}
        showAddRecipe={canAdd}
      />
      <RecipeSearchForm
        key={buildRecipeSearchQuery(parsed.input) || 'all'}
        familyId={familyId}
        contributorOptions={contributorOptions}
        defaultValues={{
          ...(parsed.input.query ? { query: parsed.input.query } : {}),
          ...(parsed.input.ingredient ? { ingredient: parsed.input.ingredient } : {}),
          ...(parsed.input.category ? { category: parsed.input.category } : {}),
          ...(parsed.input.tag ? { tag: parsed.input.tag } : {}),
          ...(parsed.input.language ? { language: parsed.input.language } : {}),
          ...(parsed.input.createdBy ? { createdBy: parsed.input.createdBy } : {}),
          ...(parsed.input.sort ? { sort: parsed.input.sort } : {}),
          ...(parsed.input.includeArchived ? { includeArchived: true } : {}),
        }}
      />
      {membersListed.status !== 'ok' ? (
        <p className="text-sm text-destructive" role="alert">
          {tMembers('errors.loadFailed')}
        </p>
      ) : null}
      <RecipeList
        familyId={familyId}
        items={items}
        uiLocale={locale}
        listLabel={t('list.resultsLabel')}
        emptyState={
          <RecipeBrowseStates
            variant="empty"
            title={t('status.emptyTitle')}
            description={t('status.empty')}
          />
        }
        cardLabels={{
          updatedLabelFor: (recipe) =>
            t('list.updated', {
              date: format.dateTime(new Date(recipe.updatedAt), {
                dateStyle: 'medium',
                timeStyle: 'short',
              }),
            }),
          archivedLabel: t('list.archivedBadge'),
          categoryFallback: t('list.uncategorized'),
        }}
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
    </section>
  );
}

function RecipesHeader({
  title,
  subtitle,
  familyId,
  addRecipeLabel,
  showAddRecipe,
}: Readonly<{
  title: string;
  subtitle: string;
  familyId: string;
  addRecipeLabel: string;
  showAddRecipe: boolean;
}>) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h2 id="recipes-heading" className="text-xl font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {showAddRecipe ? (
        <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
          <Link href={`/f/${familyId}/recipes/new`}>{addRecipeLabel}</Link>
        </Button>
      ) : null}
    </header>
  );
}
