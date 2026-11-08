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
import { recipeContentLang } from '@/lib/format-recipe-meta';
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
  const tRoles = await getTranslations({ locale, namespace: 'family.roles' });
  const format = await getFormatter({ locale });

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }

  const { workspace: family } = workspace;

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
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">{t('dashboard.yourRole')}</dt>
            <dd className="font-medium text-foreground">{tRoles(family.role)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('dashboard.memberCount')}</dt>
            <dd className="font-medium text-foreground">{family.memberCount}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">{t('dashboard.scopeNote')}</dt>
            <dd className="text-foreground">{t('dashboard.scopeProof', { name: family.name })}</dd>
          </div>
        </dl>
        <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
          <Link href={`/f/${familyId}/recipes`}>{t('dashboard.browseRecipes')}</Link>
        </Button>
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
          <ul className="grid list-none gap-4 p-0">
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
