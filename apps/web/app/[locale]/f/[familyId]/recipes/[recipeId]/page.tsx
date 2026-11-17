import { getRecipe, resolveAccessibleFamily } from '@family-cookbook/application';
import { recipeLanguageTagSchema } from '@family-cookbook/contracts';
import { resolveRecipeDisplay, type RecipeForDisplay } from '@family-cookbook/domain';
import { getSessionUser } from '@family-cookbook/data-access';
import { createServerSupabaseClient } from '@family-cookbook/data-access/supabase/server';
import { canEditRecipe, canViewRecipeHistory } from '@family-cookbook/permissions';
import { getFormatter, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { PageHeader } from '@/components/product/page-header';
import { UnavailablePage } from '@/components/product/unavailable-page';
import { RecipeBrowseStates } from '@/components/recipe/recipe-browse-states';
import { RecipeDetailToolbar } from '@/components/recipe/recipe-detail-toolbar';
import { RecipeDetailView } from '@/components/recipe/recipe-detail-view';
import { languageLabel } from '@/lib/language-label';
import { RecipeLanguageSelector } from '@/components/recipe/recipe-language-selector';
import { LoadingState } from '@/components/product/loading-state';
import { RecipeMediaUploadPanel } from '@/components/recipe/recipe-media-upload-panel';
import { formatIngredientAmount } from '@/lib/format-recipe-meta';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
  searchParams: Promise<{ viewLang?: string }>;
}>;

export const instant = false;

export default function RecipeDetailPage(props: Props) {
  return (
    <Suspense fallback={<DetailFallback />}>
      <RecipeDetailContent params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

function DetailFallback() {
  return <LoadingState />;
}

async function RecipeDetailContent({ params, searchParams }: Props) {
  await connection();
  const { locale: localeParam, familyId, recipeId } = await params;
  const query = await searchParams;
  if (!(locales as readonly string[]).includes(localeParam)) {
    notFound();
  }
  const locale = localeParam as AppLocale;
  const t = await getTranslations({ locale, namespace: 'recipes' });

  const backToList = { href: `/f/${familyId}/recipes`, label: t('detail.backToList') };

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
        <PageHeader title={t('status.forbiddenTitle')} back={backToList} />
        <RecipeBrowseStates variant="forbidden" description={t('status.forbidden')} />
      </section>
    );
  }
  if (result.status === 'not_found') {
    return <UnavailablePage locale={locale} headingLevel="h1" embedded />;
  }
  if (result.status === 'validation_error' || result.status === 'query_failed') {
    return (
      <section className="space-y-4">
        <PageHeader title={t('status.errorTitle')} back={backToList} />
        <RecipeBrowseStates variant="error" description={t('status.error')} />
      </section>
    );
  }

  const { recipe } = result;
  const viewLangParsed = query.viewLang ? recipeLanguageTagSchema.safeParse(query.viewLang) : null;
  const viewLanguage = canonicalViewLanguage(
    recipe,
    viewLangParsed?.success ? viewLangParsed.data : undefined,
  );
  const display = resolveRecipeDisplay(recipe as RecipeForDisplay, viewLanguage);

  const showEdit =
    sessionUser !== null &&
    workspace.status === 'ok' &&
    canEditRecipe(workspace.workspace.role, sessionUser.id, recipe.createdBy);
  const showHistory =
    sessionUser !== null &&
    workspace.status === 'ok' &&
    canViewRecipeHistory(workspace.workspace.role, sessionUser.id, recipe.createdBy);
  const format = await getFormatter({ locale });
  const facts: { label: string; value: string; valueLang?: string }[] = [
    {
      label: t('detail.sourceLanguage'),
      value: languageLabel(recipe.sourceLanguage, locale),
    },
  ];
  if (recipe.category) {
    facts.push({
      label: t('detail.category'),
      value: recipe.category,
      valueLang: recipe.sourceLanguage,
    });
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
      <PageHeader
        title={display.title}
        titleLang={display.contentLang}
        id={`recipe-title-${recipe.id}`}
        back={backToList}
        actions={
          showEdit || showHistory ? (
            <RecipeDetailToolbar
              familyId={familyId}
              recipeId={recipeId}
              expectedVersion={recipe.version}
              status={recipe.status}
              showEdit={showEdit}
              showHistory={showHistory}
            />
          ) : undefined
        }
      />
      <RecipeDetailView
        recipe={recipe}
        familyId={familyId}
        display={display}
        languageSelector={
          recipe.translations.length > 0 ? (
            <Suspense fallback={null}>
              <RecipeLanguageSelector
                recipe={recipe}
                viewLanguage={viewLanguage}
                uiLocale={locale}
                labels={{
                  label: t('detail.translation.selectorLabel'),
                  originalOptionLabel: t('detail.translation.originalOption', {
                    language: languageLabel(recipe.sourceLanguage, locale),
                  }),
                  unreviewedBadge: t('detail.translation.unreviewedBadge'),
                }}
              />
            </Suspense>
          ) : undefined
        }
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
        labels={{
          descriptionHeading: t('detail.description'),
          ingredientsHeading: t('detail.ingredients'),
          stepsHeading: t('detail.steps'),
          tagsHeading: t('detail.tags'),
          notesHeading: t('detail.notes'),
          archived: t('list.archivedBadge'),
          stepLabel: (position) => t('detail.step', { position }),
          partialFallback: t('detail.translation.partialFallback'),
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
      {showEdit ? (
        <div className="space-y-4 border-t border-border pt-8">
          <RecipeMediaUploadPanel familyId={familyId} recipeId={recipeId} assets={recipe.assets} />
        </div>
      ) : null}
    </section>
  );
}

function canonicalViewLanguage(
  recipe: { sourceLanguage: string; translations: ReadonlyArray<{ languageTag: string }> },
  requested: string | undefined,
): string {
  if (!requested) {
    return recipe.sourceLanguage;
  }
  const normalized = requested.trim().toLowerCase();
  if (recipe.sourceLanguage.trim().toLowerCase() === normalized) {
    return recipe.sourceLanguage;
  }
  return (
    recipe.translations.find((item) => item.languageTag.trim().toLowerCase() === normalized)
      ?.languageTag ?? recipe.sourceLanguage
  );
}
