import { resolveAccessibleFamily, searchRecipes } from '@family-cookbook/application';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { getRecipeCardLabels } from '@/components/recipe/recipe-card-labels';
import { RecipeList } from '@/components/recipe/recipe-list';
import { LoadingState } from '@/components/product/loading-state';
import { PageHeader } from '@/components/product/page-header';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
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
  return <LoadingState />;
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
  const cardLabels = await getRecipeCardLabels(locale);

  const supabase = await createServerSupabaseClient();
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  if (workspace.status !== 'ok') {
    notFound();
  }

  const recent = await searchRecipes(supabase, {
    familyId,
    sort: 'updatedAt',
    limit: 6,
  });

  const recentItems = recent.status === 'ok' ? recent.result.items : [];
  const recentFailed = recent.status !== 'ok';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        actions={
          <Button type="button" className="min-h-11 w-full sm:w-auto" asChild>
            <Link href={`/f/${familyId}/recipes`}>{t('dashboard.browseRecipes')}</Link>
          </Button>
        }
      />

      <section aria-labelledby="recent-recipes-heading" className="space-y-4">
        <h2 id="recent-recipes-heading" className="text-lg font-semibold text-foreground">
          {t('dashboard.recentRecipes')}
        </h2>
        {recentFailed ? (
          <RecipeBrowseStates
            variant="error"
            title={tRecipes('status.errorTitle')}
            description={tRecipes('status.error')}
          />
        ) : recentItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tRecipes('status.empty')}</p>
        ) : (
          <RecipeList
            familyId={familyId}
            items={recentItems}
            uiLocale={locale}
            listLabel={t('dashboard.recentRecipes')}
            cardLabels={cardLabels}
            headingLevel="h3"
          />
        )}
      </section>
    </div>
  );
}
