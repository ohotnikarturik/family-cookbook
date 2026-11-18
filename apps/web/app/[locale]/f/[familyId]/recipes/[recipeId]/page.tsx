import {
  getRecipe,
  listFamilyMembers,
  resolveAccessibleFamily,
} from '@family-cookbook/application';
import { recipeLanguageTagSchema } from '@family-cookbook/contracts';
import {
  pickRecipeCoverAssetId,
  resolveMemberDisplayLabel,
  resolveRecipeDisplay,
  type RecipeForDisplay,
} from '@family-cookbook/domain';
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
import { RecipeDetailView, type RecipeFactKind } from '@/components/recipe/recipe-detail-view';
import { languageLabel } from '@/lib/language-label';
import { RecipeLanguageSelector } from '@/components/recipe/recipe-language-selector';
import { LoadingState } from '@/components/product/loading-state';
import { RecipeMediaUploadPanel } from '@/components/recipe/recipe-media-upload-panel';
import {
  formatDuration,
  formatIngredientAmount,
  recipeTotalMinutes,
  recipeUpdatedLabel,
} from '@/lib/format-recipe-meta';
import { locales, type AppLocale } from '@/i18n/routing';

type Props = Readonly<{
  params: Promise<{ locale: string; familyId: string; recipeId: string }>;
  searchParams: Promise<{ viewLang?: string; added?: string }>;
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
  const tDuration = await getTranslations({ locale, namespace: 'recipes.detail.duration' });
  const durationLabels = {
    minutes: (minutes: number) => tDuration('minutes', { minutes: format.number(minutes) }),
    hours: (hours: number) => tDuration('hours', { hours: format.number(hours) }),
    hoursMinutes: (hours: number, minutes: number) =>
      tDuration('hoursMinutes', {
        hours: format.number(hours),
        minutes: format.number(minutes),
      }),
  };
  const facts: { kind: RecipeFactKind; text: string }[] = [];
  const prepText = formatDuration(recipe.prepMinutes, durationLabels);
  if (prepText) {
    facts.push({ kind: 'prep', text: t('detail.facts.prep', { time: prepText }) });
  }
  const cookText = formatDuration(recipe.cookMinutes, durationLabels);
  if (cookText) {
    facts.push({ kind: 'cook', text: t('detail.facts.cook', { time: cookText }) });
  }
  // A total adds nothing when only one of the two times exists.
  const totalText =
    prepText && cookText ? formatDuration(recipeTotalMinutes(recipe), durationLabels) : null;
  if (totalText) {
    facts.push({ kind: 'total', text: t('detail.facts.total', { time: totalText }) });
  }
  if (recipe.servings !== null && recipe.servings > 0) {
    facts.push({
      kind: 'serves',
      text: t('detail.facts.serves', { count: format.number(recipe.servings) }),
    });
  }
  const details: { label: string; value: string; valueLang?: string }[] = [];
  if (recipe.category) {
    details.push({
      label: t('detail.category'),
      value: recipe.category,
      valueLang: recipe.sourceLanguage,
    });
  }
  details.push({
    label: t('detail.sourceLanguage'),
    value: languageLabel(recipe.sourceLanguage, locale),
  });

  // Names only, never email. If the member list is unavailable, fall back to a neutral label.
  const tMembers = await getTranslations({ locale, namespace: 'family.members' });
  const membersListed = await listFamilyMembers(supabase, { familyId });
  const author =
    membersListed.status === 'ok'
      ? membersListed.members.find((member) => member.userId === recipe.createdBy)
      : undefined;
  const authorLabel = resolveMemberDisplayLabel({
    displayName: author?.displayName ?? null,
    memberUserId: recipe.createdBy,
    actorUserId: sessionUser?.id ?? '',
    youLabel: tMembers('you'),
    neutralLabel: tMembers('neutralName'),
  });
  const updatedText = t('list.updated', {
    date: recipeUpdatedLabel(recipe.updatedAt, new Date(), {
      relative: (updated, at) => format.relativeTime(updated, at),
      date: (date) => format.dateTime(date, { dateStyle: 'medium' }),
    }),
  });
  const attribution = `${t('detail.addedBy', { name: authorLabel })} · ${updatedText}`;

  const hasPhoto =
    pickRecipeCoverAssetId(
      recipe.assets.map((asset) => ({
        id: asset.id,
        assetKind: asset.assetKind,
        processingStatus: asset.processingStatus,
        detectedMimeType: asset.detectedMimeType,
        createdAt: asset.createdAt,
      })),
    ) !== null;
  // `?added=1` only decides whether to show a hint. Who may upload is decided by `showEdit` and RLS.
  const addPhotos =
    query.added === '1' && showEdit && !hasPhoto
      ? {
          title: t('detail.addPhotos.title'),
          body: t('detail.addPhotos.body'),
          action: t('detail.addPhotos.action'),
          href: '#add-photos',
        }
      : undefined;

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
        details={details}
        attribution={attribution}
        addPhotos={addPhotos}
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
        <div id="add-photos" className="scroll-mt-24 space-y-4 border-t border-border pt-8">
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
