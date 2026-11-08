import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe, canViewRecipeHistory } from '@family-cookbook/permissions';
import { getFormatter, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { Button } from '@/components/ui/button';
import { RecipeDetailView } from '@/components/recipe/recipe-detail-view';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { RecipeLoading } from '@/components/recipe/recipe-loading';
import { Link } from '@/i18n/navigation';
import { formatIngredientAmount, recipeContentLang } from '@/lib/format-recipe-meta';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
}>;

// Session-backed reads cannot be instant. Without this, dev logs that the segment was dropped.
export const instant = false;

export default function RecipeDetailPage(props: Props) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <RecipeDetailContent params={props.params} />
    </Suspense>
  );
}

function DetailFallback() {
  return <RecipeLoading />;
}

async function RecipeDetailContent({ params }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId } = await params;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });

  const supabase = await createServerSupabaseClient();
  const sessionUser = await getSessionUser(supabase);
  const workspace = await resolveAccessibleFamily(supabase, familyId);
  const result = await getRecipe(supabase, { familyId, recipeId });

  if (result.status === 'auth_required') {
    redirect(`/${locale}/auth/sign-in?next=/${locale}/f/${familyId}/recipes/${recipeId}`);
  }
  if (result.status === 'forbidden') {
    return (
      <section className="space-y-4">
        <BackLink familyId={familyId} label={t('detail.backToList')} />
        <RecipeBrowseStates
          variant="forbidden"
          title={t('status.forbiddenTitle')}
          description={t('status.forbidden')}
        />
      </section>
    );
  }
  if (result.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h2" embedded />;
  }
  if (result.status === 'validation_error' || result.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <BackLink familyId={familyId} label={t('detail.backToList')} />
        <RecipeBrowseStates
          variant="error"
          title={t('status.errorTitle')}
          description={t('status.error')}
        />
      </section>
    );
  }

  const { recipe } = result;
  const showEdit =
    sessionUser !== null &&
    workspace.status === 'ok' &&
    canEditRecipe(workspace.workspace.role, sessionUser.id, recipe.createdBy);
  const showHistory =
    sessionUser !== null &&
    workspace.status === 'ok' &&
    canViewRecipeHistory(workspace.workspace.role, sessionUser.id, recipe.createdBy);
  const contentLang = recipeContentLang(recipe, locale);
  const format = await getFormatter({ locale });
  const facts: { label: string; value: string; valueLang?: string }[] = [
    {
      label: t('detail.sourceLanguage'),
      value: recipe.sourceLanguage,
      valueLang: recipe.sourceLanguage,
    },
  ];
  if (recipe.category) {
    facts.push(
      contentLang
        ? { label: t('detail.category'), value: recipe.category, valueLang: contentLang }
        : { label: t('detail.category'), value: recipe.category },
    );
  }
  if (recipe.servings !== null) {
    facts.push({ label: t('detail.servings'), value: format.number(recipe.servings) });
  }
  if (recipe.prepMinutes !== null) {
    facts.push({ label: t('detail.prepMinutes'), value: format.number(recipe.prepMinutes) });
  }
  if (recipe.cookMinutes !== null) {
    facts.push({ label: t('detail.cookMinutes'), value: format.number(recipe.cookMinutes) });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackLink familyId={familyId} label={t('detail.backToList')} />
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {showHistory ? (
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={`/f/${familyId}/recipes/${recipeId}/history`}>
                {t('history.viewHistory')}
              </Link>
            </Button>
          ) : null}
          {showEdit ? (
            <Button type="button" variant="outline" className="min-h-11 w-full sm:w-auto" asChild>
              <Link href={`/f/${familyId}/recipes/${recipeId}/edit`}>{t('editor.editRecipe')}</Link>
            </Button>
          ) : null}
        </div>
      </div>
      <RecipeDetailView
        recipe={recipe}
        familyId={familyId}
        facts={facts}
        ingredients={recipe.ingredients.map((ingredient) => ({
          position: ingredient.position,
          name: ingredient.name,
          amount: formatIngredientAmount({
            quantityText: ingredient.quantityText ?? null,
            quantityLabel: ingredient.quantity == null ? null : format.number(ingredient.quantity),
            unit: ingredient.unit ?? null,
          }),
          notes: ingredient.notes ?? null,
        }))}
        {...(contentLang ? { titleLang: contentLang } : {})}
        labels={{
          descriptionHeading: t('detail.description'),
          ingredientsHeading: t('detail.ingredients'),
          stepsHeading: t('detail.steps'),
          tagsHeading: t('detail.tags'),
          notesHeading: t('detail.notes'),
          archived: t('list.archivedBadge'),
          stepLabel: (position) => t('detail.step', { position }),
        }}
        mediaLabels={{
          sectionHeading: t('detail.media.heading'),
          photosHeading: t('detail.media.photos'),
          documentsHeading: t('detail.media.documents'),
          downloadPdf: t('detail.media.downloadPdf'),
          loadError: t('detail.media.loadError'),
          loading: t('detail.media.loading'),
          imageAltFallback: t('detail.media.imageAlt'),
          documentFallback: t('detail.media.documentFallback'),
          pdfDescription: t('detail.media.pdfDescription'),
          stepPhotoAlt: t('detail.media.stepPhotoAlt'),
        }}
      />
    </section>
  );
}

function BackLink({ familyId, label }: Readonly<{ familyId: string; label: string }>) {
  return (
    <Link
      href={`/f/${familyId}/recipes`}
      className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label}
    </Link>
  );
}
