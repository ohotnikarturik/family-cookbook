import { resolveAccessibleFamily, searchRecipes } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getFormatter, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { recipeContentLang, recipeTimingLabel } from '@/lib/format-recipe-meta';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{ params: Promise<{ locale: string; familyId: string }> }>;

export default function FamilyDashboardPage(props: Props) {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent params={props.params} />
    </Suspense>
  );
}

function DashboardFallback() {
  return <RecipeLoading namespace="family.dashboard" />;
}

async function DashboardContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'family' });
  const tRecipes = await getTranslations({ locale, namespace: 'recipes' });
  const format = await getFormatter({ locale });

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }

  const recent = await searchRecipes(supabase, {
    familyId,
    sort: 'updatedAt',
    limit: 5,
  });

  const recentItems = recent.status === 'ok' ? recent.result.items : [];
  const recentFailed = recent.status !== 'ok';

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="family-dashboard-heading"
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <h2 id="family-dashboard-heading" className="text-lg font-semibold text-foreground">
          {t('dashboard.title')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={`/f/${familyId}/recipes`}>{t('dashboard.browseRecipes')}</Link>
          </Button>
        </div>
      </section>

      <section aria-labelledby="recent-recipes-heading" className="space-y-4">
        <h3 id="recent-recipes-heading" className="text-base font-semibold text-foreground">
          {t('dashboard.recentRecipes')}
        </h3>
        {recentFailed ? (
          <RecipeBrowseStates
            variant="error"
            title={tRecipes('status.errorTitle')}
            description={tRecipes('status.error')}
          />
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tRecipes('status.empty')}</p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {recentItems.map((recipe) => {
              const contentLang = recipeContentLang(recipe, locale);
              return (
                <RecipeCard
                  key={recipe.id}
                  familyId={familyId}
                  recipe={recipe}
                  updatedLabel={tRecipes('list.updated', {
                    date: format.dateTime(new Date(recipe.updatedAt), {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  })}
                  archivedLabel={tRecipes('list.archivedBadge')}
                  categoryFallback={tRecipes('list.uncategorized')}
                  imageLoadingLabel={tRecipes('list.imageLoading')}
                  metaLabel={recipeTimingLabel(recipe, {
                    prep: (minutes) => tRecipes('list.prepMinutes', { minutes }),
                    cook: (minutes) => tRecipes('list.cookMinutes', { minutes }),
                    servings: (servings) =>
                      tRecipes('list.servings', { servings: format.number(servings) }),
                  })}
                  headingLevel="h4"
                  {...(contentLang ? { contentLang } : {})}
                />
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
